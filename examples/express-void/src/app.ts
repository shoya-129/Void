import express, { type Express, type Request, type Response } from 'express';
import math from '@tgrv/void-math';

const app: Express = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Void Express Server!');
});

app.get('/add', (req: Request, res: Response) => {
  const a = parseFloat(req.query.a as string);
  const b = parseFloat(req.query.b as string);

  if (isNaN(a) || isNaN(b)) {
    res.status(400).json({ error: 'Parameters a and b must be valid numbers' });
    return;
  }

  try {
    const result = math.add({ a, b });
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/format', (req: Request, res: Response) => {
  const template = req.query.template as string;
  const value = parseFloat(req.query.value as string);

  if (!template || isNaN(value)) {
    res.status(400).json({ error: 'Parameters template (string) and value (number) are required' });
    return;
  }

  try {
    const result = math.format_message({ template, value });
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});