cmake_minimum_required(VERSION 3.14)
project({{name}} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Configure output as a WebAssembly module
set(CMAKE_EXECUTABLE_SUFFIX ".wasm")

# Exclude entry point and export functions explicitly for Emscripten
if (EMSCRIPTEN)
  set(EXPORT_FUNCTIONS "-sEXPORTED_FUNCTIONS=_void_malloc,_void_free,_void_free_string,_void_invoke,_void_init")
  set(EXPORT_METHODS "-sEXPORTED_RUNTIME_METHODS=ccall,cwrap")
  add_link_options(
    "${EXPORT_FUNCTIONS}"
    "${EXPORT_METHODS}"
    "--no-entry"
    "-sALLOW_MEMORY_GROWTH=1"
  )
endif()

# Reference Void C++ SDK
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@voidwasm/sdk-cpp" void-sdk-cpp-build)


add_executable({{name}} src/plugin.cpp)
target_link_libraries({{name}} PRIVATE void-sdk-cpp)
