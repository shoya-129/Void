# Void Go SDK (`void-sdk-go`)

The official Go SDK for building high-performance WebAssembly plugins on top of the **Void** framework.

## Installation

Add this dependency to your plugin's `go.mod`:

```go
require github.com/shoya-129/Void/sdk/void-sdk-go v1.0.2
```

## Quick Start

Import the SDK and use the `Register` API to register functions:

```go
package main

import (
	"encoding/json"
	"github.com/shoya-129/Void/sdk/void-sdk-go"
)

func Add(args map[string]json.RawMessage) (any, error) {
	a, _ := void.GetInt(args, "a")
	b, _ := void.GetInt(args, "b")
	return a + b, nil
}

func main() {
	void.Register("add", Add)
}
```

## Input Extraction API

The SDK provides helper functions to safely extract typed JSON values from incoming parameters:

- `void.GetString(args, "key") (string, error)`
- `void.GetBool(args, "key", default_val) bool`
- `void.GetInt(args, "key") (int, error)`
- `void.GetFloat(args, "key") (float64, error)`
- `void.GetArray(args, "key") ([]json.RawMessage, error)`
- `void.GetObject(args, "key") (map[string]json.RawMessage, error)`
- `void.GetRaw(args, "key") (json.RawMessage, error)`
- `void.GetNull(args, "key") error`

## Memory Management & Safety API

The SDK handles FFI allocations and pins memory slices automatically to prevent Go GC cleanup. You can monitor heap allocations and manually manage custom buffers using the following:

### Check Memory Statistics
Retrieve the count of active pinned allocations and total pinned bytes to verify safety and inspect for leaks:
```go
stats := void.GetMemoryStats()
// stats.AllocatedObjects (int)
// stats.TotalBytesPinned (int64)
```

### Manual Pinning Helpers
For advanced uses requiring manual memory allocation and lifecycle pinning outside the standard invocation scope:
```go
// Pin a byte slice on the Go heap map and get its pointer
ptr := void.PinMemory(myBytes)

// Unpin it once finished to avoid memory leaks
void.UnpinMemory(ptr)
```

## Build Target

Build your plugin using the Go reactor configuration:

```bash
GOOS=wasip1 GOARCH=wasm go build -o plugin.wasm
```

## License

ISC License. See `LICENSE` for details.
