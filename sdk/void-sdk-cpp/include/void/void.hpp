#ifndef VOID_SDK_HPP
#define VOID_SDK_HPP

#include <string>
#include <vector>
#include <map>
#include <functional>
#include <stdexcept>
#include <nlohmann/json.hpp>

#if defined(__EMSCRIPTEN__)
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

/**
 * @namespace void_sdk
 * @brief Core SDK definitions and helpers for the Void WASM plugin framework.
 */
namespace void_sdk {

    using json = nlohmann::json;

    /**
     * @brief Map alias representing key-value parameters parsed from invocation arguments.
     */
    using ArgsMap = std::map<std::string, json>;

    /**
     * @brief Signature for WebAssembly handler functions.
     * Receives invocation arguments map and returns JSON result.
     */
    using Handler = std::function<json(const ArgsMap&)>;

    /**
     * @brief Registers a function handler inside the global Void router.
     * @param name The exported name that the runtime will call.
     * @param fn The handler function callback to run.
     */
    void register_handler(const std::string& name, Handler fn);
    
    /**
     * @brief Extracts a string parameter from the arguments map.
     * Throws an exception if the key is missing or is not a string.
     */
    std::string get_string(const ArgsMap& m, const std::string& key);

    /**
     * @brief Extracts a boolean parameter from the arguments map.
     * Throws an exception if the key is missing or is not a boolean.
     */
    bool get_bool(const ArgsMap& m, const std::string& key, bool def = false);

    /**
     * @brief Extracts a 64-bit integer parameter from the arguments map.
     * Throws an exception if the key is missing or is not a number.
     */
    int64_t get_int(const ArgsMap& m, const std::string& key);

    /**
     * @brief Extracts a double-precision floating point parameter from the arguments map.
     * Throws an exception if the key is missing or is not a number.
     */
    double get_float(const ArgsMap& m, const std::string& key);

    /**
     * @brief Extracts an array parameter from the arguments map.
     * Throws an exception if the key is missing or is not an array.
     */
    std::vector<json> get_array(const ArgsMap& m, const std::string& key);

    /**
     * @brief Extracts a nested object parameter from the arguments map.
     * Throws an exception if the key is missing or is not an object.
     */
    ArgsMap get_object(const ArgsMap& m, const std::string& key);

    /**
     * @brief Extracts a raw JSON value parameter from the arguments map.
     * Throws an exception if the key is missing.
     */
    json get_value(const ArgsMap& m, const std::string& key);

    /**
     * @brief Asserts that a parameter is null in the arguments map.
     * Throws an exception if the key is missing or is not null.
     */
    void get_null(const ArgsMap& m, const std::string& key);

    /**
     * @brief Heap allocation statistics representing active allocations inside the C++ SDK.
     */
    struct MemoryStats {
        int allocated_objects;     ///< Number of active allocations pinned in memory.
        int64_t total_bytes_pinned; ///< Total bytes across all active allocations.
    };

    /**
     * @brief Retrieves active memory statistics for checking leaks and diagnostics.
     */
    MemoryStats get_memory_stats();

    /**
     * @brief Allocates and pins raw memory manually for custom FFI transfers.
     * Note: You MUST free it using unpin_memory to prevent memory leaks.
     */
    void* pin_memory(const void* data, size_t size);

    /**
     * @brief Unpins and frees a manually pinned raw memory block.
     */
    void unpin_memory(void* ptr, size_t size);

} // namespace void_sdk

/**
 * @brief Macro to bind the user's custom initialization entrypoint.
 * Automatically exports standard FFI hook `void_init` needed by the Void runtime.
 * 
 * Example:
 * @code
 * void init_handlers() {
 *     void_sdk::register_handler("greet", greet);
 * }
 * VOID_PLUGIN(init_handlers);
 * @endcode
 */
#define VOID_PLUGIN(init_fn) \
    extern "C" { \
        EMSCRIPTEN_KEEPALIVE void void_init() { \
            init_fn(); \
        } \
    }

#endif // VOID_SDK_HPP
