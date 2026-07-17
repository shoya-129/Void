# Void Runtime (`@tgrv/void-runtime`)

The dynamic JavaScript/TypeScript host loader and runtime engine for executing **Void** WebAssembly plugins in Node.js and browser environments.

## Features

- **Zero-signature FFI**: Automatically queries exported functions from the WebAssembly plugins using reflection.
- **Dynamic ES Proxies**: Maps FFI calls directly to dynamically generated JavaScript methods at load time.
- **Safe JSON boundary**: Automatically handles memory allocation (`void_malloc`), pointer marshaling, and deallocation (`void_free`) on the WASM heap.

## Installation

```bash
npm install @tgrv/void-runtime
```

## Usage

```javascript
import { runtime } from "@tgrv/void-runtime";

// Load WASM plugin and execute calls dynamically
const plugin = await runtime.load("./plugin.wasm");

// Executes the registered 'add' function with JSON args
const sum = await plugin.add({ a: 40, b: 2 });
console.log("Result:", sum);
```

## License

ISC License. See `LICENSE` for details.
