const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};

const requiredEnvVariables = [
  ["MONGO_URI", env.mongoUri],
  ["JWT_ACCESS_SECRET", env.jwtAccessSecret],
  ["JWT_REFRESH_SECRET", env.jwtRefreshSecret],
];

for (const [name, value] of requiredEnvVariables) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

module.exports = env;