import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ─── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: [env.CLIENT_URL, env.ADMIN_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000', 'https://bt-fantasy-games.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logger (dev only) ─────────────────────────────────
if (env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status:    'online',
      server:    'Bettitude Fantasy Arena API',
      env:       env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── API routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── 404 catch ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global error handler (must be last) ──────────────────────
app.use(errorHandler);

export default app;
