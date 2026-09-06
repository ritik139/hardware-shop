const jwt = require("jsonwebtoken");

/**
 * Protects admin-only routes. Checks for a valid JWT token
 * sent either as a cookie ("token") or in the Authorization header.
 */
function requireAdmin(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ message: "Login required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session, please login again" });
  }
}

module.exports = { requireAdmin };