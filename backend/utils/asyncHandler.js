// Wraps an async route handler so thrown/rejected errors go to errorHandler
// instead of crashing the process or needing repeated try/catch.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
