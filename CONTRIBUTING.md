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

### 2. Manifest Schema
Always create a `void.json` manifest file at the root of your plugins. The manifest must specify:
- `name`: Package npm identifier (e.g. `@void/my-plugin`).
- `type`: Language compiler mapping (`rust` or `go`).
- `buildDir`: Directory structure where build artifacts are nested.

---

## Workflow

1. Fork the repository and create your feature branch: `git checkout -b feature/cool-idea`.
2. Commit your changes: `git commit -am 'Add some cool features'`.
3. Build and test locally using the CLI:
   ```bash
   node packages/void-cli/bin/void.js build plugins/math
   ```
4. Push to the branch: `git push origin feature/cool-idea`.
5. Open a Pull Request.

---

## License

By contributing to Void, you agree that your contributions will be licensed under its ISC License.
