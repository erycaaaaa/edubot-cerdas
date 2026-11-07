
require('express');

const app = require('./dist/server.js');
const handler = app.default || app;

// Local development only.
// Vercel handles the serverless request lifecycle.
if (
  require.main === module &&
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME
) {
  const PORT = Number(process.env.PORT) || 5000;

  handler.listen(PORT, () => {
    console.log('[SERVER] EduBot REST API running');
    console.log('[SERVER] URL:', `http://localhost:${PORT}`);
  });
}

module.exports = handler;
module.exports.default = handler;
