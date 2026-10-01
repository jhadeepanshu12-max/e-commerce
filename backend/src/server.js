const env = require("./config/env");
const app = require("./app");
const connectDatabase = require("./config/db");

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(
      `🚀 Server running on http://localhost:${env.port}`
    );
  });
};

startServer();