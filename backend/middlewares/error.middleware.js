const { ApiError } = require("../utils/ApiError");

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : "Something went wrong";

  if (!isApiError || !err.isOperational) {
    console.error("[UNHANDLED ERROR]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && !isApiError
      ? { stack: err.stack }
      : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
