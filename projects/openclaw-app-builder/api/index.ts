import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes will be added here
app.get('/api/apps', (_req, res) => {
  res.json({ apps: [] });
});

// Export for Vercel serverless
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
