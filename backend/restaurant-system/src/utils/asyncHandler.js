// Wrap an async controller so rejected promises reach the error handler.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
