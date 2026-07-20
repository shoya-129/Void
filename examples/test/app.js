import math from "@voidwasm/math";

console.log("=== Void Application ===");

try {
  console.log("Legacy sum (40 + 2):", math.add({ a: 40, b: 2 }));
} catch (e) {
  console.error("Error with legacy sum:", e.message);
}

try {
  console.log("Multi-arg sum (10 + 20 + 30 + 40):", math.add({ numbers: [10, 20, 30, 40] }));
} catch (e) {
  console.error("Error with multi-arg sum:", e.message);
}

try {
  const memoryStats = math.get_memory_stats();
  console.log("Memory stats:", memoryStats);
} catch (error) {
  console.error("Error with memory stats:", error.message);
}

try {
  const testMemPin = math.test_mem_pin({ data: "hello world" });
  console.log("Memory pin:", testMemPin);
  const testMemUnpin = math.test_mem_unpin({ ptr: testMemPin.ptr });
  console.log("Memory unpin:", testMemUnpin);
} catch (error) {
  console.error("Error with memory pin or unpin:", error.message);
}

try {
  console.log("Testing 21 arguments (should fail):");
  math.add({ numbers: Array.from({ length: 21 }, (_, i) => i + 1) });
} catch (e) {
  console.log("Successfully caught expected error:", e.message);
}

