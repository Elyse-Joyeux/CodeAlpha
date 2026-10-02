const httpError = require("../utils/httpError");
const token = require("../utils/token");

// protects /api/admin/* (header: authorization: bearer <token>)

exports.requireAdmin = (req, res, next) => {
  if (!token.verify((req.headers.authorization || "").replace("Bearer ", "")))
    return next(httpError(401, "Admin sign-in required"));
  next();
};
