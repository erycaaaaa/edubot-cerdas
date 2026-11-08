
const appModule = require('./dist/server.js');
const app = appModule.default || appModule;

const PORT = Number(process.env.PORT) || 5000;

// Local development only.
// Vercel manages the serverless request lifecycle.
if (
  require.main === module &&
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME
) {
  app.listen(PORT, () => {
    console.log('[SERVER] EduBot REST API running');
    console.log('[SERVER] URL:', `http://localhost:${PORT}`);
    console.log('[SERVER] Port:', PORT);
  });
}

// Export Express app for Vercel.
module.exports = app;
module.exports.default = app;
