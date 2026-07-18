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

namespace void_sdk {

    using json = nlohmann::json;
    using ArgsMap = std::map<std::string, json>;
    using Handler = std::function<json(const ArgsMap&)>;

    // Global registry functions
    void register_handler(const std::string& name, Handler fn);
    
    // Type extraction helper functions
    std::string get_string(const ArgsMap& m, const std::string& key);
    bool get_bool(const ArgsMap& m, const std::string& key, bool def = false);
    int64_t get_int(const ArgsMap& m, const std::string& key);
    double get_float(const ArgsMap& m, const std::string& key);
    std::vector<json> get_array(const ArgsMap& m, const std::string& key);
    ArgsMap get_object(const ArgsMap& m, const std::string& key);
    json get_value(const ArgsMap& m, const std::string& key);
    void get_null(const ArgsMap& m, const std::string& key);

} // namespace void_sdk

// Initialization macro
#define VOID_PLUGIN(init_fn) \
    extern "C" { \
        EMSCRIPTEN_KEEPALIVE void void_init() { \
            init_fn(); \
        } \
    }

#endif // VOID_SDK_HPP
