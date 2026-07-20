import fs from "fs/promises";
import fsSync from "fs";
import { WASI } from "wasi";
import path from "path";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

    // Run void_init ONCE when VoidPluginProxy is created
    if (typeof instance.exports.void_init === "function") {
      instance.exports.void_init();
    }
  }

  callInternal(funcName, data) {
    const payload = { fn: funcName, data };
    const jsonStr = JSON.stringify(payload);
    const bytes = encoder.encode(jsonStr);

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

    // Read null-terminated output C-string with zero array allocation
    const view = new Uint8Array(this.memory.buffer);
    let nullIdx = view.indexOf(0, outputPtr);
    if (nullIdx === -1) nullIdx = view.length;
    const outputBytes = view.subarray(outputPtr, nullIdx);
    const outputStr = decoder.decode(outputBytes);

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

export class LazyPluginProxy {
  constructor(wasmModule, wasmPath) {
    this.wasmModule = wasmModule;
    this.wasmPath = wasmPath;
    this.instance = null;
    this.wasi = null;
    this.hostRoot = null;
    this.proxy = null;

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        if (prop === "then" || typeof prop === "symbol" || prop === "toJSON" || prop === "toString") {
          return undefined;
        }
        return async (args = {}) => {
          return await target.invoke(prop, args);
        };
      }
    });
  }

  async invoke(funcName, args) {
    const { mappedArgs, needRecreate, hostRoot } = this.resolveAndMapPaths(args);

    if (!this.instance || needRecreate) {
      await this.initInstance(hostRoot);
    }

    return this.proxy.callInternal(funcName, mappedArgs);
  }

  resolveAndMapPaths(args) {
    const mappedArgs = { ...args };
    let requiredHostRoot = null;

    const pathKeys = [
      "path", "input", "output", "outputPath", "otherPath",
      "image", "video", "src", "dst", "audio", "mask", "texture", "file"
    ];

    function isFilePath(val) {
      if (typeof val !== "string" || val.length === 0) return false;
      if (val.startsWith("./") || val.startsWith("../") || val.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(val)) {
        return true;
      }
      try {
        if (fsSync.existsSync(val)) {
          return true;
        }
      } catch (e) {
        // ignore
      }
      return false;
    }

    // First pass: find the directory of the path arguments
    for (const key of Object.keys(args)) {
      if (pathKeys.includes(key) || isFilePath(args[key])) {
        const absHostPath = path.resolve(args[key]);
        const hostDir = path.dirname(absHostPath);
        if (!requiredHostRoot) {
          requiredHostRoot = hostDir;
        }
      }
    }

    if (!requiredHostRoot) {
      requiredHostRoot = path.resolve(".");
    }

    let needRecreate = false;
    if (!this.hostRoot || this.hostRoot !== requiredHostRoot) {
      this.hostRoot = requiredHostRoot;
      needRecreate = true;
    }

    // Second pass: map paths relative to hostRoot
    for (const key of Object.keys(args)) {
      if (pathKeys.includes(key) || isFilePath(args[key])) {
        const absHostPath = path.resolve(args[key]);
        const relativePart = path.relative(this.hostRoot, absHostPath);
        mappedArgs[key] = "/" + relativePart.replace(/\\/g, "/");
      }
    }

    return { mappedArgs, needRecreate, hostRoot: requiredHostRoot };
  }

  async initInstance(hostRoot) {
    this.hostRoot = hostRoot || this.hostRoot || path.resolve(".");
    const preopens = {
      "/": this.hostRoot
    };

    this.wasi = new WASI({
      version: "preview1",
      args: ["void-plugin"],
      env: {},
      preopens
    });

    const importObject = this.wasi.getImportObject();
    importObject.env = importObject.env || {};

    const self = this;
    importObject.env.emscripten_notify_memory_growth = (index) => { };

    // Helper to read string from WASM memory with zero allocation
    function readString(ptr) {
      if (!ptr) return "";
      const memory = self.instance.exports.memory;
      const view = new Uint8Array(memory.buffer);
      let nullIdx = view.indexOf(0, ptr);
      if (nullIdx === -1) nullIdx = view.length;
      return decoder.decode(view.subarray(ptr, nullIdx));
    }

    function resolveGuestPath(guestPath) {
      if (!guestPath) return self.hostRoot;
      let rel = guestPath;
      if (rel.startsWith("/")) rel = rel.slice(1);
      if (rel.startsWith("\\")) rel = rel.slice(1);
      return path.join(self.hostRoot, rel);
    }

    importObject.env.__syscall_faccessat = (dirfd, pathnamePtr, mode, flags) => {
      const pathname = readString(pathnamePtr);
      const hostPath = resolveGuestPath(pathname);
      try {
        fsSync.accessSync(hostPath);
        return 0;
      } catch (e) {
        return -e.errno || -2;
      }
    };

    importObject.env.__syscall_unlinkat = (dirfd, pathnamePtr, flags) => {
      const pathname = readString(pathnamePtr);
      const hostPath = resolveGuestPath(pathname);
      try {
        fsSync.unlinkSync(hostPath);
        return 0;
      } catch (e) {
        return -e.errno || -1;
      }
    };

    importObject.env.__syscall_renameat = (olddirfd, oldpathPtr, newdirfd, newpathPtr) => {
      const oldpath = readString(oldpathPtr);
      const newpath = readString(newpathPtr);
      const oldHost = resolveGuestPath(oldpath);
      const newHost = resolveGuestPath(newpath);
      try {
        fsSync.renameSync(oldHost, newHost);
        return 0;
      } catch (e) {
        return -e.errno || -1;
      }
    };

    importObject.env.__syscall_rmdir = (pathnamePtr) => {
      const pathname = readString(pathnamePtr);
      const hostPath = resolveGuestPath(pathname);
      try {
        fsSync.rmdirSync(hostPath);
        return 0;
      } catch (e) {
        return -e.errno || -1;
      }
    };

    importObject.env.__syscall_getdents64 = (fd, dirp, count) => {
      return 0; // stub
    };

    importObject.env.host_open = (pathnamePtr, flags, mode) => {
      const pathname = readString(pathnamePtr);
      const hostPath = resolveGuestPath(pathname);
      try {
        let nodeFlags = "r";
        const O_RDONLY = 0;
        const O_WRONLY = 1;
        const O_RDWR = 2;
        const O_APPEND = 1024;

        const accessMode = flags & 3;
        if (accessMode === O_RDONLY) {
          nodeFlags = "r";
        } else if (accessMode === O_WRONLY) {
          if (flags & O_APPEND) {
            nodeFlags = "a";
          } else {
            nodeFlags = "w";
          }
        } else if (accessMode === O_RDWR) {
          if (flags & O_APPEND) {
            nodeFlags = "a+";
          } else {
            nodeFlags = "r+";
          }
        }

        return fsSync.openSync(hostPath, nodeFlags);
      } catch (e) {
        return -1;
      }
    };

    importObject.env.host_close = (fd) => {
      try {
        fsSync.closeSync(fd);
        return 0;
      } catch (e) {
        return -1;
      }
    };

    importObject.env.host_read = (fd, bufPtr, count) => {
      try {
        if (!self.fdOffsetMap) self.fdOffsetMap = {};
        if (self.fdOffsetMap[fd] === undefined) self.fdOffsetMap[fd] = 0;

        const memory = self.instance.exports.memory;
        const buffer = Buffer.from(memory.buffer, bufPtr, count);
        const bytesRead = fsSync.readSync(fd, buffer, 0, count, self.fdOffsetMap[fd]);
        self.fdOffsetMap[fd] += bytesRead;
        return bytesRead;
      } catch (e) {
        return -1;
      }
    };

    importObject.env.host_write = (fd, bufPtr, count) => {
      try {
        if (!self.fdOffsetMap) self.fdOffsetMap = {};
        if (self.fdOffsetMap[fd] === undefined) self.fdOffsetMap[fd] = 0;

        const memory = self.instance.exports.memory;
        const buffer = Buffer.from(memory.buffer, bufPtr, count);
        const bytesWritten = fsSync.writeSync(fd, buffer, 0, count, self.fdOffsetMap[fd]);
        self.fdOffsetMap[fd] += bytesWritten;
        return bytesWritten;
      } catch (e) {
        return -1;
      }
    };

    importObject.env.host_lseek = (fd, offset, whence) => {
      try {
        if (!self.fdOffsetMap) self.fdOffsetMap = {};
        if (self.fdOffsetMap[fd] === undefined) self.fdOffsetMap[fd] = 0;

        const stat = fsSync.fstatSync(fd);
        const fileSize = stat.size;

        let targetOffset = self.fdOffsetMap[fd];
        if (whence === 0) {
          targetOffset = Number(offset);
        } else if (whence === 1) {
          targetOffset += Number(offset);
        } else if (whence === 2) {
          targetOffset = fileSize + Number(offset);
        }

        self.fdOffsetMap[fd] = targetOffset;
        return BigInt(targetOffset);
      } catch (e) {
        return -1n;
      }
    };

    importObject.env.host_fstat = (fd, statbufPtr) => {
      try {
        const stat = fsSync.fstatSync(fd);
        const memory = self.instance.exports.memory;
        const view = new DataView(memory.buffer);
        view.setUint32(statbufPtr + 0, Number(stat.dev), true);
        view.setUint32(statbufPtr + 4, stat.mode, true);
        view.setUint32(statbufPtr + 8, stat.nlink, true);
        view.setUint32(statbufPtr + 12, stat.uid, true);
        view.setUint32(statbufPtr + 16, stat.gid, true);
        view.setUint32(statbufPtr + 20, Number(stat.rdev), true);
        view.setBigInt64(statbufPtr + 24, BigInt(stat.size), true);
        view.setBigInt64(statbufPtr + 88, BigInt(stat.ino), true);

        return 0;
      } catch (e) {
        return -1;
      }
    };

    importObject.env.host_stat = (pathnamePtr, statbufPtr) => {
      const pathname = readString(pathnamePtr);
      const hostPath = resolveGuestPath(pathname);
      try {
        const stat = fsSync.statSync(hostPath);
        const memory = self.instance.exports.memory;
        const view = new DataView(memory.buffer);
        view.setUint32(statbufPtr + 0, Number(stat.dev), true);
        view.setUint32(statbufPtr + 4, stat.mode, true);
        view.setUint32(statbufPtr + 8, stat.nlink, true);
        view.setUint32(statbufPtr + 12, stat.uid, true);
        view.setUint32(statbufPtr + 16, stat.gid, true);
        view.setUint32(statbufPtr + 20, Number(stat.rdev), true);
        view.setBigInt64(statbufPtr + 24, BigInt(stat.size), true);
        view.setBigInt64(statbufPtr + 88, BigInt(stat.ino), true);

        return 0;
      } catch (e) {
        return -1;
      }
    };

    importObject.env.host_pread = (fd, bufPtr, count, offset) => {
      try {
        const memory = self.instance.exports.memory;
        const buffer = Buffer.from(memory.buffer, bufPtr, count);
        const bytesRead = fsSync.readSync(fd, buffer, 0, count, Number(offset));
        return bytesRead;
      } catch (e) {
        return -1;
      }
    };

    importObject.env.host_pwrite = (fd, bufPtr, count, offset) => {
      try {
        const memory = self.instance.exports.memory;
        const buffer = Buffer.from(memory.buffer, bufPtr, count);
        const bytesWritten = fsSync.writeSync(fd, buffer, 0, count, Number(offset));
        return bytesWritten;
      } catch (e) {
        return -1;
      }
    };

    importObject.env = new Proxy(importObject.env, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return (...args) => {
          throw new Error(`WASM plugin called unimplemented env import: ${String(prop)}`);
        };
      }
    });

    this.instance = await WebAssembly.instantiate(this.wasmModule, importObject);

    if (this.instance.exports._initialize) {
      this.wasi.initialize(this.instance);
    } else if (this.instance.exports._start) {
      try {
        this.wasi.start(this.instance);
      } catch (e) {
        // ignore clean exit codes
      }
    }

    // Cache VoidPluginProxy and run void_init ONCE per instance lifecycle
    this.proxy = new VoidPluginProxy(this.instance, this.wasmPath);
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
    const wasmModule = await WebAssembly.compile(wasmBuffer);

    const proxy = new LazyPluginProxy(wasmModule, wasmPath);
    this.plugins.set(cacheKey, proxy);
    return proxy;
  }
}

export const runtime = new VoidRuntime();
