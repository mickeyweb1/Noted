export const errorHandler = (err, req, res, next) => {
  // Set default status code and message
  let statusCode = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // ✅ SECURE: Hide detailed errors in production, show them only in development
  if (process.env.NODE_ENV === 'production') {
    // Hide Mongoose duplicate key errors
    if (err.code === 11000) {
      message = 'Duplicate field value entered';
      statusCode = 400;
    }
    // Hide Mongoose cast errors (e.g., invalid MongoDB ID)
    if (err.name === 'CastError') {
      message = 'Resource not found';
      statusCode = 404;
    }
    // Hide generic server errors from the client
    if (statusCode === 500) {
      message = 'Something went wrong on our end. Please try again later.';
    }
  }

  // Log the full error on the server for YOU to debug
  console.error(`[ERROR] ${statusCode} - ${err.message}`);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    // Only send stack trace in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};