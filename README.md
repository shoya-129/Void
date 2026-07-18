# Void — WebAssembly Plugin Framework

Void is a unified framework and runtime for building, distributing, and consuming WebAssembly (WASM) plugins in JavaScript/TypeScript ecosystems. 

Its goal is to make compiling, running, and publishing a Rust, Go, C, or C++ library feel exactly like installing a standard JavaScript package.

---

## 1. Project Directory Structure

```text
void/
├── sdk/
│   ├── void-sdk-rust/    # Rust FFI wrapper SDK
│   └── void-sdk-go/      # Go memory-pinning SDK
├── packages/
│   ├── void-cli/         # Developer command line interface
│   │       ├── templates/
│   │           ├── rust/             # Starter boilerplate for Rust plugins
│   │           └── go/               # Starter boilerplate for Go plugins
│   └── void-runtime/     # Dynamic JS reflection runtime loader
├── plugins/
│   └── math/             # Example Go math plugin
└── README.md             # This documentation
```
For detailed instructions on starter boilerplates, read the [Go Plugin README](packages/void-cli/templates/go/README.md) and [Rust Plugin README](packages/void-cli/templates/rust/README.md).

---

## 2. Installation & Quick Start

Ensure you have Node.js, Go (1.24+), and Rust installed.

```bash
npm install -g @tgrv/void-cli
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
- [Go Plugin Developer Guide](packages/void-cli/templates/go/README.md)
- [Rust Plugin Developer Guide](packages/void-cli/templates/rust/README.md)

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
   *(Or install by package name: `void add @void/my-plugin` if you are in the same workspace).*

3. **Write and run your test script**:
   Create an `app.js` file to import and call your plugin:
   ```javascript
   // app.js
   import myPlugin from "@void/my-plugin";

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

## 3. Architecture details

Void replaces standard signature files (`void.json` signatures) with dynamic ES Proxies and reflection:
1. **Unified JSON FFI**: Arguments are serialized to JSON strings and passed to a single entrypoint `void_invoke`.
2. **Memory Safety**: Go/Rust SDKs manage heap allocation, pointer pinning, and free mechanisms.
3. **Dynamic Reflection**: The JS host loader reads `__list_functions__` on boot to bind ES Proxy interfaces dynamically.

---

## 4. Developer Guides & Read More

To learn more about creating, building, testing, and publishing plugins, check out the following guides:

- **Void CLI Reference:** See the [Void CLI README](packages/void-cli/README.md) for detailed CLI commands.
- **Go Plugins Developer Guide:** See the [Go Plugin template README](packages/void-cli/templates/go/README.md) for instructions on starting, building, and configuring Go plugins.
- **Rust Plugins Developer Guide:** See the [Rust Plugin template README](packages/void-cli/templates/rust/README.md) for instructions on starting, building, and configuring Rust plugins.

---

## License

ISC License. See `LICENSE` for details.
