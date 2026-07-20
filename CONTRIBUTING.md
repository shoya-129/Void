# Contributing to Void

Thank you for your interest in contributing to Void! This project aims to simplify WebAssembly plugin distribution across languages.

## Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Rust**: stable toolchain with `wasm32-unknown-unknown` target:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- **Go**: 1.24+ with WebAssembly compilation targets.
- **C++ & CMake**: CMake and the Emscripten SDK (`emsdk`) if you are working on the C++ SDK or templates.

### Local Installation
Clone the repository and install workspace dependencies:
```bash
git clone https://github.com/shoya-129/void.git
cd void
npm install
```

---

## Coding Standards

### 1. Document Everything
All public functions, structures, and helper macros must be documented using standard language comments:
- **Rust**: Use `///` with example blocks.
- **Go**: Write clear, descriptive comments prefixing package exports.
- **C++**: Use Doxygen/Javadoc style comments (`/** ... */`) in header files to enable editor hovers and documentation.

### 2. Manifest Schema
Always create a `void.json` manifest file at the root of your plugins. The manifest must specify:
- `name`: Package npm identifier (e.g. `@voidwasm/my-plugin`).
- `type`: Language compiler mapping (`rust`, `go`, or `cpp`).
- `buildDir`: Directory structure where build artifacts are nested.

---

## Language-Specific Contributions

You do not need to be an expert in all languages to contribute to Void! You can focus on the language environment you are most comfortable with:

### 🦀 Rust Contributors
- **Focus Areas:** `sdk/void-sdk-rust` and `packages/cli/templates/rust`
- **Local Setup:** Run `rustup target add wasm32-unknown-unknown`.
- **Contribution Scope:** Optimize FFI bounds, implement RAII structures, improve template boilerplates, and build Rust plugins.

### 🐹 Go Contributors
- **Focus Areas:** `sdk/void-sdk-go` and `packages/cli/templates/go`
- **Local Setup:** Ensure Go 1.24+ is installed.
- **Contribution Scope:** Manage memory pinning, optimize WASM imports, update templates, and write Go benchmark plugins.

### ⚡ C++ Contributors
- **Focus Areas:** `sdk/void-sdk-cpp` and `packages/cli/templates/cpp`
- **Local Setup:** Install CMake and `emsdk`. Run `npm run cpp-init` in `sdk/void-sdk-cpp` to initialize autocompletion.
- **Contribution Scope:** Enhance JSON conversion helpers, optimize CMake link options, write example plugins, and develop C++ templates.

---

## Workflow

1. Fork the repository and create your feature branch: `git checkout -b feature/cool-idea`.
2. Commit your changes: `git commit -am 'Add some cool features'`.
3. Build and test locally using the CLI:
   ```bash
   node packages/cli/bin/void.js build plugins/math
   ```
4. Push to the branch: `git push origin feature/cool-idea`.
5. Open a Pull Request.

---

## License

By contributing to Void, you agree that your contributions will be licensed under its ISC License.
