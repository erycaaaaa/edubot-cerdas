"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const teacherRoutes_1 = __importDefault(require("./routes/teacherRoutes"));
const headmasterRoutes_1 = __importDefault(require("./routes/headmasterRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const moderationService_1 = require("./services/moderationService");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
/* ============================================================
   CORS
   ============================================================ */
const allowedOrigins = (process.env.CORS_ORIGINS || [
    'http://localhost:5175',
    'http://127.0.0.1:5175',
].join(',')).split(',').map(origin => origin.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Request tanpa Origin, misalnya curl/Postman/server-to-server
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`)) {
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
}));
/* ============================================================
   BODY PARSER
   ============================================================ */
app.use(express_1.default.json());
/* ============================================================
   HEALTH CHECK
   ============================================================ */
// Simple health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
    });
});
/* ============================================================
   ROUTES
   ============================================================ */
app.use('/api/auth', authRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/me', studentRoutes_1.default);
app.use('/api/teacher', teacherRoutes_1.default);
app.use('/api/headmaster', headmasterRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
/* ============================================================
   ROOT ROUTE
   ============================================================ */
app.get('/', (_req, res) => {
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
app.get('/api/health', (_req, res) => {
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
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.path}`,
    });
});
// Preserve a JSON contract for malformed input and denied origins; never expose stacks to client.
app.use((error, req, res, _next) => {
    const candidate = error;
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
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', {
        name: reason instanceof Error ? reason.name : 'UnhandledRejection',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    });
});
process.on('uncaughtException', (error) => {
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
        console.log(`🚀 EduBot REST API running on http://localhost:${PORT}`);
        console.log(`📍 Allowed Origins: ${allowedOrigins.join(', ')}`);
        console.log('🛡️ Architecture: Pure REST + Supabase DB (No n8n, No Socket.io)');
        void (0, moderationService_1.checkGeneratorHealth)();
    });
}
// Support both ES module and CommonJS default exports for serverless runners
exports.default = app;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
    module.exports.default = app;
}
