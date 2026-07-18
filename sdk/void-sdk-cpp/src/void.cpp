#include "void/void.hpp"
#include <cstring>
#include <mutex>
#include <iostream>

namespace void_sdk {

    // Registry storage
    static std::map<std::string, Handler>& get_registry() {
        static std::map<std::string, Handler> registry;
        return registry;
    }

    void register_handler(const std::string& name, Handler fn) {
        get_registry()[name] = fn;
    }

    // Helper functions for parameter extraction
    std::string get_string(const ArgsMap& m, const std::string& key) {
        auto it = m.find(key);
        if (it == m.end()) {
            throw std::runtime_error("missing required field '" + key + "'");
        }
        if (!it->second.is_string()) {
            throw std::runtime_error("invalid type for field '" + key + "', expected string");
        }
        return it->second.get<std::string>();
    }

    bool get_bool(const ArgsMap& m, const std::string& key, bool def) {
        auto it = m.find(key);
        if (it == m.end()) {
            return def;
        }
        if (!it->second.is_boolean()) {
            return def;
        }
        return it->second.get<bool>();
    }

    int64_t get_int(const ArgsMap& m, const std::string& key) {
        auto it = m.find(key);
        if (it == m.end()) {
            throw std::runtime_error("missing required field '" + key + "'");
        }
        if (!it->second.is_number()) {
            throw std::runtime_error("invalid type for field '" + key + "', expected integer");
        }
        return it->second.get<int64_t>();
    }

    double get_float(const ArgsMap& m, const std::string& key) {
        auto it = m.find(key);
        if (it == m.end()) {
            throw std::runtime_error("missing required field '" + key + "'");
        }
        if (!it->second.is_number()) {
            throw std::runtime_error("invalid type for field '" + key + "', expected float");
        }
        return it->second.get<double>();
    }

    std::vector<json> get_array(const ArgsMap& m, const std::string& key) {
        auto it = m.find(key);
        if (it == m.end()) {
            throw std::runtime_error("missing required field '" + key + "'");
        }
        if (!it->second.is_array()) {
            throw std::runtime_error("invalid type for field '" + key + "', expected array");
        }
        return it->second.get<std::vector<json>>();
    }

    ArgsMap get_object(const ArgsMap& m, const std::string& key) {
        auto it = m.find(key);
        if (it == m.end()) {
            throw std::runtime_error("missing required field '" + key + "'");
        }
        if (!it->second.is_object()) {
            throw std::runtime_error("invalid type for field '" + key + "', expected object");
        }
        return it->second.get<ArgsMap>();
    }

    json get_value(const ArgsMap& m, const std::string& key) {
        auto it = m.find(key);
        if (it == m.end()) {
            throw std::runtime_error("missing required field '" + key + "'");
        }
        return it->second;
    }

    void get_null(const ArgsMap& m, const std::string& key) {
        auto it = m.find(key);
        if (it == m.end()) {
            throw std::runtime_error("missing required field '" + key + "'");
        }
        if (!it->second.is_null()) {
            throw std::runtime_error("invalid type for field '" + key + "', expected null");
        }
    }

    // Response helper to create JSON pointer response
    static char* to_c_string_response(bool ok, const json& val_or_err, bool is_error = false) {
        json response;
        response["ok"] = ok;
        if (is_error) {
            response["error"] = val_or_err.get<std::string>();
        } else {
            response["value"] = val_or_err;
        }

        std::string s = response.dump();
        size_t len = s.length();
        char* res = static_cast<char*>(std::malloc(len + 1));
        std::memcpy(res, s.c_str(), len);
        res[len] = '\0';
        return res;
    }

} // namespace void_sdk

extern "C" {

    // Forward declaration of void_init implemented by VOID_PLUGIN macro in user code
    void void_init();

    // Ensures registration is initialized once
    static void ensure_registered() {
        static std::once_flag init_flag;
        std::call_once(init_flag, []() {
            void_init();
        });
    }

    EMSCRIPTEN_KEEPALIVE uint8_t* void_malloc(size_t size) {
        if (size == 0) return nullptr;
        return static_cast<uint8_t*>(std::malloc(size));
    }

    EMSCRIPTEN_KEEPALIVE void void_free(uint8_t* ptr, size_t size) {
        if (ptr) std::free(ptr);
    }

    EMSCRIPTEN_KEEPALIVE void void_free_string(char* ptr) {
        if (ptr) std::free(ptr);
    }

    EMSCRIPTEN_KEEPALIVE char* void_invoke(const char* input) {
        ensure_registered();

        if (!input) {
            return void_sdk::to_c_string_response(false, "null input", true);
        }

        void_sdk::json payload;
        try {
            payload = void_sdk::json::parse(input);
        } catch (const std::exception& e) {
            return void_sdk::to_c_string_response(false, std::string("invalid JSON payload: ") + e.what(), true);
        }

        if (!payload.contains("fn") || !payload["fn"].is_string()) {
            return void_sdk::to_c_string_response(false, "invalid or missing fn", true);
        }

        std::string fn_name = payload["fn"].get<std::string>();

        auto& registry = void_sdk::get_registry();

        // Support reflection listing
        if (fn_name == "__list_functions__") {
            std::vector<std::string> keys;
            for (const auto& pair : registry) {
                keys.push_back(pair.first);
            }
            return void_sdk::to_c_string_response(true, void_sdk::json(keys));
        }

        void_sdk::ArgsMap args;
        if (payload.contains("data") && payload["data"].is_object()) {
            args = payload["data"].get<void_sdk::ArgsMap>();
        }

        auto it = registry.find(fn_name);
        if (it == registry.end()) {
            return void_sdk::to_c_string_response(false, "function '" + fn_name + "' not found", true);
        }

        try {
            void_sdk::json res = it->second(args);
            return void_sdk::to_c_string_response(true, res);
        } catch (const std::exception& e) {
            return void_sdk::to_c_string_response(false, e.what(), true);
        }
    }
}
