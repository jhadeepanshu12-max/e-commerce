const express = require("express");

const {
  register,
  login,
  googleLogin,
} = require("./customer.controller");

const router = express.Router();

router.post(
  "/signup",
  register
);

router.post(
  "/login",
  login
);

router.post(
  "/google",
  googleLogin
);

module.exports = router;