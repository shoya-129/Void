import math from "@tgrv/void-math";

console.log("=== Void Application ===");

try {
  console.log("Math sum (40 + 2):", math.add({ a: 40, b: 2 }));
} catch (e) {
  console.error("Error running application:", e.message);
}
