const rateLimit = require('express-rate-limit');
const config = require('../config');
const ApiResponse = require('../utils/response');

const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    ApiResponse.error(
      res,
      'Too many requests from this IP, please try again later.',
      429
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req) => {
    return req.path === '/health';
  }
});

module.exports = { rateLimiter };