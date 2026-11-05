/**
 * Root entrypoint for Vercel Serverless Function & Express Service.
 *
 * Exposing this file at the service root (backend-vite/index.js) ensures that
 * Vercel's @vercel/backends service builder packages the service with
 * backend-vite/ as the function root rather than isolating the dist/ subdirectory.
 * This guarantees that package.json and node_modules are located in the same
 * directory as the executing entrypoint in the production serverless container.
 */

const app = require('./dist/server.js');

const handler = app.default || app;

// Optional: local execution when run directly outside serverless
if (require.main === module && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const PORT = Number(process.env.PORT) || 5000;
  handler.listen(PORT, () => {
    console.log(`🚀 EduBot REST API running on http://localhost:${PORT}`);
  });
}

module.exports = handler;
module.exports.default = handler;
