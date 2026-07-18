cmake_minimum_required(VERSION 3.14)
project(void-sdk-cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Disable SSL verification for FetchContent downloads
set(CMAKE_TLS_VERIFY OFF)

# Download and load nlohmann_json
include(FetchContent)
FetchContent_Declare(
  json
  URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

# Declare SDK library
add_library(void-sdk-cpp src/void.cpp)

# Link JSON dependency and map includes
target_link_libraries(void-sdk-cpp PUBLIC nlohmann_json::nlohmann_json)
target_include_directories(void-sdk-cpp PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)
