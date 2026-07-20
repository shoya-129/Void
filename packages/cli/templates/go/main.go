package main

import (
	"encoding/json"
	"fmt"
	"github.com/shoya-129/Void/sdk/void-sdk-go"
)

func Hello(args map[string]json.RawMessage) (any, error) {
	name, err := void.GetString(args, "name")
	if err != nil {
		name = "World"
	}
	return fmt.Sprintf("Hello, %s!", name), nil
}

func main() {
	void.Register("hello", Hello)
}
