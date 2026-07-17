package main

import (
	"encoding/json"
	"fmt"
	"github.com/shoya-129/Void/sdk/void-sdk-go"
)

// Add implements addition on float numbers a and b.
func Add(args map[string]json.RawMessage) (any, error) {
	if _, ok := args["numbers"]; ok {
		rawNumbers, err := void.GetArray(args, "numbers")
		if err != nil {
			return nil, fmt.Errorf("invalid parameter 'numbers', expected an array of numbers")
		}
		if len(rawNumbers) > 20 {
			return nil, fmt.Errorf("maximum of 20 numbers allowed")
		}
		if len(rawNumbers) == 0 {
			return nil, fmt.Errorf("at least one number is required")
		}
		var sum int
		for _, rawNum := range rawNumbers {
			var num int
			if err := json.Unmarshal(rawNum, &num); err != nil {
				return nil, fmt.Errorf("invalid parameter 'numbers', expected an array of numbers")
			}
			sum += num
		}
		return sum, nil
	}

	a, err := void.GetInt(args, "a")
	if err != nil {
		if _, ok := args["a"]; !ok {
			return nil, fmt.Errorf("missing parameter 'a' or 'numbers'")
		}
		return nil, err
	}

	b, err := void.GetInt(args, "b")
	if err != nil {
		if _, ok := args["b"]; !ok {
			return nil, fmt.Errorf("missing parameter 'b'")
		}
		return nil, err
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
