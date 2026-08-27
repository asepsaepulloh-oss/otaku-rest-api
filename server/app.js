const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('../src/config');
const routes = require('../src/routes');
const errorHandler = require('../src/middlewares/errorHandler');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/', routes);

app.use((req, res) => {
  const ApiResponse = require('../src/utils/response');
  ApiResponse.error(res, 'Endpoint not found', 404);
});

app.use(errorHandler);

module.exports = app;
