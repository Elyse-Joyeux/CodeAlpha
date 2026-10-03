const httpError = require("../utils/httpError");
const token = require("../utils/token");

// protects /api/admin/* (header: authorization: bearer <token>)

exports.requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || "";
  const bearer = /^Bearer\s+(.+)$/i.exec(header);
  if (!bearer || !token.verify(bearer[1]))
    return next(httpError(401, "Admin sign-in required"));
  next();
};
