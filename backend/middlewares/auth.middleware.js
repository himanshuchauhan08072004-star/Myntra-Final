const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/ApiError");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed token"));
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Token expired"));
    }
    return next(ApiError.unauthorized("Invalid token"));
  }
}

// Optional auth — attaches req.userId if token present/valid, but never blocks.
// Needed for guest-to-user flows (recently viewed, cart) where both guest and
// logged-in users hit the same route.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
  } catch (err) {
    // invalid/expired token on optional route -> treat as guest, don't block
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
