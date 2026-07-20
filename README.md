# Void — WebAssembly Plugin Framework

Void is a unified framework and runtime for building, distributing, and consuming WebAssembly (WASM) plugins in JavaScript/TypeScript ecosystems. 

Its goal is to make compiling, running, and publishing a Rust, Go, C, or C++ library feel exactly like installing a standard JavaScript package.

---

## 1. Project Directory Structure

```text
void/
├── sdk/
│   ├── void-sdk-rust/    # Rust FFI wrapper SDK
│   ├── void-sdk-go/      # Go memory-pinning SDK
│   └── void-sdk-cpp/     # C++ SDK (memory, registration, JSON mapping)
├── packages/
│   ├── cli/              # Developer command line interface
│   │       ├── templates/
│   │           ├── rust/             # Starter boilerplate for Rust plugins
│   │           ├── go/               # Starter boilerplate for Go plugins
│   │           └── cpp/              # Starter boilerplate for C++ plugins
│   └── runtime/          # Dynamic JS reflection runtime loader
├── plugins/
│   └── math/             # Example Go math plugin
└── README.md             # This documentation
```
For detailed instructions on starter boilerplates, read the [Go Plugin README](packages/cli/templates/go/README.md), [Rust Plugin README](packages/cli/templates/rust/README.md), and [C++ Plugin README](packages/cli/templates/cpp/README.md).

---

## 2. Installation & Quick Start

Ensure you have Node.js, Go (1.24+), and Rust installed.

```bash
npm install -g @voidwasm/cli
```

### Initialize an application project
```bash
# Initialize a new directory
mkdir my-void-app
cd my-void-app

# Set up Void runtime
void init
```

### Create a new plugin
```bash
# Instantiate a template
void create my-plugin
```
Refer to the starter templates' instructions to begin coding:
- [Go Plugin Developer Guide](packages/cli/templates/go/README.md)
- [Rust Plugin Developer Guide](packages/cli/templates/rust/README.md)
- [C++ Plugin Developer Guide](packages/cli/templates/cpp/README.md)

### Compile & Build the plugin
Run the build command inside the plugin folder to compile it to WebAssembly and generate package wrappers:
```bash
cd my-plugin
void build
```

### Test your plugin locally
To test your newly created plugin inside an application:

1. **Initialize a test app**:
   Create a separate folder for your test app and set up the Void runtime:
   ```bash
   mkdir test-app
   cd test-app
   void init
   ```

2. **Add your local plugin**:
   Install the plugin directly from its local path. The CLI will resolve the package name, locate the build artifacts, and physically copy the package into your local `node_modules`:
   ```bash
   void add ../my-plugin
   ```
   *(Or install by package name: `void add @voidwasm/my-plugin` if you are in the same workspace).*

3. **Write and run your test script**:
   Create an `app.js` file to import and call your plugin:
   ```javascript
   // app.js
   import myPlugin from "@voidwasm/my-plugin";

   try {
     const result = await myPlugin.hello({ name: "Void Developer" });
     console.log("Plugin output:", result);
   } catch (error) {
     console.error("Error executing plugin:", error.message);
   }
   ```
   Execute the test application:
   ```bash
   node app.js
   ```


---

## 3. Architecture

Void is built around three core concepts: a unified invocation interface, language-specific SDKs, and runtime reflection. Plugin authors write native code as usual—the SDKs and runtime handle the rest.

### 1. Unified Invocation

Every exported function is invoked through a single entrypoint, `void_invoke`.

Internally, the runtime serializes function arguments into JSON, passes them to the plugin, and deserializes the returned value. This transport layer is completely transparent to plugin authors, who continue writing normal Rust or Go functions.

### 2. Automatic Memory Management

The Rust, Go, and C++ SDKs abstract WebAssembly memory management by automatically handling:

- Heap allocation
- Pointer pinning
- Buffer ownership
- Memory deallocation

Plugin authors never need to manually manage pointers or exchange raw memory with the JavaScript host.

### 3. Runtime Reflection

Instead of requiring manually maintained signature files (such as `void.json`), each plugin exposes reflection metadata through a built-in `__list_functions__` export.

When a plugin is loaded, the Void runtime:

1. Discovers all exported functions.
2. Reads their metadata.
3. Dynamically creates JavaScript APIs using ES Proxies.

This allows plugins to be consumed without generating bindings or maintaining interface definitions manually.

---

## 4. Developer Guides & Read More

To learn more about creating, building, testing, and publishing plugins, check out the following guides:

- **Void CLI Reference:** See the [Void CLI README](packages/cli/README.md) for detailed CLI commands.
- **Go Plugins Developer Guide:** See the [Go Plugin template README](packages/cli/templates/go/README.md) for instructions on starting, building, and configuring Go plugins.
- **Rust Plugins Developer Guide:** See the [Rust Plugin template README](packages/cli/templates/rust/README.md) for instructions on starting, building, and configuring Rust plugins.
- **C++ Plugins Developer Guide:** See the [C++ Plugin template README](packages/cli/templates/cpp/README.md) for instructions on starting, building, and configuring C++ plugins.

---

## License

ISC License. See `LICENSE` for details.
