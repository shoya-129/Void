import express, { type Express, type Request, type Response } from 'express';
import math from '@voidwasm/math';
import crypto from "@voidwasm/crypto";

const app: Express = express();
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.send('ok');
});

app.get('/hash_chain', (req: Request, res: Response) => {
  const input = req.query.input as string || 'default_input';
  const iterations = parseInt(req.query.iterations as string, 10);
  
  if (isNaN(iterations)) {
    res.status(400).json({ error: 'Parameter iterations must be a valid integer' });
    return;
  }

  try {
    const result = crypto.hash_chain({ input, iterations });
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/primes', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10);
  if (isNaN(limit)) {
    res.status(400).json({ error: 'Parameter limit must be a valid integer' });
    return;
  }

  try {
    const result = math.count_primes({ limit });
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/nbody', (req: Request, res: Response) => {
  const n = parseInt(req.query.n as string, 10);
  const steps = parseInt(req.query.steps as string, 10);

  if (isNaN(n) || isNaN(steps)) {
    res.status(400).json({ error: 'Parameters n and steps must be valid integers' });
    return;
  }

  try {
    const result = math.nbody({ n, steps });
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Void-enabled Express server running on http://localhost:${PORT}`);
});
