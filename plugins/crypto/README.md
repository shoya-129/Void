# Void Crypto Plugin (Rust)

This is a high-performance cryptography plugin written in **Rust**, compiled to WebAssembly (WASM) using Cargo, and optimized for standard Node.js applications using the **Void** framework.

---

## Prerequisites
* **Rust** & **Cargo** (installed and available in PATH)
* **Node.js** (22.6+)
* **Void CLI** (available via `npx` or installed globally)

---

## How to Install and Use from Scratch

Follow these steps to initialize a new host application, compile the crypto plugin, link it, and run it.

### Step 1: Initialize Your Node.js Host Application
If you have an existing or new Node.js/Express project, navigate to its directory and run:
```bash
npx void init
```
This initializes standard Void configurations and automatically installs the `@voidwasm/runtime` engine in your host application.

### Step 2: Build the Crypto Plugin
Navigate to this directory (`plugins/crypto`) and run the build command:
```bash
npx void build
```
This compiles the Rust Cargo workspace source code to WebAssembly and places the final NPM-ready package structure inside the `@void/crypto` subdirectory (as configured in `void.json`).

### Step 3: Link the Plugin to Your Application
Navigate back to your Node.js application directory and run:
```bash
npx void add <path-to-this-plugin>/@void/crypto
```
*Example (if your app is in `examples/express-void`):*
```bash
npx void add ../../plugins/crypto/@void/crypto
```
This command automatically:
1. Copies/links the build output into your host app's `node_modules`.
2. Resolves type declarations for TypeScript so you get auto-complete in your editor.

### Step 4: Import and Run in Your Code
Now, you can import and call the crypto plugin functions directly inside your JavaScript/TypeScript files.

```typescript
import crypto from '@voidwasm/crypto';

// Execute a SHA-256 Hashing Chain (CPU & loop intensive)
const hashResult = crypto.hash_chain({
  input: "seed_value",
  iterations: 50000
});

console.log(`Final Hash: ${hashResult}`);
```

---

## Exported Functions
The crypto plugin registers and exports the following functions:
* `hash_chain(args: { input: string; iterations: number }): string` — Generates a sequential hash chain by repeatedly hashing a seed string (SHA-256) and hex-encoding the intermediate outputs. Executed at native machine speeds with Rust's highly-optimized byte manipulations.
