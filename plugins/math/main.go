package main

import (
	"encoding/json"
	"fmt"
	"github.com/shoya-129/Void/sdk/void-sdk-go"
)

// Add implements addition on float numbers a and b.
func Add(args map[string]json.RawMessage) (any, error) {
	if val, ok := args["numbers"]; ok {
		var numbers []float64
		if err := json.Unmarshal(val, &numbers); err != nil {
			return nil, fmt.Errorf("invalid parameter 'numbers', expected an array of numbers")
		}
		if len(numbers) > 20 {
			return nil, fmt.Errorf("maximum of 20 numbers allowed")
		}
		if len(numbers) == 0 {
			return nil, fmt.Errorf("at least one number is required")
		}
		var sum float64
		for _, num := range numbers {
			sum += num
		}
		return sum, nil
	}

	var a, b float64

	if val, ok := args["a"]; ok {
		_ = json.Unmarshal(val, &a)
	} else {
		return nil, fmt.Errorf("missing parameter 'a' or 'numbers'")
	}

	if val, ok := args["b"]; ok {
		_ = json.Unmarshal(val, &b)
	} else {
		return nil, fmt.Errorf("missing parameter 'b'")
	}

	return a + b, nil
}


// FormatMessage formats a template string with the given float value.
func FormatMessage(args map[string]json.RawMessage) (any, error) {
	template, err := void.GetString(args, "template")
	if err != nil {
		return nil, err
	}

	var value float64
	if val, ok := args["value"]; ok {
		_ = json.Unmarshal(val, &value)
	} else {
		return nil, fmt.Errorf("missing parameter 'value'")
	}

	return fmt.Sprintf(template, value), nil
}

func main() {
	void.Register("add", Add)
	void.Register("format_message", FormatMessage)
}
