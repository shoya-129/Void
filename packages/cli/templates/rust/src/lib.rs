use std::collections::HashMap;
use void_sdk_rust::{register, void_plugin, get_string, Value};

fn hello(args: HashMap<String, Value>) -> Result<Value, String> {
    let name = get_string(&args, "name").unwrap_or_else(|_| "World".to_string());
    Ok(Value::String(format!("Hello, {}!", name)))
}

fn setup() {
    register("hello", hello);
}

// Export FFI functions and call setup on init
void_plugin!(setup);
