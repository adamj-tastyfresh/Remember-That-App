import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { tasksRouter } from './routes/tasks';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.appOrigin }));
  app.use(express.json({ limit: '256kb' }));

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/tasks', tasksRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested API route does not exist.' } });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API error:', error instanceof Error ? error.message : 'Unknown error');
    const malformedJson = error instanceof SyntaxError;
    res.status(malformedJson ? 400 : 500).json({
      error: malformedJson
        ? { code: 'VALIDATION_ERROR', message: 'The request body is not valid JSON.' }
        : { code: 'UNEXPECTED_ERROR', message: 'An unexpected server error occurred.' },
    });
  });

  return app;
}
