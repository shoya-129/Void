# Void Rust SDK (`void-sdk-rust`)

The official Rust SDK for building high-performance WebAssembly plugins on top of the **Void** framework.

## Installation

Add this dependency to your plugin's `Cargo.toml`:

```toml
[dependencies]
void-sdk-rust = "1.0.0"
```

## Quick Start

Create a CDYLIB library and use the `void_plugin!` macro to register functions:

```rust
use std::collections::HashMap;
use void_sdk_rust::{register, void_plugin, get_string, Value};

fn hello(args: HashMap<String, Value>) -> Result<Value, String> {
    let name = get_string(&args, "name").unwrap_or_else(|_| "World".to_string());
    Ok(Value::String(format!("Hello, {}!", name)))
}

fn setup() {
    register("hello", hello);
}

void_plugin!(setup);
```

## Input Extraction API

The SDK provides helper functions to safely extract typed JSON values from incoming parameters:

- `get_string(&args, "key") -> Result<String, String>`
- `get_bool(&args, "key", default_val) -> bool`
- `get_int(&args, "key") -> Result<i64, String>`
- `get_float(&args, "key") -> Result<f64, String>`
- `get_array(&args, "key") -> Result<Vec<Value>, String>`
- `get_object(&args, "key") -> Result<Map<String, Value>, String>`
- `get_value(&args, "key") -> Result<Value, String>`
- `get_null(&args, "key") -> Result<(), String>`

## License

ISC License. See `LICENSE` for details.
