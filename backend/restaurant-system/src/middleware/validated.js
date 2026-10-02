const { isValidObjectId } = require("mongoose");
const httpError = require("../utils/httpError");

// router.param('id', validateId) -> malformed ids become a clean 404
module.exports = (req, res, next, id) =>
  isValidObjectId(id) ? next() : next(httpError(404, "Not found"));
