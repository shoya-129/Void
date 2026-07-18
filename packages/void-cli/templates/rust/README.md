# Void Rust Plugin Template

A template for building WebAssembly (WASM) plugins for the **Void** framework using Rust.

## 🚀 Getting Started

### 1. Where to Start
Write your plugin logic inside [src/lib.rs](file:///src/lib.rs). Functions must be annotated with the Void SDK macro and registered:
Refer to the Void Rust SDK documentation for macro registry instructions.

### 2. Build the Plugin
Compile your plugin by running the build command in this directory:
```bash
npx void build
```
This compiles the Rust source code into a WebAssembly binary (`.wasm`) using `cargo build --target wasm32-unknown-unknown --release` and packages it under the build directory configured in `void.json`.

### 3. Test/Install Locally
To test the built plugin in a local Void application:
1. Initialize your application project: `npx void init`
2. Add your compiled local plugin build output folder path:
   ```bash
   npx void add ./path/to/plugin/@void/<plugin-name>
   ```

### 4. Publish
To build and publish the plugin to the npm registry:
```bash
npx void publish
```

---

## ⚙️ Configuration (`void.json`)

Your plugin configuration is defined in `void.json`. Here are the available fields:

- **`name`**: The package name of your plugin (e.g. `@void/my-plugin`).
- **`version`**: The current semantic version of the plugin.
- **`type`**: The compilation target language. Set to `"rust"`.
- **`buildDir`**: The target directory where compilation and wrapping assets are generated (e.g. `@void/my-plugin`).
- **`types`**: Path to the TypeScript declaration file (e.g. `"types.d.ts"`). During the build process, the CLI validates its existence, copies it to the build output, and automatically sets the `"types"` entry in `package.json` for autocomplete and editor support.
- **`export`**: The name of the JavaScript variable used to load the WASM binary, which is also the default export name (e.g. `"myPlugin"`).
- **`files`**: An array of glob patterns of non-source files (such as `*.md` or `*.d.ts`) to copy from the plugin root into the build output folder.
