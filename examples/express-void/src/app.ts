import express, { type Express, type Request, type Response } from 'express';
import { createHash } from 'crypto';

const app: Express = express();
app.use(express.json());

// Use Node's built-in native crypto library for SHA-256 (C++ OpenSSL binding)
function sha256(ascii: string): string {
  return createHash('sha256').update(ascii).digest('hex');
}

function hashChain(input: string, iterations: number): string {
  let h = sha256(input);
  for (let i = 0; i < iterations; i++) {
    h = sha256(h);
  }
  return h;
}

interface Body {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  mass: number;
}

// Pure JS N-Body simulation
function nBodySimulation(n: number, steps: number): number {
  const bodies: Body[] = [];
  for (let i = 0; i < n; i++) {
    bodies.push({
      x: i * 1.5,
      y: i * -2.0,
      z: i * 0.8,
      vx: i * 0.01,
      vy: i * -0.02,
      vz: i * 0.005,
      mass: (i + 1.0) * 1000.0,
    });
  }

  const dt = 0.01;

  for (let step = 0; step < steps; step++) {
    for (let i = 0; i < n; i++) {
      const bi = bodies[i];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const bj = bodies[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const dz = bj.z - bi.z;

        const distanceSq = dx * dx + dy * dy + dz * dz + 1e-9;
        const distance = Math.sqrt(distanceSq);
        const mag = (dt * bj.mass) / (distanceSq * distance);

        bi.vx += dx * mag;
        bi.vy += dy * mag;
        bi.vz += dz * mag;
      }
    }

    for (let i = 0; i < n; i++) {
      const bi = bodies[i];
      bi.x += dt * bi.vx;
      bi.y += dt * bi.vy;
      bi.z += dt * bi.vz;
    }
  }

  let checksum = 0;
  for (let i = 0; i < n; i++) {
    checksum += bodies[i].x + bodies[i].y + bodies[i].z;
  }
  return checksum;
}

// Pure JS/TS prime counting implementation (inlined check)
function countPrimes(limit: number): number {
  let count = 0;
  for (let i = 2; i <= limit; i++) {
    let isPrime = true;
    for (let j = 2; j * j <= i; j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) {
      count++
    }
  }
  return count;
}

app.get('/health', (req: Request, res: Response) => {
  res.send('ok');
});

app.get('/primes', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10);
  if (isNaN(limit)) {
    res.status(400).json({ error: 'Parameter limit must be a valid integer' });
    return;
  }

  const result = countPrimes(limit);
  res.json({ result });
});

app.get('/hash_chain', (req: Request, res: Response) => {
  const input = req.query.input as string || 'default_input';
  const iterations = parseInt(req.query.iterations as string, 10);
  
  if (isNaN(iterations)) {
    res.status(400).json({ error: 'Parameter iterations must be a valid integer' });
    return;
  }

  const result = hashChain(input, iterations);
  res.json({ result });
});

app.get('/nbody', (req: Request, res: Response) => {
  const n = parseInt(req.query.n as string, 10);
  const steps = parseInt(req.query.steps as string, 10);

  if (isNaN(n) || isNaN(steps)) {
    res.status(400).json({ error: 'Parameters n and steps must be valid integers' });
    return;
  }

  const result = nBodySimulation(n, steps);
  res.json({ result });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Normal Node.js Express server running on http://localhost:${PORT}`);
});
