
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv is optional in production environments.
}

import express, {
  Express,
  Request,
  Response,
  NextFunction,
} from 'express';
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

const allowedOrigins = (process.env.CORS_ORIGINS || [
  'http://localhost:5175',
  'http://127.0.0.1:5175',
].join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        (
          process.env.VERCEL_URL &&
          origin === `https://${process.env.VERCEL_URL}`
        )
      ) {
        return callback(null, true);
      }

      console.error('[CORS] Request blocked:', {
        origin,
      });

      return callback(
        Object.assign(new Error('Origin not allowed'), {
          status: 403,
        })
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  })
);

// Request body parser
app.use(express.json());

// Request and response logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  const requestId =
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  res.locals.requestId = requestId;

  console.log('[REQUEST]', {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    origin: req.get('origin') || 'No Origin',
    ip: req.ip,
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const logMethod =
      res.statusCode >= 500
        ? console.error
        : res.statusCode >= 400
          ? console.warn
          : console.log;

    logMethod('[RESPONSE]', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  });

  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/me', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/headmaster', headmasterRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to EduBot API (REST)',
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

// API health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'EduBot REST API is running!',
    architecture: 'REST + Supabase',
    timestamp: new Date().toISOString(),
  });
});

// Not found handler
app.use((req: Request, res: Response) => {
  console.warn('[NOT FOUND]', {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.originalUrl,
  });

  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const candidate = error as {
    status?: number;
    name?: string;
    message?: string;
    stack?: string;
  };

  const status =
    candidate?.status === 403 ? 403 :
    candidate?.status === 413 ? 413 :
    candidate?.status === 400 ? 400 : 500;

  console.error('[SERVER ERROR]', {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    name: candidate?.name ||
      (error instanceof Error ? error.name : 'UnknownError'),
    message: candidate?.message ||
      (error instanceof Error ? error.message : String(error)),
    stack: candidate?.stack ||
      (error instanceof Error ? error.stack : undefined),
  });

  if (res.headersSent) {
    return;
  }

  res.status(status).json({
    error:
      status === 403 ? 'Origin not allowed' :
      status === 413 ? 'Request body too large' :
      status === 400 ? 'Invalid JSON body' :
      'Internal server error',

    message: status === 500
      ? 'Terjadi kesalahan pada server.'
      : undefined,
  });
});

// Process-level error listeners
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UNHANDLED REJECTION]', {
    name: reason instanceof Error
      ? reason.name
      : 'UnhandledRejection',

    message: reason instanceof Error
      ? reason.message
      : String(reason),

    stack: reason instanceof Error
      ? reason.stack
      : undefined,
  });
});

process.on('uncaughtException', (error: Error) => {
  console.error('[UNCAUGHT EXCEPTION]', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
});

// Server initialization
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
);

if (require.main === module && !isServerless) {
  app.listen(PORT, () => {
    console.log('[SERVER] EduBot REST API started');
    console.log('[SERVER] URL:', `http://localhost:${PORT}`);
    console.log('[SERVER] Port:', PORT);
    console.log('[SERVER] Allowed origins:', allowedOrigins);
    console.log('[SERVER] Architecture: REST + Supabase');
    console.log('[SERVER] Request logging: enabled');

    void checkGeneratorHealth();
  });
}

// Export Express application
export default app;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  module.exports.default = app;
}
