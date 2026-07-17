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
│   └── void-runtime/     # Dynamic JS reflection runtime loader
├── plugins/
│   └── math/             # Example Go math plugin
├── templates/
│   ├── rust/             # Starter boilerplate for Rust plugins
│   └── go/               # Starter boilerplate for Go plugins
├── void.config.json      # Project config manifest
└── README.md             # This documentation
```

---

## 2. Installation & Quick Start

Ensure you have Node.js, Go (1.24+), and Rust installed.

### Initialize an application project
```bash
# Initialize a new directory
mkdir my-void-app
cd my-void-app

# Set up Void runtime
npx @tgrv/void-cli init
```

### Create a new plugin
```bash
# Instantiates a template
npx @tgrv/void-cli create ./plugins/my-plugin
```

### Compile & Build the plugin
```bash
cd ./plugins/my-plugin
npx @tgrv/void-cli build
```

### Add the plugin to your application
```bash
cd ../../my-void-app
npx @tgrv/void-cli add @void/my-plugin
```

### Execute the app
Write your entrypoint:
```javascript
// app.js
import myPlugin from "@void/my-plugin";

const result = await myPlugin.hello({ name: "Void Developer" });
console.log(result);
```
Then run it:
```bash
node app.js
```

---

## 3. Architecture details

Void V2 replaces standard signature files (`void.json` signatures) with dynamic ES Proxies and reflection:
1. **Unified JSON FFI**: Arguments are serialized to JSON strings and passed to a single entrypoint `void_invoke`.
2. **Memory Safety**: Go/Rust SDKs manage heap allocation, pointer pinning, and free mechanisms.
3. **Dynamic Reflection**: The JS host loader reads `__list_functions__` on boot to bind ES Proxy interfaces dynamically.

---

## License

ISC License. See `LICENSE` for details.
