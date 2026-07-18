//! Void Rust SDK
//! 
//! This library provides helper macros and FFI boundaries to build stateful WebAssembly 
//! plugins in Rust for the Void framework runtime.

use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::OnceLock;
use std::os::raw::c_char;
use std::ffi::{CStr, CString};
use std::sync::atomic::{AtomicUsize, Ordering};

pub use serde_json::Value;

static ACTIVE_ALLOCS: AtomicUsize = AtomicUsize::new(0);
static TOTAL_ALLOCATED_BYTES: AtomicUsize = AtomicUsize::new(0);

/// Heap allocation statistics representing active FFI allocations inside the Rust SDK.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MemoryStats {
    pub allocated_objects: usize,
    pub total_bytes_pinned: u64,
}

/// Retrieves active memory statistics for checking leaks and diagnostics.
pub fn get_memory_stats() -> MemoryStats {
    MemoryStats {
        allocated_objects: ACTIVE_ALLOCS.load(Ordering::SeqCst),
        total_bytes_pinned: TOTAL_ALLOCATED_BYTES.load(Ordering::SeqCst) as u64,
    }
}

/// Manually allocates and pins raw memory layout on the heap.
/// Note: You MUST free it using unpin_memory to prevent memory leaks.
pub unsafe fn pin_memory(data: &[u8]) -> *mut u8 {
    if data.is_empty() {
        return std::ptr::null_mut();
    }
    let size = data.len();
    let layout = std::alloc::Layout::from_size_align(size, 1).unwrap();
    let ptr = std::alloc::alloc(layout);
    if !ptr.is_null() {
        std::ptr::copy_nonoverlapping(data.as_ptr(), ptr, size);
        ACTIVE_ALLOCS.fetch_add(1, Ordering::SeqCst);
        TOTAL_ALLOCATED_BYTES.fetch_add(size, Ordering::SeqCst);
    }
    ptr
}

/// Unpins and deallocates a manually pinned raw memory block.
pub unsafe fn unpin_memory(ptr: *mut u8, size: usize) {
    if !ptr.is_null() {
        let layout = std::alloc::Layout::from_size_align(size, 1).unwrap();
        std::alloc::dealloc(ptr, layout);
        ACTIVE_ALLOCS.fetch_sub(1, Ordering::SeqCst);
        TOTAL_ALLOCATED_BYTES.fetch_sub(size, Ordering::SeqCst);
    }
}

/// Registry type mapping function name to a function pointer.
/// Developers write handlers matching this signature.
pub type NativeFn = fn(HashMap<String, Value>) -> Result<Value, String>;

static REGISTRY: OnceLock<Mutex<HashMap<String, NativeFn>>> = OnceLock::new();

fn get_registry() -> &'static Mutex<HashMap<String, NativeFn>> {
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Registers a function handler under a specific name inside the dynamic FFI registry.
/// 
/// # Example
/// ```rust
/// use std::collections::HashMap;
/// use void_sdk_rust::{register, Value};
/// 
/// fn my_handler(args: HashMap<String, Value>) -> Result<Value, String> {
///     Ok(Value::String("Hello!".to_string()))
/// }
/// 
/// register("greet", my_handler);
/// ```
pub fn register(name: &str, func: NativeFn) {
    if let Ok(mut reg) = get_registry().lock() {
        reg.insert(name.to_string(), func);
    }
}

/// Allocates memory block on the WebAssembly heap.
/// This is called internally by the Javascript Host to pass inputs.
#[no_mangle]
pub unsafe extern "C" fn void_malloc(size: usize) -> *mut u8 {
    let layout = std::alloc::Layout::from_size_align(size, 1).unwrap();
    let ptr = std::alloc::alloc(layout);
    if !ptr.is_null() {
        ACTIVE_ALLOCS.fetch_add(1, Ordering::SeqCst);
        TOTAL_ALLOCATED_BYTES.fetch_add(size, Ordering::SeqCst);
    }
    ptr
}

/// Frees allocated memory blocks on the WebAssembly heap.
/// This is called internally by the Javascript Host to clean arguments.
#[no_mangle]
pub unsafe extern "C" fn void_free(ptr: *mut u8, size: usize) {
    if !ptr.is_null() {
        let layout = std::alloc::Layout::from_size_align(size, 1).unwrap();
        std::alloc::dealloc(ptr, layout);
        ACTIVE_ALLOCS.fetch_sub(1, Ordering::SeqCst);
        TOTAL_ALLOCATED_BYTES.fetch_sub(size, Ordering::SeqCst);
    }
}

extern "C" {
    /// External setup entrypoint implemented in user plugins via the `void_plugin!` macro.
    fn void_init();
}

static INIT: std::sync::Once = std::sync::Once::new();

/// Verifies that user plugin registrations are fully initialized.
pub fn ensure_registered() {
    INIT.call_once(|| unsafe {
        void_init();
    });
}

/// Core FFI entrypoint invoked by the Host.
/// Parses the JSON string input, executes the registered function, and returns the response pointer.
#[no_mangle]
pub extern "C" fn void_invoke(input: *const c_char) -> *mut c_char {
    ensure_registered();

    if input.is_null() {
        return to_c_string_err("null input");
    }

    let c_str = unsafe { CStr::from_ptr(input) };
    let str_slice = match c_str.to_str() {
        Ok(s) => s,
        Err(e) => return to_c_string_err(&format!("invalid utf-8 string: {}", e)),
    };

    let payload: serde_json::Value = match serde_json::from_str(str_slice) {
        Ok(p) => p,
        Err(e) => return to_c_string_err(&format!("invalid JSON payload: {}", e)),
    };

    let fn_name = match payload.get("fn").and_then(|v| v.as_str()) {
        Some(name) => name,
        None => return to_c_string_err("invalid or missing fn"),
    };

    // Reflect list of all registered functions
    if fn_name == "__list_functions__" {
        if let Ok(reg) = get_registry().lock() {
            let keys: Vec<String> = reg.keys().cloned().collect();
            return to_c_string_ok(&serde_json::Value::from(keys));
        } else {
            return to_c_string_err("failed to lock registry");
        }
    }

    let data = payload.get("data")
        .and_then(|v| v.as_object())
        .map(|o| {
            o.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect::<HashMap<String, serde_json::Value>>()
        })
        .unwrap_or_default();

    let reg = match get_registry().lock() {
        Ok(r) => r,
        Err(_) => return to_c_string_err("failed to lock registry"),
    };

    let func = match reg.get(fn_name) {
        Some(f) => f,
        None => return to_c_string_err(&format!("function '{}' not found", fn_name)),
    };

    match func(data) {
        Ok(val) => to_c_string_ok(&val),
        Err(e) => to_c_string_err(&e),
    }
}

/// Frees returned output strings allocated on the heap.
/// This is called by the Host loader once JSON responses are fully parsed.
#[no_mangle]
pub unsafe extern "C" fn void_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        let c_str = CString::from_raw(ptr);
        let size = c_str.as_bytes_with_nul().len();
        ACTIVE_ALLOCS.fetch_sub(1, Ordering::SeqCst);
        TOTAL_ALLOCATED_BYTES.fetch_sub(size, Ordering::SeqCst);
    }
}

fn to_c_string_ok(val: &serde_json::Value) -> *mut c_char {
    let response = serde_json::json!({
        "ok": true,
        "value": val
    });
    let s = serde_json::to_string(&response).unwrap();
    let c_str = CString::new(s).unwrap();
    let size = c_str.as_bytes_with_nul().len();
    ACTIVE_ALLOCS.fetch_add(1, Ordering::SeqCst);
    TOTAL_ALLOCATED_BYTES.fetch_add(size, Ordering::SeqCst);
    c_str.into_raw()
}

fn to_c_string_err(err_msg: &str) -> *mut c_char {
    let response = serde_json::json!({
        "ok": false,
        "error": err_msg
    });
    let s = serde_json::to_string(&response).unwrap();
    let c_str = CString::new(s).unwrap();
    let size = c_str.as_bytes_with_nul().len();
    ACTIVE_ALLOCS.fetch_add(1, Ordering::SeqCst);
    TOTAL_ALLOCATED_BYTES.fetch_add(size, Ordering::SeqCst);
    c_str.into_raw()
}

/// Extracts a string parameter value from the arguments map.
/// 
/// Returns `Err` if the key is missing or not a String.
pub fn get_string(m: &HashMap<String, Value>, key: &str) -> Result<String, String> {
    match m.get(key) {
        Some(Value::String(s)) => Ok(s.clone()),
        Some(_) => Err(format!("invalid type for field '{}', expected String", key)),
        None => Err(format!("missing required field '{}'", key)),
    }
}

/// Extracts a boolean parameter value from the arguments map.
/// 
/// Returns default if the key is missing or not a Bool.
pub fn get_bool(m: &HashMap<String, Value>, key: &str, def: bool) -> bool {
    match m.get(key) {
        Some(Value::Bool(b)) => *b,
        _ => def,
    }
}

/// Extracts a 64-bit integer parameter value from the arguments map.
/// 
/// Returns `Err` if the key is missing or not a Number.
pub fn get_int(m: &HashMap<String, Value>, key: &str) -> Result<i64, String> {
    match m.get(key) {
        Some(Value::Number(n)) => {
            if let Some(i) = n.as_i64() {
                Ok(i)
            } else if let Some(f) = n.as_f64() {
                Ok(f as i64)
            } else {
                Err(format!("invalid number format for field '{}'", key))
            }
        }
        Some(_) => Err(format!("invalid type for field '{}', expected Integer", key)),
        None => Err(format!("missing required field '{}'", key)),
    }
}

/// Extracts a 64-bit float parameter value from the arguments map.
/// 
/// Returns `Err` if the key is missing or not a Number.
pub fn get_float(m: &HashMap<String, Value>, key: &str) -> Result<f64, String> {
    match m.get(key) {
        Some(Value::Number(n)) => {
            if let Some(f) = n.as_f64() {
                Ok(f)
            } else {
                Err(format!("invalid number format for field '{}'", key))
            }
        }
        Some(_) => Err(format!("invalid type for field '{}', expected Float", key)),
        None => Err(format!("missing required field '{}'", key)),
    }
}

/// Extracts an Array parameter value from the arguments map.
/// 
/// Returns `Err` if the key is missing or not an Array.
pub fn get_array(m: &HashMap<String, Value>, key: &str) -> Result<Vec<Value>, String> {
    match m.get(key) {
        Some(Value::Array(a)) => Ok(a.clone()),
        Some(_) => Err(format!("invalid type for field '{}', expected Array", key)),
        None => Err(format!("missing required field '{}'", key)),
    }
}

/// Extracts an Object parameter value from the arguments map.
/// 
/// Returns `Err` if the key is missing or not an Object.
pub fn get_object(m: &HashMap<String, Value>, key: &str) -> Result<serde_json::Map<String, Value>, String> {
    match m.get(key) {
        Some(Value::Object(o)) => Ok(o.clone()),
        Some(_) => Err(format!("invalid type for field '{}', expected Object", key)),
        None => Err(format!("missing required field '{}'", key)),
    }
}

/// Extracts a raw JSON `Value` parameter value from the arguments map.
/// 
/// Returns `Err` if the key is missing.
pub fn get_value(m: &HashMap<String, Value>, key: &str) -> Result<Value, String> {
    match m.get(key) {
        Some(v) => Ok(v.clone()),
        None => Err(format!("missing required field '{}'", key)),
    }
}

/// Verifies that a field inside the map is a JSON `Null` type.
/// 
/// Returns `Err` if the key is missing or not Null.
pub fn get_null(m: &HashMap<String, Value>, key: &str) -> Result<(), String> {
    match m.get(key) {
        Some(Value::Null) => Ok(()),
        Some(_) => Err(format!("invalid type for field '{}', expected Null", key)),
        None => Err(format!("missing required field '{}'", key)),
    }
}

/// Exports standard WebAssembly FFI functions (`void_invoke`, `void_free_string`, etc.)
/// and invokes the user's plugin registration function on initialization.
/// 
/// # Example
/// ```rust
/// use void_sdk_rust::{register, void_plugin};
/// 
/// fn init_registrations() {
///     register("greet", greet_func);
/// }
/// 
/// void_plugin!(init_registrations);
/// ```
#[macro_export]
macro_rules! void_plugin {
    ($init_fn:ident) => {
        #[no_mangle]
        pub extern "C" fn void_init() {
            $init_fn();
        }
    };
}
