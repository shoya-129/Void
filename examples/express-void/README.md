# Express Server with Void WebAssembly Plugins

This example demonstrates how to integrate the **Void WASM Plugin Framework** with an **Express.js** web server in TypeScript. It loads the Go-compiled `@tgrv/void-math` WebAssembly plugin dynamically and calls its functions inside Express endpoints.

---

## 1. How to Run This Example

### Prerequisites
Make sure you have Node.js (v22.6+ recommended for native TypeScript support) and npm installed.

### Step 1: Install Dependencies
Install all package dependencies. In this repository, the `@tgrv/void-runtime` and `@tgrv/void-math` packages are pre-linked/copied locally inside `node_modules`:
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

The server will start on [http://localhost:3000](http://localhost:3000).

### Step 3: Test the Endpoints

#### A. Addition Endpoint (`/add`)
Delegates the mathematical operation to the Go WebAssembly binary.
* **Request**:
  `GET http://localhost:3000/add?a=12&b=30`
* **Response**:
  ```json
  {
    "result": 42
  }
  ```

#### B. String Formatting Endpoint (`/format`)
Passes a formatting template string and a value to the WebAssembly plugin, which formats it using Go's `fmt.Sprintf`.
* **Request**:
  `GET http://localhost:3000/format?template=The+answer+is+%25g&value=42`
  *(Note: `%25g` is the URL-encoded representation of `%g`)*
* **Response**:
  ```json
  {
    "result": "The answer is 42"
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

### Step 2: Initialize Void
Use the Void CLI to configure the Void configuration and install the WebAssembly runtime:
```bash
# Initialize Void configuration (generates void.config.json & installs @tgrv/void-runtime)
npx @tgrv/void-cli init
```

Add your desired WebAssembly plugin (e.g. `@tgrv/void-math`):
```bash
npx @tgrv/void-cli add @tgrv/void-math
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
import math from '@tgrv/void-math';

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
