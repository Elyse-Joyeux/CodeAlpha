exports.notFound = (req, res) => res.status(404).json({ error: "Not found" });

// central error handler: known errors keep their message, unknown ones are logged and hidden.
exports.errorHandler = (err, req, res, next) => {
  const status =
    err.status ||
    (err.name === "ValidationError"
      ? 400
      : err.name === "CastError"
        ? 404
        : err.code === 11000
          ? 409
          : 0);
  if (!status) console.error(err);
  res
    .status(status || 500)
    .json({
      error: !status
        ? "Something went wrong on the server"
        : err.code === 11000
          ? "That already exists"
          : err.name === "CastError"
            ? "Not found"
            : err.message,
    });
};
