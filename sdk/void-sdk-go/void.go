package void

import (
	"encoding/json"
	"fmt"
	"unsafe"
)

// A map to pin allocated byte slices in memory so the Go GC does not reclaim/move them
var heap = make(map[uintptr][]byte)

//go:wasmexport void_malloc
func void_malloc(size uint32) uint32 {
	if size == 0 {
		return 0
	}
	buf := make([]byte, size)
	ptr := uintptr(unsafe.Pointer(&buf[0]))
	heap[ptr] = buf
	return uint32(ptr)
}

//go:wasmexport void_free
func void_free(ptr uint32, size uint32) {
	delete(heap, uintptr(ptr))
}

//go:wasmexport void_free_string
func void_free_string(ptr uint32) {
	delete(heap, uintptr(ptr))
}

type Response struct {
	Ok    bool            `json:"ok"`
	Value json.RawMessage `json:"value,omitempty"`
	Error string          `json:"error,omitempty"`
}

func toCString(v any) uint32 {
	bytes, _ := json.Marshal(v)
	length := len(bytes)

	cBytes := make([]byte, length+1)
	copy(cBytes, bytes)
	cBytes[length] = 0

	ptr := uintptr(unsafe.Pointer(&cBytes[0]))
	heap[ptr] = cBytes // Pin it
	return uint32(ptr)
}

func readInput(ptr uint32) (map[string]json.RawMessage, error) {
	if ptr == 0 {
		return nil, fmt.Errorf("null input")
	}
	var bytes []byte
	curr := ptr
	for {
		b := *(*byte)(unsafe.Pointer(uintptr(curr)))
		if b == 0 {
			break
		}
		bytes = append(bytes, b)
		curr++
	}

	var data map[string]json.RawMessage
	err := json.Unmarshal(bytes, &data)
	return data, err
}

var registry = map[string]func(map[string]json.RawMessage) (any, error){}

// Register stores a function in the global registry.
func Register(name string, fn func(map[string]json.RawMessage) (any, error)) {
	registry[name] = fn
}

//go:wasmexport void_invoke
func void_invoke(inputPtr uint32) uint32 {
	payload, err := readInput(inputPtr)
	if err != nil {
		return toCString(Response{Ok: false, Error: err.Error()})
	}

	var fnName string
	if err := json.Unmarshal(payload["fn"], &fnName); err != nil || fnName == "" {
		return toCString(Response{Ok: false, Error: "invalid or missing fn"})
	}

	if fnName == "__list_functions__" {
		var keys []string
		for k := range registry {
			keys = append(keys, k)
		}
		valBytes, _ := json.Marshal(keys)
		return toCString(Response{Ok: true, Value: valBytes})
	}

	var data map[string]json.RawMessage
	if rawData, exists := payload["data"]; exists {
		_ = json.Unmarshal(rawData, &data)
	}

	fn, found := registry[fnName]
	if !found {
		return toCString(Response{Ok: false, Error: fmt.Sprintf("function '%s' not found", fnName)})
	}

	result, err := fn(data)
	if err != nil {
		return toCString(Response{Ok: false, Error: err.Error()})
	}

	valBytes, _ := json.Marshal(result)
	return toCString(Response{Ok: true, Value: valBytes})
}

// GetString extracts a string value from the arguments map.
func GetString(m map[string]json.RawMessage, key string) (string, error) {
	v, ok := m[key]
	if !ok {
		return "", fmt.Errorf("missing required field '%s'", key)
	}
	var s string
	if err := json.Unmarshal(v, &s); err != nil {
		return "", fmt.Errorf("invalid type for field '%s', expected string", key)
	}
	return s, nil
}

// GetBool extracts a boolean value from the arguments map.
func GetBool(m map[string]json.RawMessage, key string, def bool) bool {
	v, ok := m[key]
	if !ok {
		return def
	}
	var b bool
	if err := json.Unmarshal(v, &b); err != nil {
		return def
	}
	return b
}

// GetInt extracts a 64-bit integer value from the arguments map.
func GetInt(m map[string]json.RawMessage, key string) (int, error) {
	v, ok := m[key]
	if !ok {
		return 0, fmt.Errorf("missing required field '%s'", key)
	}
	var val float64
	if err := json.Unmarshal(v, &val); err != nil {
		return 0, fmt.Errorf("invalid type for field '%s', expected integer", key)
	}
	return int(val), nil
}

// GetFloat extracts a 64-bit float value from the arguments map.
func GetFloat(m map[string]json.RawMessage, key string) (float64, error) {
	v, ok := m[key]
	if !ok {
		return 0, fmt.Errorf("missing required field '%s'", key)
	}
	var val float64
	if err := json.Unmarshal(v, &val); err != nil {
		return 0, fmt.Errorf("invalid type for field '%s', expected float", key)
	}
	return val, nil
}

// GetArray extracts an array of raw JSON elements from the arguments map.
func GetArray(m map[string]json.RawMessage, key string) ([]json.RawMessage, error) {
	v, ok := m[key]
	if !ok {
		return nil, fmt.Errorf("missing required field '%s'", key)
	}
	var arr []json.RawMessage
	if err := json.Unmarshal(v, &arr); err != nil {
		return nil, fmt.Errorf("invalid type for field '%s', expected array", key)
	}
	return arr, nil
}

// GetObject extracts a map of raw JSON elements from the arguments map.
func GetObject(m map[string]json.RawMessage, key string) (map[string]json.RawMessage, error) {
	v, ok := m[key]
	if !ok {
		return nil, fmt.Errorf("missing required field '%s'", key)
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(v, &obj); err != nil {
		return nil, fmt.Errorf("invalid type for field '%s', expected object", key)
	}
	return obj, nil
}

// GetRaw extracts the raw json.RawMessage from the arguments map.
func GetRaw(m map[string]json.RawMessage, key string) (json.RawMessage, error) {
	v, ok := m[key]
	if !ok {
		return nil, fmt.Errorf("missing required field '%s'", key)
	}
	return v, nil
}

// GetNull verifies that the field in the arguments map is a JSON null type.
func GetNull(m map[string]json.RawMessage, key string) error {
	v, ok := m[key]
	if !ok {
		return fmt.Errorf("missing required field '%s'", key)
	}
	if string(v) != "null" {
		return fmt.Errorf("invalid type for field '%s', expected null", key)
	}
	return nil
}
