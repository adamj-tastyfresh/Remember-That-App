import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/v1/health', healthRouter);

  return app;
}
