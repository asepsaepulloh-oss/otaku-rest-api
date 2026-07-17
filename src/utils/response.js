class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      status: statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    const response = {
      success: false,
      status: statusCode,
      message,
      timestamp: new Date().toISOString()
    };

    if (details && process.env.NODE_ENV !== 'production') {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  static paginated(res, items, pagination, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      status: statusCode,
      message,
      data: {
        items,
        pagination
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;