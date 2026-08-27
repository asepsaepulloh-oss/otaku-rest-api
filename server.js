require('dotenv').config();

const config = require('./src/config');
const app = require('./server/app');
const PORT = config.port;

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Otakudesu REST API is running on http://localhost:${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Rate Limit: ${config.rateLimit.max} requests per ${config.rateLimit.windowMs / 60000} minutes`);
  });
}

module.exports = app;