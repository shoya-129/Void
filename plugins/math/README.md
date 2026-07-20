# Void Math Plugin (Go)

This is a high-performance mathematical computation plugin written in **Go**, compiled to WebAssembly (WASM), and optimized for standard Node.js applications using the **Void** framework.

---

## Prerequisites
* **Go** (1.24+ recommended)
* **Node.js** (22.6+)
* **Void CLI** (available via `npx` or installed globally)

---

## How to Install and Use from Scratch

Follow these steps to initialize a new host application, compile the math plugin, link it, and run it.

### Step 1: Initialize Your Node.js Host Application
If you have an existing or new Node.js/Express project, navigate to its directory and run:
```bash
npx void init
```
This initializes standard Void configurations and automatically installs the `@voidwasm/runtime` engine in your host application.

### Step 2: Build the Math Plugin
Navigate to this directory (`plugins/math`) and run the build command:
```bash
npx void build
```
This compiles the Go source code (`main.go`) to WebAssembly and places the final NPM-ready package structure inside the `@void/math` subdirectory (as configured in `void.json`).

### Step 3: Link the Plugin to Your Application
Navigate back to your Node.js application directory and run:
```bash
npx void add <path-to-this-plugin>/@void/math
```
*Example (if your app is in `examples/express-void`):*
```bash
npx void add ../../plugins/math/@void/math
```
This command automatically:
1. Copies/links the build output into your host app's `node_modules`.
2. Resolves type declarations for TypeScript so you get auto-complete in your editor.

### Step 4: Import and Run in Your Code
Now, you can import and call the math plugin functions directly inside your JavaScript/TypeScript files.

```typescript
import math from '@voidwasm/math';

// 1. Basic addition (supporting multiple signatures)
const sum1 = math.add({ a: 10, b: 20 });
const sum2 = math.add({ numbers: [1, 2, 3, 4, 5] });
console.log(`Sum: ${sum1}, Array Sum: ${sum2}`);

// 2. Count primes up to a limit (CPU-intensive nested loop)
const primes = math.count_primes({ limit: 1000000 });
console.log(`Primes Count: ${primes}`);

// 3. Gravitational N-Body simulation (Floating-point intensive)
const result = math.nbody({ n: 150, steps: 1000 });
console.log(`Simulation checksum: ${result}`);
```

---

## Exported Functions
The math plugin registers and exports the following functions:
* `add(args: { a: number; b: number } | { numbers: number[] }): number` — Performs arithmetic addition.
* `format_message(args: { template: string; value: number }): string` — Formats strings within WASM.
* `count_primes(args: { limit: number }): number` — Heavy integer calculation (prime counting).
* `nbody(args: { n: number; steps: number }): number` — High-performance floating-point physics simulation.
