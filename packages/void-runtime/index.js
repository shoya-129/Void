import fs from "fs/promises";
import { WASI } from "wasi";

export class VoidPluginProxy {
  constructor(instance, manifestName) {
    this.instance = instance;
    this.memory = instance.exports.memory;
    this.allocFn = instance.exports.void_malloc;
    this.freeFn = instance.exports.void_free;
    this.invokeFn = instance.exports.void_invoke;
    this.freeStringFn = instance.exports.void_free_string;
    this.manifestName = manifestName;

    if (!this.memory) {
      throw new Error(`WASM plugin '${manifestName}' must export 'memory'`);
    }
    if (!this.invokeFn) {
      throw new Error(`WASM plugin '${manifestName}' must export 'void_invoke'`);
    }

    // Run void_init if exported
    if (typeof instance.exports.void_init === "function") {
      instance.exports.void_init();
    }
  }

  initMethods() {
    const listResult = this.callInternal("__list_functions__", {});
    const functions = Array.isArray(listResult) ? listResult : [];
    for (const funcName of functions) {
      this[funcName] = (data = {}) => this.callInternal(funcName, data);
    }
  }

  callInternal(funcName, data) {
    const payload = { fn: funcName, data };
    const jsonStr = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(jsonStr);

    if (!this.allocFn) {
      throw new Error(`WASM plugin must export 'void_malloc' to invoke functions`);
    }

    // Allocate memory on WASM heap (+1 for null terminator)
    const inputPtr = this.allocFn(bytes.length + 1);
    const memoryBuffer = new Uint8Array(this.memory.buffer);
    memoryBuffer.set(bytes, inputPtr);
    memoryBuffer[inputPtr + bytes.length] = 0; // write null-terminator

    // Invoke the WASM function
    const outputPtr = this.invokeFn(inputPtr);

    // Read null-terminated output C-string
    const outputBytes = [];
    let curr = outputPtr;
    const view = new Uint8Array(this.memory.buffer);
    while (true) {
      const val = view[curr];
      if (val === 0 || val === undefined) break;
      outputBytes.push(val);
      curr++;
    }

    const outputStr = new TextDecoder().decode(new Uint8Array(outputBytes));

    // Free the input parameter memory on the WASM heap
    if (this.freeFn) {
      this.freeFn(inputPtr, bytes.length + 1);
    }

    // Free the output C-string memory
    if (this.freeStringFn) {
      this.freeStringFn(outputPtr);
    } else if (this.freeFn) {
      this.freeFn(outputPtr, outputBytes.length + 1);
    }

    const response = JSON.parse(outputStr);
    if (!response.ok) {
      throw new Error(response.error || `Error invoking function ${funcName}`);
    }
    return response.value;
  }
}

export class VoidRuntime {
  constructor() {
    this.plugins = new Map();
  }

  async load(wasmPath) {
    const cacheKey = wasmPath;
    if (this.plugins.has(cacheKey)) {
      return this.plugins.get(cacheKey);
    }

    const wasmBuffer = await fs.readFile(wasmPath);

    // Compile module and check imports
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const imports = WebAssembly.Module.imports(wasmModule);
    const needsWasi = imports.some((imp) => imp.module === "wasi_snapshot_preview1");

    let importObject = {};
    let wasi = null;

    if (needsWasi) {
      wasi = new WASI({
        version: "preview1",
        args: ["void-plugin"],
        env: {},
      });
      importObject = wasi.getImportObject();
    }

    importObject.env = importObject.env || {};

    const instance = await WebAssembly.instantiate(wasmModule, importObject);

    // Handle WASI initialization if necessary
    if (wasi) {
      if (instance.exports._initialize) {
        wasi.initialize(instance);
      } else if (instance.exports._start) {
        try {
          wasi.start(instance);
        } catch (e) {
          // ignore clean exit codes
        }
      }
    }

    const proxy = new VoidPluginProxy(instance, wasmPath);
    proxy.initMethods(); // Reflect and register methods dynamically
    this.plugins.set(cacheKey, proxy);
    return proxy;
  }
}

export const runtime = new VoidRuntime();
