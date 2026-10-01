const env = require("./config/env");
const app = require("./app");
const connectDatabase = require("./config/db");

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, "0.0.0.0", () => {
    console.log(
      `🚀 Server running on port ${env.port}`
    );
  });
};

startServer();