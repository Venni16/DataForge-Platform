import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import uploadRouter from './routes/upload.js';
import processRouter from './routes/process.js';
import historyRouter from './routes/history.js';
import exportRouter from './routes/export.js';
import visualizeRouter from './routes/visualize.js';
import datasetsRouter from './routes/datasets.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/upload',     uploadRouter);
app.use('/api/process',    processRouter);
app.use('/api/history',    historyRouter);
app.use('/api/export',     exportRouter);
app.use('/api/visualize',  visualizeRouter);
app.use('/api/datasets',   datasetsRouter);

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend-gateway', port: PORT });
});

// ── Error Handler ──────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 DataPrep Pro Backend running on http://localhost:${PORT}`);
  console.log(`   Data Engine  → ${process.env.DATA_ENGINE_URL || 'http://localhost:8000'}`);
  console.log(`   Storage Mode → ${process.env.SUPABASE_URL ? 'Supabase' : 'Local JSON'}\n`);
});
