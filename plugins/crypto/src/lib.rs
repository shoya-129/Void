use std::collections::HashMap;
use void_sdk_rust::{register, void_plugin, get_string, get_int, Value};
use sha2::{Sha256, Digest};

fn hash_chain(args: HashMap<String, Value>) -> Result<Value, String> {
    let input = get_string(&args, "input")?;
    let iterations = get_int(&args, "iterations")? as usize;

    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let mut h = hasher.finalize();
    let mut h_str = hex::encode(h);

    for _ in 0..iterations {
        let mut hasher = Sha256::new();
        hasher.update(h_str.as_bytes());
        h = hasher.finalize();
        h_str = hex::encode(h);
    }

    Ok(Value::String(h_str))
}

fn setup() {
    register("hash_chain", hash_chain);
}

void_plugin!(setup);
