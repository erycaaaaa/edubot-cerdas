import dotenv from 'dotenv';

dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import studentRoutes from './routes/studentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import headmasterRoutes from './routes/headmasterRoutes';
import adminRoutes from './routes/adminRoutes';

import { checkGeneratorHealth } from './services/moderationService';

const app: Express = express();

const PORT = Number(process.env.PORT) || 5000;

/* ============================================================
   CORS
   ============================================================ */

const allowedOrigins = (process.env.CORS_ORIGINS || [
  'http://localhost:5175',
  'http://127.0.0.1:5175',
].join(',')).split(',').map(origin => origin.trim()).filter(Boolean);
app.disable('x-powered-by');

app.use(
  cors({
    origin: (origin, callback) => {
      // Request tanpa Origin, misalnya curl/Postman/server-to-server
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`)
      ) {
        return callback(null, true);
      }

      console.log(`❌ CORS blocked origin: ${origin}`);

      return callback(Object.assign(new Error('Origin not allowed'), { status: 403 }));
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  })
);

/* ============================================================
   BODY PARSER
   ============================================================ */

app.use(express.json());

/* ============================================================
   HEALTH CHECK
   ============================================================ */

// Simple health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
  });
});

/* ============================================================
   ROUTES
   ============================================================ */

app.use('/api/auth', authRoutes);

app.use('/api/chat', chatRoutes);

app.use('/api/me', studentRoutes);

app.use('/api/teacher', teacherRoutes);
app.use('/api/headmaster', headmasterRoutes);
app.use('/api/admin', adminRoutes);

/* ============================================================
   ROOT ROUTE
   ============================================================ */

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '✅ Welcome to EduBot API (REST)',
    status: 'Server is running successfully!',
    version: '2.0.0',

    endpoints: {
      health: 'GET /health',
      apiHealth: 'GET /api/health',
      chat: 'POST /api/chat',
      myStrikes: 'GET /api/me/strikes',
      teacherStudents: 'GET /api/teacher/students',
      teacherNotifications: 'GET /api/teacher/notifications',
    },

    timestamp: new Date().toISOString(),
  });
});

/* ============================================================
   API HEALTH
   ============================================================ */

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'EduBot REST API is running!',
    architecture: 'REST + Supabase',
    timestamp: new Date().toISOString(),
  });
});

/* ============================================================
   404 HANDLER
   ============================================================ */

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Preserve a JSON contract for malformed input and denied origins; never expose stacks to client.
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const candidate = error as { status?: number; name?: string; message?: string; stack?: string };
  const status = candidate?.status === 403 ? 403 : candidate?.status === 413 ? 413
    : candidate?.status === 400 ? 400 : 500;

  // Safe server-side logging: records error details without exposing secrets or credentials
  console.error(`❌ [${req.method} ${req.originalUrl || req.url}] Server error:`, {
    name: candidate?.name || (error instanceof Error ? error.name : 'UnknownError'),
    message: candidate?.message || (error instanceof Error ? error.message : String(error)),
    stack: candidate?.stack || (error instanceof Error ? error.stack : undefined),
    path: req.originalUrl || req.url,
  });

  res.status(status).json({
    error: status === 403 ? 'Origin not allowed'
      : status === 413 ? 'Request body too large'
      : status === 400 ? 'Invalid JSON body'
      : 'Internal server error',
    message: status === 500 ? 'Terjadi kesalahan pada server.' : undefined,
  });
});

/* ============================================================
   PROCESS-LEVEL ERROR LISTENERS
   ============================================================ */

process.on('unhandledRejection', (reason: unknown) => {
  console.error('❌ Unhandled Rejection:', {
    name: reason instanceof Error ? reason.name : 'UnhandledRejection',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
});

/* ============================================================
   START SERVER
   ============================================================ */

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (require.main === module && !isServerless) {
  app.listen(PORT, () => {
    console.log(
      `🚀 EduBot REST API running on http://localhost:${PORT}`
    );

    console.log(
      `📍 Allowed Origins: ${allowedOrigins.join(', ')}`
    );

    console.log(
      '🛡️ Architecture: Pure REST + Supabase DB (No n8n, No Socket.io)'
    );

    void checkGeneratorHealth();
  });
}

// Support both ES module and CommonJS default exports for serverless runners
export default app;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  module.exports.default = app;
}
