
"use strict";

// ======================================================
// EDUBOT BACKEND - SERVER ENTRYPOINT
// Express + TypeScript + esbuild bundle
// Compatible with Vercel Serverless Functions
// ======================================================

// Load the bundled Express application.
// IMPORTANT: Use server.bundle.cjs, NOT dist/server.js.
const appModule = require("./dist/server.bundle.cjs");

// Support CommonJS and default exports.
const app = appModule.default || appModule;

// ======================================================
// VALIDATE EXPRESS APPLICATION
// ======================================================

if (typeof app !== "function" || typeof app.listen !== "function") {
  throw new Error(
    "[SERVER] Invalid Express application exported from dist/server.bundle.cjs"
  );
}

// ======================================================
// SERVER CONFIGURATION
// ======================================================

const PORT = Number(process.env.PORT) || 5000;

// ======================================================
// LOCAL DEVELOPMENT SERVER
// ======================================================

// Vercel manages the serverless request lifecycle.
// Only start app.listen() when running this file directly
// in a local development environment.

if (
  require.main === module &&
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME
) {
  app.listen(PORT, () => {
    console.log("======================================");
    console.log("[SERVER] EduBot REST API running");
    console.log("[SERVER] Environment:", process.env.NODE_ENV || "development");
    console.log("[SERVER] URL:", `http://localhost:${PORT}`);
    console.log("[SERVER] Port:", PORT);
    console.log("======================================");
  });
}

// ======================================================
// EXPORT EXPRESS APPLICATION
// ======================================================

// Vercel uses this exported Express application
// to handle incoming requests.

module.exports = app;
module.exports.default = app;
