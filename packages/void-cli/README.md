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
void init [path]
```
Creates standard configuration templates and installs the `@tgrv/void-runtime` engine automatically.

### 2. Create a new Rust or Go plugin project
```bash
void create [plugin-path]
```
Prompts for language configuration and instantiates starting templates with pre-configured SDK targets.

### 3. Build a plugin locally
```bash
void build [plugin-path]
```
Compiles source files (Cargo/Go) and wraps the WASM binary under a local scoped output folder configured in `void.json`. Defaults to current folder (`.`).

### 4. Publish a plugin
```bash
void publish [plugin-path]
```
Compiles and triggers `npm publish` natively from inside the scoped build directory. Defaults to current folder (`.`).

### 5. Install / Add a plugin
```bash
void add <plugin-name>
```
Downloads the plugin from the NPM registry, or links local build outputs during development, adding dependencies to `void.config.json` and `package.json`.

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
