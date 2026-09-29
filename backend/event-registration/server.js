const mongoose = require("mongoose");
const app = require("./app");
const { port, mongoUrl } = require("./config");

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("MongoDB connected successfully.");
    app.listen(port, () =>
      console.log(`Server is running at http://localhost:${port}`),
    );
  })
  .catch((err) => {
    console.error("Could not connect to DB");
    process.exit(1);
  });
