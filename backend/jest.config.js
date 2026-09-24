module.exports = {
  testEnvironment: "node",

  setupFilesAfterEnv: [
    "<rootDir>/tests/helpers/testSetup.js",
  ],

  testMatch: [
    "<rootDir>/tests/**/*.test.js",
  ],

  clearMocks: true,

  verbose: true,

  forceExit: true,

  detectOpenHandles: true,
};