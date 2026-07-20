#include <void/void.hpp>

using json = nlohmann::json;

// Define a starter function handler
json hello(const void_sdk::ArgsMap& args) {
    std::string name = void_sdk::get_string(args, "name");
    return json{{"message", "Hello, " + name + " from C++!"}};
}

// Register function handlers
void init_handlers() {
    void_sdk::register_handler("hello", hello);
}

// Bind initialization entrypoint
VOID_PLUGIN(init_handlers);
