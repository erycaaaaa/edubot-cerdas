"use strict";
/**
 * EduBot REST API
 * Express + TypeScript + Supabase
 *
 * Local development:
 *   Loads environment variables from .env using dotenv.
 *
 * Production:
 *   Uses environment variables provided by Vercel.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ============================================================
// 1. ENVIRONMENT CONFIGURATION
// ============================================================
const isServerless = Boolean(process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME);
if (!isServerless) {
    try {
        require('dotenv').config();
        console.log('[ENV] Local .env loaded');
    }
    catch (error) {
        console.warn('[ENV] dotenv unavailable; using system environment variables');
    }
}
// ============================================================
// 2. IMPORTS
// ============================================================
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const teacherRoutes_1 = __importDefault(require("./routes/teacherRoutes"));
const headmasterRoutes_1 = __importDefault(require("./routes/headmasterRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const moderationService_1 = require("./services/moderationService");
// ============================================================
// 3. EXPRESS INITIALIZATION
// ============================================================
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
// ============================================================
// 4. CORS CONFIGURATION
// ============================================================
const allowedOrigins = (process.env.CORS_ORIGINS ||
    [
        'http://localhost:5175',
        'http://127.0.0.1:5175',
    ].join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
app.disable('x-powered-by');
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests without Origin header.
        if (!origin) {
            return callback(null, true);
        }
        const isAllowed = allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            (Boolean(process.env.VERCEL_URL) &&
                origin === `https://${process.env.VERCEL_URL}`);
        if (isAllowed) {
            return callback(null, true);
        }
        console.warn('[CORS] Request blocked:', { origin });
        const error = Object.assign(new Error('Origin not allowed'), { status: 403 });
        return callback(error);
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
}));
// ============================================================
// 5. BODY PARSER
// ============================================================
app.use(express_1.default.json({ limit: '1mb' }));
// ============================================================
// 6. REQUEST LOGGING
// ============================================================
app.use((req, res, next) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
        const logMethod = res.statusCode >= 500
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
// ============================================================
// 7. HEALTH CHECK
// ============================================================
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'edubuz-backend',
        timestamp: new Date().toISOString(),
    });
});
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'EduBot REST API is running',
        architecture: 'REST + Supabase',
        timestamp: new Date().toISOString(),
    });
});
// ============================================================
// 8. API ROUTES
// ============================================================
app.use('/api/auth', authRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/me', studentRoutes_1.default);
app.use('/api/teacher', teacherRoutes_1.default);
app.use('/api/headmaster', headmasterRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// ============================================================
// 9. ROOT ROUTE
// ============================================================
app.get('/', (_req, res) => {
    res.status(200).json({
        message: 'Welcome to EduBot API (REST)',
        status: 'Server is running successfully',
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
// ============================================================
// 10. NOT FOUND HANDLER
// ============================================================
app.use((req, res) => {
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
// ============================================================
// 11. GLOBAL ERROR HANDLER
// ============================================================
const errorHandler = (error, req, res, _next) => {
    const candidate = error && typeof error === 'object'
        ? error
        : undefined;
    const status = candidate?.status === 403 ? 403 :
        candidate?.status === 413 ? 413 :
            candidate?.status === 400 ? 400 :
                500;
    console.error('[SERVER ERROR]', {
        requestId: res.locals.requestId,
        method: req.method,
        path: req.originalUrl,
        status,
        name: candidate?.name || 'UnknownError',
        message: candidate?.message || String(error),
        stack: candidate?.stack,
    });
    if (res.headersSent) {
        return;
    }
    res.status(status).json({
        error: status === 403 ? 'Origin not allowed' :
            status === 413 ? 'Request body too large' :
                status === 400 ? 'Invalid JSON body' :
                    'Internal server error',
        message: status === 500
            ? 'Terjadi kesalahan pada server.'
            : undefined,
    });
};
app.use(errorHandler);
// ============================================================
// 12. PROCESS ERROR LOGGING
// ============================================================
process.on('unhandledRejection', (reason) => {
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
process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION]', {
        name: error.name,
        message: error.message,
        stack: error.stack,
    });
});
// ============================================================
// 13. LOCAL SERVER START
// ============================================================
// Only start an HTTP listener during local development.
// Vercel invokes the exported Express app directly.
if (!isServerless && require.main === module) {
    app.listen(PORT, () => {
        console.log('[SERVER] EduBot REST API started');
        console.log('[SERVER] URL:', `http://localhost:${PORT}`);
        console.log('[SERVER] Port:', PORT);
        console.log('[SERVER] Allowed origins:', allowedOrigins);
        console.log('[SERVER] Architecture: REST + Supabase');
        void (0, moderationService_1.checkGeneratorHealth)();
    });
}
// ============================================================
// 14. EXPORT EXPRESS APP
// ============================================================
exports.default = app;
