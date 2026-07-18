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

## ⚙️ Compiling for WebAssembly

C++ plugins are built using the **Emscripten** compiler (`em++`). Ensure the Emscripten SDK (`emsdk`) is active:

```bash
emcmake cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```
