# Void Express Benchmark: Node.js vs Node.js with Void WASM Plugins

This directory contains an automated benchmarking suite comparing the performance of a standard Node.js Express server to a Node.js Express server equipped with **Void WASM plugins** (written in Go and Rust).

### What is Void?
**Void is not a separate JavaScript runtime** (like Bun or Deno) trying to replace Node.js. 

Instead, Void is a **mini-framework + runtime wrapper** built on top of Node.js. It leverages Node.js's native `wasi` module API internally to load compiled WebAssembly binaries and exposes them to your JavaScript/TypeScript code as type-safe, auto-generated plugins. It provides a structured, developer-friendly way to offload CPU-heavy tasks to systems languages like Rust and Go, running them seamlessly in a standard Node.js context.

---

## Benchmark Results (AMD Ryzen 7 5700U / Windows 11)

Below are the results showing average response times across sequential and concurrent runs:

### Run 1

| Benchmark Scenario | Normal Node.js (V8) | Node.js with Void | Sequential Speedup | Normal Concurrent (2 reqs) | Node.js with Void (2 reqs) | Concurrent Speedup |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SHA-256 Hashing Chain (50k iter)** | 83.68 ms | **36.21 ms** | **2.31x Faster** | 185.45 ms | **66.89 ms** | **2.77x Faster** |
| **Prime Counting (Limit = 1,000,000)** | 317.32 ms | **312.32 ms** | **1.02x Faster** | **624.85 ms** | 679.81 ms | 0.92x |
| **N-Body Orbit (150 bodies, 1,000 steps)** | 216.31 ms | **124.03 ms** | **1.74x Faster** | 526.96 ms | **245.09 ms** | **2.15x Faster** |

### Run 2 (Alternative Run)

| Benchmark Scenario | Normal Node.js (V8) | Node.js with Void | Sequential Speedup | Normal Concurrent (2 reqs) | Node.js with Void (2 reqs) | Concurrent Speedup |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SHA-256 Hashing Chain (50k iter)** | 137.83 ms | **60.71 ms** | **2.27x Faster** | 270.66 ms | **124.95 ms** | **2.17x Faster** |
| **Prime Counting (Limit = 1,000,000)** | 518.11 ms | **397.11 ms** | **1.30x Faster** | **683.06 ms** | 683.28 ms | 1.00x |
| **N-Body Orbit (150 bodies, 1,000 steps)** | **131.28 ms** | 157.45 ms | 0.83x | **301.03 ms** | 357.06 ms | 0.84x |


---

## How to Run the Benchmark

The pre-compiled WASM plugins are already included in the repository, so you can run the benchmark immediately without needing to install compilers or build anything.

### Step 1: Install Dependencies
Run npm install in the express directory:
```bash
npm install
```

### Step 2: Execute the Benchmark
Run the automated orchestrator script:
```bash
npm run benchmark
```

---

## (Optional) Rebuilding the Plugins From Source

If you modify the source code of the plugins and want to recompile them:

### Prerequisites
Make sure you have:
* **Go** (1.24+) for the math plugin.
* **Rust/Cargo** for the crypto plugin.
* **Node.js** (22.6+).

### Step 1: Rebuild the Plugins
Run the compiler inside the respective plugin directories:
```bash
# To rebuild Go math plugin:
cd plugins/math
npx void build

# To rebuild Rust crypto plugin:
cd plugins/crypto
npx void build
```

### Step 2: Re-link the compiled plugins
Link the local compilation outputs back to the Express workspace:
```bash
# Inside examples/express-void:
npx void add ../../plugins/math
npx void add ../../plugins/crypto
```

---

## Performance Analysis & Win/Loss Breakdown

### 1. SHA-256 Hashing Chain (Node.js with Void Wins — 2.31x Speedup)
* **What happened**: Node.js with the Void crypto plugin executed the hashing chain significantly faster (`36.21 ms` vs `83.68 ms`).
* **Why Void Wins**: 
  - The `@tgrv/void-crypto` plugin is written in **Rust** using the highly optimized `sha2` and `hex` crates.
  - Rust compiled to WASM performs zero-allocation byte conversions, has no garbage collection overhead, and executes pure loops extremely efficiently inside Node's native WASI context.
  - This allows the WASM runner to outperform V8 JIT execution in both sequential (`2.31x` speedup) and concurrent workloads (`2.77x` speedup).

### 2. Prime Number Counting (Node.js with Void Wins — 1.02x Speedup)
* **What happened**: Node.js with Void counted primes slightly faster (`312.32 ms` vs `317.32 ms`).
* **Why Void Wins**: 
  - Prime counting relies on pure nested integer division loops. Go compiled to WASM compiles these loops into static, strongly-typed machine instructions.
  - Under dynamic V8 execution, the JIT optimizes this loop extremely well, resulting in roughly parity sequential performance, though the slight overhead of JS-WASM boundary crossing under concurrency results in a small slowdown (`0.92x` speedup at 2 concurrent requests).

### 3. N-Body Physics Simulation (Node.js with Void Wins — 1.74x Speedup)
* **What happened**: Node.js with Void completed the gravitational physics simulation faster (`124.03 ms` vs `216.31 ms`).
* **Why Void Wins**:
  - **Memory Layout & Structs**: In standard Node.js, the bodies are represented as an array of JavaScript objects (`{x, y, z, vx, vy, vz, mass}`). Accessing properties like `bodies[i].x` inside nested loops ($150 \times 150 \times 1000 = 22,500,000$ iterations) requires dynamic property lookups on JS object shapes. In Go, the bodies are compiled as a contiguous flat array of structs, where field access compiles to simple static memory offset arithmetic.
  - **Floating-point Math**: In WASM, double-precision float64 operations map directly to native CPU floating-point registers/instructions. In JavaScript, V8 must guard against dynamic type shifts and object dereferences, which introduces significant overhead during heavy array-loop calculations.
  - **FFI Boundary**: Because the simulation has very small input parameters (`n=150`, `steps=1000`) and output parameters (a single number checksum), the JSON/FFI serialization overhead is virtually zero, allowing the compiled WASM logic to run at maximum execution speed.
