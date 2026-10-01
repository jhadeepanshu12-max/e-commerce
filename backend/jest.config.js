module.exports = {
  testEnvironment: "node",

  setupFilesAfterEnv: [
    "./tests/helpers/testSetup.js",
  ],

  testMatch: [
    "./tests/**/*.test.js",
  ],

  clearMocks: true,

  verbose: true,

  forceExit: true,

  detectOpenHandles: true,
};