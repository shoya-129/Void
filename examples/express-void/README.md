# Express Server with Void WebAssembly Plugins

This example demonstrates how to integrate the **Void WASM Plugin Framework** with an **Express.js** web server in TypeScript. It loads the Go-compiled `@voidwasm/math` WebAssembly plugin dynamically and calls its functions inside Express endpoints.

---

## 1. How to Run This Example

### Prerequisites
Make sure you have Node.js (v22.6+ recommended for native TypeScript support) and npm installed.

### Step 1: Install Dependencies
Install all package dependencies. In this repository, the `@voidwasm/runtime` and `@voidwasm/math` packages are pre-linked/copied locally inside `node_modules`:
```bash
npm install
```

### Step 2: Start the Server
Start the server in development mode (runs TypeScript files on-the-fly using `tsx`):
```bash
npm run dev
```
Alternatively, run with native Node.js TypeScript stripping:
```bash
npm start
```

The server will start on [http://localhost:3001](http://localhost:3001).

### Step 3: Test the Endpoints

#### A. Prime Counting Endpoint (`/primes`)
Counts prime numbers up to the specified limit.
* **Request**:
  `GET http://localhost:3001/primes?limit=1000`
* **Response**:
  ```json
  {
    "result": 168
  }
  ```

#### B. SHA-256 Hashing Chain Endpoint (`/hash_chain`)
Performs a sequential cryptographic chain of SHA-256 hashes.
* **Request**:
  `GET http://localhost:3001/hash_chain?input=test&iterations=100`
* **Response**:
  ```json
  {
    "result": "72f107f9c8d5d9c222ffc322b7a9561b369cfef75a34bc45b5c7fd877b9b1e0d"
  }
  ```

#### C. N-Body Physics Simulation Endpoint (`/nbody`)
Runs an orbit simulation and returns the system position checksum.
* **Request**:
  `GET http://localhost:3001/nbody?n=150&steps=100`
* **Response**:
  ```json
  {
    "result": 9029315.08596889
  }
  ```

---

## 2. How to Create a Void Express App from Scratch

Follow these steps to build your own TypeScript Express server integrated with Void from the ground up:

### Step 1: Initialize the Project
Create a new directory, initialize it as an ESM package, and configure it:
```bash
mkdir my-void-express-app
cd my-void-express-app
npm init -y
```

Update your `package.json` to configure the application type as ECMAScript Module (`"type": "module"`):
```json
{
  "name": "my-void-express-app",
  "type": "module",
  ...
}
```

### Step 2: Install Void CLI Globally & Initialize Void
First, install the Void command line interface globally:
```bash
npm install -g @voidwasm/cli
```

Initialize Void configuration inside your project (this generates `void.config.json` and installs `@voidwasm/runtime`):
```bash
void init
```

Add your desired WebAssembly plugin (e.g. `@voidwasm/math`):
```bash
void add @voidwasm/math
```

### Step 3: Install Express and TypeScript
Install the web framework and development dependencies:
```bash
npm install express
npm install --save-dev typescript @types/express @types/node tsx
```

### Step 4: Configure TypeScript
Create a `tsconfig.json` file to configure compiler options:
```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### Step 5: Write the Express Application
Create your entry point file at `src/app.ts`:
```typescript
// src/app.ts
import express, { type Express, type Request, type Response } from 'express';
import math from '@voidwasm/math';

const app: Express = express();
app.use(express.json());

app.get('/add', (req: Request, res: Response) => {
  const a = parseFloat(req.query.a as string);
  const b = parseFloat(req.query.b as string);

  if (isNaN(a) || isNaN(b)) {
    res.status(400).json({ error: 'Parameters a and b must be numbers' });
    return;
  }

  try {
    const result = math.add({ a, b });
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Step 6: Add Run Scripts
Add start scripts to your `package.json`:
```json
"scripts": {
  "start": "node --experimental-strip-types src/app.ts",
  "dev": "npx tsx src/app.ts"
}
```

### Step 7: Run
Start your newly created server:
```bash
npm run dev
```

---

## 3. Benchmarks & Real-World Use Cases

The project includes an automated benchmark suite comparing a pure Node.js/V8 server (`src/app.ts`) to a Void WASM-enabled server (`src/server-void.ts`).

### Benchmarked APIs

1. **`/primes?limit=LIMIT`**:
   * **Algorithm**: Inlined nested loop checking and counting prime numbers up to `limit`.
   * **NodeJS**: Pure JS code compiled by the V8 JIT.
   * **Void**: Dynamically loads `plugin.wasm` and calls Go `CountPrimes` function.
2. **`/hash_chain?input=STRING&iterations=N`**:
   * **Algorithm**: Cryptographic hash chain running `N` iterations of SHA-256 (each round hex-encodes the hash and passes it to the next hash round).
   * **NodeJS**: Standard pure JS implementation of SHA-256.
   * **Void**: Delegates to Go's assembly-optimized standard `crypto/sha256` module running in WebAssembly.
3. **`/nbody?n=N&steps=STEPS`**:
   * **Algorithm**: N-body 3D physics orbit simulation running `STEPS` iterations of particle gravitational acceleration math.
   * **NodeJS**: Pure TS/JS float64 array math.
   * **Void**: Native compiled Go float64 arithmetic in WASM.

### Performance comparison

Detailed metrics are stored in [benchmark.md](benchmark.md).
Go WebAssembly is **~4.00x faster** on cryptographic hash chains because WebAssembly natively supports 32-bit unsigned integers (`i32`), skipping JavaScript's double-precision float-to-int conversion penalties on bitwise operations.

### Industrial Real-World Use Cases for Void WASM

* **Serverless / Edge Cryptography**: Implementing secure JWT parsing, hashing checks (Bcrypt/Argon2), or custom ciphers in sandboxed worker environments (like Cloudflare Workers) where native C++ addons are disabled.
* **Large Data Parsing & Transformation**: Running high-speed lexers, markdown/YAML parsers, HTML compilers, or AST transformers (e.g. SWC, esbuild) directly within Node.js without writing platform-dependent native modules.
* **Media Processing & Simulations**: Encoding/decoding files (zlib, Brotli, PNG, JPEG), physics simulations for gaming servers, image filtration convolution kernels, or mathematical CAD engines.

