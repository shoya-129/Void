import { spawn, type ChildProcess } from 'child_process';
import http from 'http';

const NORMAL_URL = 'http://127.0.0.1:3001';
const VOID_URL = 'http://127.0.0.1:3002';

let normalProcess: ChildProcess | null = null;
let voidProcess: ChildProcess | null = null;

// Helper to poll endpoint until it returns 200 OK
async function waitForServer(url: string, timeoutMs: number = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const parsed = new URL(`${url}/health`);
        const req = http.get({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          agent: false
        }, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error('Status: ' + res.statusCode));
          }
        });
        req.on('error', reject);
        req.end();
      });
      return true;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return false;
}

// Helper to make a JSON GET request and return the JSON parsed response & duration
async function request(url: string): Promise<{ result: any; duration: number }> {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.get({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      agent: false
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = performance.now() - start;
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`Server error (${res.statusCode}): ${json.error || data}`));
          } else {
            resolve({ result: json.result, duration });
          }
        } catch (e) {
          reject(new Error(`Malformed JSON response from ${url}: ${data}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

// Clean up processes on termination
function cleanup() {
  console.log('\nCleaning up spawned servers...');
  if (normalProcess) {
    normalProcess.kill('SIGTERM');
    console.log('Killed Normal Node.js Server.');
  }
  if (voidProcess) {
    voidProcess.kill('SIGTERM');
    console.log('Killed Void WASM Server.');
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Benchmark error:', err);
  cleanup();
  process.exit(1);
});

interface BenchResult {
  min: number;
  max: number;
  avg: number;
  total: number;
}

async function runSequentialBench(
  name: string,
  endpoint: string,
  iterations: number
): Promise<{ normal: BenchResult; void: BenchResult; valueMatches: boolean }> {
  console.log(`\n--- Running Sequential Benchmark for ${name} (${iterations} iterations) ---`);
  
  const normalTimes: number[] = [];
  const voidTimes: number[] = [];
  let normalVal: any = null;
  let voidVal: any = null;

  // Normal Server
  for (let i = 0; i < iterations; i++) {
    const { result, duration } = await request(`${NORMAL_URL}${endpoint}`);
    normalTimes.push(duration);
    normalVal = result;
  }

  // Void Server
  for (let i = 0; i < iterations; i++) {
    const { result, duration } = await request(`${VOID_URL}${endpoint}`);
    voidTimes.push(duration);
    voidVal = result;
  }

  const normalRes: BenchResult = {
    min: Math.min(...normalTimes),
    max: Math.max(...normalTimes),
    avg: normalTimes.reduce((a, b) => a + b, 0) / iterations,
    total: normalTimes.reduce((a, b) => a + b, 0),
  };

  const voidRes: BenchResult = {
    min: Math.min(...voidTimes),
    max: Math.max(...voidTimes),
    avg: voidTimes.reduce((a, b) => a + b, 0) / iterations,
    total: voidTimes.reduce((a, b) => a + b, 0),
  };

  const valueMatches = JSON.stringify(normalVal) === JSON.stringify(voidVal);
  if (valueMatches) {
    console.log(`✓ Results match: Normal = ${normalVal}, Void = ${voidVal}`);
  } else {
    console.error(`✗ Results MISMATCH! Normal = ${normalVal}, Void = ${voidVal}`);
  }

  return { normal: normalRes, void: voidRes, valueMatches };
}

async function runConcurrentBench(
  name: string,
  endpoint: string,
  concurrency: number
): Promise<{ normalTotal: number; voidTotal: number }> {
  console.log(`\n--- Running Concurrent Benchmark for ${name} (${concurrency} concurrent requests) ---`);
  
  // Normal Server
  const normalStart = performance.now();
  const normalPromises = Array.from({ length: concurrency }, () => request(`${NORMAL_URL}${endpoint}`));
  await Promise.all(normalPromises);
  const normalTotal = performance.now() - normalStart;

  // Void Server
  const voidStart = performance.now();
  const voidPromises = Array.from({ length: concurrency }, () => request(`${VOID_URL}${endpoint}`));
  await Promise.all(voidPromises);
  const voidTotal = performance.now() - voidStart;

  return { normalTotal, voidTotal };
}

async function main() {
  console.log('==================================================');
  console.log('      VOID WASM VS NORMAL NODEJS BENCHMARK');
  console.log('==================================================');

  // Start normal server
  console.log('Starting Normal Node.js Server on port 3001...');
  normalProcess = spawn('npx', ['tsx', 'src/app.ts'], { shell: true, stdio: 'inherit' });

  // Start void server
  console.log('Starting Void WASM Server on port 3002...');
  voidProcess = spawn('npx', ['tsx', 'src/server-void.ts'], { shell: true, stdio: 'inherit' });

  console.log('Waiting for servers to become healthy...');
  const normalHealthy = await waitForServer(NORMAL_URL);
  const voidHealthy = await waitForServer(VOID_URL);

  if (!normalHealthy || !voidHealthy) {
    throw new Error('Failed to start servers. Check ports 3001 and 3002.');
  }
  console.log('✓ Both servers online!');

  // Warmup
  console.log('\nWarming up servers...');
  await request(`${NORMAL_URL}/primes?limit=1000`);
  await request(`${VOID_URL}/primes?limit=1000`);
  await request(`${NORMAL_URL}/hash_chain?input=warmup&iterations=100`);
  await request(`${VOID_URL}/hash_chain?input=warmup&iterations=100`);
  await request(`${NORMAL_URL}/nbody?n=10&steps=50`);
  await request(`${VOID_URL}/nbody?n=10&steps=50`);
  console.log('✓ Warmup complete.');

  // 1. SHA-256 Hash Chain Test (Industry Cryptography)
  const hashIterations = 50000;
  const hashSeq = await runSequentialBench(`SHA-256 Hash Chain (${hashIterations} iterations)`, `/hash_chain?input=benchmark_input_data&iterations=${hashIterations}`, 3);
  const hashConc = await runConcurrentBench(`SHA-256 Hash Chain (${hashIterations} iterations)`, `/hash_chain?input=benchmark_input_data&iterations=${hashIterations}`, 2);

  // 2. Primes Test (Standard Math / Loops)
  const primesLimit = 1000000;
  const primesSeq = await runSequentialBench(`CountPrimes(${primesLimit})`, `/primes?limit=${primesLimit}`, 3);
  const primesConc = await runConcurrentBench(`CountPrimes(${primesLimit})`, `/primes?limit=${primesLimit}`, 2);

  // 3. N-Body Physics Simulation (Numeric Simulation / Float Ops)
  const nbodyN = 150;
  const nbodySteps = 1000;
  const nbodySeq = await runSequentialBench(`N-Body Simulation (${nbodyN} bodies, ${nbodySteps} steps)`, `/nbody?n=${nbodyN}&steps=${nbodySteps}`, 3);
  const nbodyConc = await runConcurrentBench(`N-Body Simulation (${nbodyN} bodies, ${nbodySteps} steps)`, `/nbody?n=${nbodyN}&steps=${nbodySteps}`, 2);

  // Results output
  const resultsTable = [
    {
      "Benchmark Scenario": "SHA-256 Hashing Chain (50k iter)",
      "Normal JS Avg": `${hashSeq.normal.avg.toFixed(2)} ms`,
      "Void WASM Avg": `${hashSeq.void.avg.toFixed(2)} ms`,
      "Seq Speedup": `${(hashSeq.normal.avg / hashSeq.void.avg).toFixed(2)}x`,
      "Normal Conc (2 reqs)": `${hashConc.normalTotal.toFixed(2)} ms`,
      "Void Conc (2 reqs)": `${hashConc.voidTotal.toFixed(2)} ms`,
      "Conc Speedup": `${(hashConc.normalTotal / hashConc.voidTotal).toFixed(2)}x`
    },
    {
      "Benchmark Scenario": `Prime Counting (Limit = ${primesLimit})`,
      "Normal JS Avg": `${primesSeq.normal.avg.toFixed(2)} ms`,
      "Void WASM Avg": `${primesSeq.void.avg.toFixed(2)} ms`,
      "Seq Speedup": `${(primesSeq.normal.avg / primesSeq.void.avg).toFixed(2)}x`,
      "Normal Conc (2 reqs)": `${primesConc.normalTotal.toFixed(2)} ms`,
      "Void Conc (2 reqs)": `${primesConc.voidTotal.toFixed(2)} ms`,
      "Conc Speedup": `${(primesConc.normalTotal / primesConc.voidTotal).toFixed(2)}x`
    },
    {
      "Benchmark Scenario": `N-Body Orbit (${nbodyN} bodies, ${nbodySteps} steps)`,
      "Normal JS Avg": `${nbodySeq.normal.avg.toFixed(2)} ms`,
      "Void WASM Avg": `${nbodySeq.void.avg.toFixed(2)} ms`,
      "Seq Speedup": `${(nbodySeq.normal.avg / nbodySeq.void.avg).toFixed(2)}x`,
      "Normal Conc (2 reqs)": `${nbodyConc.normalTotal.toFixed(2)} ms`,
      "Void Conc (2 reqs)": `${nbodyConc.voidTotal.toFixed(2)} ms`,
      "Conc Speedup": `${(nbodyConc.normalTotal / nbodyConc.voidTotal).toFixed(2)}x`
    }
  ];

  console.log('\n========================================================================================================');
  console.log('                                         BENCHMARK RESULTS');
  console.log('========================================================================================================\n');
  console.table(resultsTable);
  console.log('\n========================================================================================================');

  cleanup();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error running benchmark:', err);
  cleanup();
  process.exit(1);
});
