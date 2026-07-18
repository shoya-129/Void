# Void CLI (`@tgrv/void-cli`)

The official developer command-line toolkit for initializing, building, and publishing WebAssembly plugins for the **Void** framework.

## Installation

Install globally or use on-demand via `npx`:

```bash
npm install -g @tgrv/void-cli
```

## CLI Usage

### 1. Initialize a new application project
```bash
void init [app-path]
```
Creates standard configuration templates and installs the `@tgrv/void-runtime` engine automatically. Defaults to the current folder (`.`).

### 2. Create a new Rust or Go plugin project
```bash
void create [plugin-path]
```
Prompts for language configuration and instantiates starting templates with pre-configured SDK targets. Defaults to the current folder (`.`).

### 3. Build a plugin locally
```bash
void build [plugin-path]
```
Compiles source files (Cargo/Go) and wraps the WebAssembly binary and configured assets under the build directory configured in `void.json`. Run from a plugin root folder (defaults to current folder `.`).

### 4. Publish a plugin
```bash
void publish [plugin-path]
```
Compiles the plugin and runs `npm publish` natively from inside the built directory. Run from a plugin root folder (defaults to current folder `.`).

### 5. Install / Add a plugin
```bash
void add <plugin-name-or-build-path>
```
Installs a plugin into the application:
- **Registry:** `void add <plugin-name>` downloads the plugin from the NPM registry.
- **Local Development / Testing:** `void add <build-folder-path>` (e.g. `void add ../plugins/math/@void/void-math`) copies the compiled local build output directory directly.

Adds the plugin dependency automatically to `void.config.json` and `package.json`.

### 6. Remove a plugin
```bash
void remove <plugin-name>
```
Uninstalls the package, deletes the local `node_modules` subfolder, and cleans configurations.

### 7. Inspect a plugin
```bash
void view <plugin-name>
```
Queries function metadata directly from the compiled WASM binary.

## License

ISC License. See `LICENSE` for details.
