package main

import (
	"encoding/json"
	"fmt"
	"math"
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

// isPrime checks if a number is prime.
func isPrime(n int) bool {
	if n <= 1 {
		return false
	}
	for i := 2; i*i <= n; i++ {
		if n%i == 0 {
			return false
		}
	}
	return true
}

// CountPrimes counts the number of primes up to a given limit.
func CountPrimes(args map[string]json.RawMessage) (any, error) {
	limit, err := void.GetInt(args, "limit")
	if err != nil {
		return nil, err
	}
	count := 0
	for i := 2; i <= limit; i++ {
		isPrime := true
		for j := 2; j*j <= i; j++ {
			if i%j == 0 {
				isPrime = false
				break
			}
		}
		if isPrime {
			count++
		}
	}
	return count, nil
}


type Body struct {
	x, y, z    float64
	vx, vy, vz float64
	mass       float64
}

// NBodySimulation simulates the gravitational interaction of N bodies.
func NBodySimulation(args map[string]json.RawMessage) (any, error) {
	n, err := void.GetInt(args, "n")
	if err != nil {
		return nil, err
	}
	steps, err := void.GetInt(args, "steps")
	if err != nil {
		return nil, err
	}

	bodies := make([]Body, n)
	for i := 0; i < n; i++ {
		fi := float64(i)
		bodies[i] = Body{
			x:    fi * 1.5,
			y:    fi * -2.0,
			z:    fi * 0.8,
			vx:   fi * 0.01,
			vy:   fi * -0.02,
			vz:   fi * 0.005,
			mass: (fi + 1.0) * 1000.0,
		}
	}

	const dt = 0.01

	for step := 0; step < steps; step++ {
		for i := 0; i < n; i++ {
			for j := 0; j < n; j++ {
				if i == j {
					continue
				}
				dx := bodies[j].x - bodies[i].x
				dy := bodies[j].y - bodies[i].y
				dz := bodies[j].z - bodies[i].z

				distanceSq := dx*dx + dy*dy + dz*dz + 1e-9
				distance := math.Sqrt(distanceSq)
				mag := dt * bodies[j].mass / (distanceSq * distance)

				bodies[i].vx += dx * mag
				bodies[i].vy += dy * mag
				bodies[i].vz += dz * mag
			}
		}

		for i := 0; i < n; i++ {
			bodies[i].x += dt * bodies[i].vx
			bodies[i].y += dt * bodies[i].vy
			bodies[i].z += dt * bodies[i].vz
		}
	}

	checksum := 0.0
	for i := 0; i < n; i++ {
		checksum += bodies[i].x + bodies[i].y + bodies[i].z
	}

	return checksum, nil
}

// GetMemoryStats returns memory statistics from the Void Go SDK.
func GetMemoryStats(args map[string]json.RawMessage) (any, error) {
	return void.GetMemoryStats(), nil
}

// TestMemPin manually pins a string on the Go heap map.
func TestMemPin(args map[string]json.RawMessage) (any, error) {
	data, err := void.GetString(args, "data")
	if err != nil {
		return nil, err
	}
	ptr := void.PinMemory([]byte(data))
	return map[string]any{
		"ptr":  ptr,
		"size": len(data),
	}, nil
}

// TestMemUnpin releases a previously pinned slice from the Go heap map.
func TestMemUnpin(args map[string]json.RawMessage) (any, error) {
	ptr, err := void.GetInt(args, "ptr")
	if err != nil {
		return nil, err
	}
	void.UnpinMemory(uint32(ptr))
	return "success", nil
}

func main() {
	void.Register("add", Add)
	void.Register("format_message", FormatMessage)
	void.Register("count_primes", CountPrimes)
	void.Register("nbody", NBodySimulation)
	void.Register("get_memory_stats", GetMemoryStats)
	void.Register("test_mem_pin", TestMemPin)
	void.Register("test_mem_unpin", TestMemUnpin)
}

