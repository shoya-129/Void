# Void Go Plugin Template

A template for building WebAssembly (WASM) plugins for the **Void** framework using Go.

## 🚀 Getting Started

### 1. Where to Start
Write your plugin logic inside [main.go](file:///main.go). Exported functions must match the signature:
```go
func MyFunction(args map[string]json.RawMessage) (any, error)
```
And register them in `main()` using the Void SDK:
```go
func main() {
    void.Register("my_function", MyFunction)
}
```

### 2. Build the Plugin
Compile your plugin by running the build command in this directory:
```bash
npx void build
```
This compiles the Go code into a WebAssembly binary (`.wasm`) and packages it inside the build output directory configured in `void.json`.

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
- **`type`**: The compilation target language. Set to `"go"`.
- **`buildDir`**: The target directory where compilation and wrapping assets are generated (e.g. `@void/my-plugin`).
- **`types`**: Path to the TypeScript declaration file (e.g. `"types.d.ts"`). During the build process, the CLI validates its existence, copies it to the build output, and automatically sets the `"types"` entry in `package.json` for autocomplete and editor support.
- **`export`**: The name of the JavaScript variable used to load the WASM binary, which is also the default export name (e.g. `"myPlugin"`).
- **`files`**: An array of glob patterns of non-source files (such as `*.md` or `*.d.ts`) to copy from the plugin root into the build output folder.
