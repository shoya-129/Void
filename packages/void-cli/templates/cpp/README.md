# Void C++ Plugin Template

A template for building WebAssembly (WASM) plugins for the **Void** framework using C++.

## 🚀 Getting Started

> [!IMPORTANT]
> Before building your plugin, run **`npm install`** (or `npm i`) in this root directory to download the C++ SDK dependency (`@tgrv/void-sdk-cpp`).
> 
> To enable C++ autocomplete, hovers, and syntax diagnostics in your editor, run the initialization script immediately after installing dependencies:
> ```bash
> npm run cpp-init
> ```
> 
> *Note: The `package.json` file in this root folder is only used for local development setup and resolving CMake dependencies; it is **not** the package that gets published. The final publishable package (with its own generated `package.json`) will be built inside your output directory (configured in `void.json` as `buildDir`).*


### 1. Where to Start
Write your plugin logic inside [src/plugin.cpp](src/plugin.cpp). Define handlers matching the signature:
```cpp
nlohmann::json MyHandler(const void_sdk::ArgsMap& args)
```
And register them inside `init_handlers()`:
```cpp
void init_handlers() {
    void_sdk::register_handler("hello", hello);
}
VOID_PLUGIN(init_handlers);
```

### 2. Build the Plugin
Compile your plugin by running the build command in this directory:
```bash
npx void build
```
This runs `emcmake` to configure CMake and compiles the C++ code to a WebAssembly binary.

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

- **`name`**: The package name of your plugin (e.g. `my-plugin`).
- **`version`**: The current semantic version of the plugin.
- **`type`**: The compilation target language. Set to `"cpp"`.
- **`buildDir`**: The target directory where compilation and wrapping assets are generated (e.g. `@void/my-plugin`).
- **`types`**: Path to the TypeScript declaration file (e.g. `"types.d.ts"`).
- **`export`**: The name of the JavaScript variable used to load the WASM binary, which is also the default export name (e.g. `"myPlugin"`). **Note:** Ensure you use a JS-friendly name (e.g. alphanumeric/camelCase) to ensure the generated JS code does not contain syntax errors. The CLI will automatically sanitize special characters (like `-`, `_`, or `@scope/`) into camelCase/JS-friendly format for the variable and the generated WASM binary name.
- **`files`**: An array of glob patterns of non-source files (such as `*.md` or `*.d.ts`) to copy from the plugin root into the build output folder.
