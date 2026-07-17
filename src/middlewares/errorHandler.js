const ApiResponse = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);

  if (err.name === 'ValidationError') {
    return ApiResponse.error(res, err.message, 400, err.errors);
  }

  if (err.name === 'AxiosError') {
    return ApiResponse.error(
      res,
      'Failed to fetch data from external service',
      503,
      err.message
    );
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  ApiResponse.error(res, message, statusCode, process.env.NODE_ENV !== 'production' ? err.stack : null);
};

module.exports = errorHandler;