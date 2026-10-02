// Create an Error that the error-handler middleware turns into an HTTP response.
module.exports = (status, message) =>
  Object.assign(new Error(message), { status });
