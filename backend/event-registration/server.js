const mongoose = require("mongoose");
const app = require("./app");
const { port, mongoUri } = require("./config");

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected successfully.");
    app.listen(port, () =>
      console.log(`Server is running at http://localhost:${port}`),
    );
  })
  .catch((err) => {
    console.error("Could not connect to DB:", err.message);
    process.exit(1);
  });
