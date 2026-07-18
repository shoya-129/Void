# Void C++ SDK (`void-sdk-cpp`)

A modern C++17 SDK for building WebAssembly (WASM) plugins for the **Void** framework.

## 📦 Directory Structure

- `include/void/void.hpp`: API entrypoints and type-safe JSON extraction helpers.
- `src/void.cpp`: Memory allocator, function registry, and FFI invoke router.
- `CMakeLists.txt`: Build configuration fetching modern JSON headers.

## 🚀 Quick Start Example

Define a plugin function, register it, and export it using the `VOID_PLUGIN` initialization macro:

```cpp
#include <void/void.hpp>

using json = nlohmann::json;

json greet(const std::map<std::string, json>& args) {
    std::string name = void_sdk::get_string(args, "name");
    return json{{"message", "Hello, " + name + "!"}};
}

void init_handlers() {
    void_sdk::register_handler("greet", greet);
}

VOID_PLUGIN(init_handlers);
```

## 🧠 Memory Management & Safety API

The SDK automatically tracks all dynamic memory allocations made through FFI transitions. You can monitor heap health or manually pin buffers using the following API calls:

### Inspect Memory Statistics
Check active allocation counts and total bytes currently pinned on the heap:
```cpp
void_sdk::MemoryStats stats = void_sdk::get_memory_stats();
// stats.allocated_objects (int)
// stats.total_bytes_pinned (int64_t)
```

### Manual Pinning Helpers
For manually allocating, copying, and tracking raw memory buffers outside standard plugin routing:
```cpp
// Pin a memory block and get its pointer (copied and tracked)
void* ptr = void_sdk::pin_memory(myBufferData, bufferSize);

// Unpin and release the block once finished to prevent leaks
void_sdk::unpin_memory(ptr, bufferSize);
```

## ⚙️ Compiling for WebAssembly

C++ plugins are built using the **Emscripten** compiler (`em++`). Ensure the Emscripten SDK (`emsdk`) is active:

```bash
emcmake cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```
