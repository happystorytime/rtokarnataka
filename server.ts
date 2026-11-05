import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db.js';
import { apiRouter } from './server/routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite database schema, indexes, and tables
  initializeDatabase();

  // Basic security and parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger for API calls (without logging sensitive passwords/tokens)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.originalUrl.startsWith('/api') && req.originalUrl !== '/api/health') {
        const duration = Date.now() - start;
        console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Catch unmatched API routes and return structured JSON (prevent Vite SPA HTML fallthrough)
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found.` });
  });

  // In development, hook Vite middleware; in production, serve built dist files
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Karnataka RTO Document Management System running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
