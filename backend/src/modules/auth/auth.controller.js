const {
  validateSignup,
  validateLogin,
} = require("./auth.validation");

const {
  registerTenantOwner,
  loginUser,
} = require("./auth.service");

const signup = async (req, res, next) => {
  try {
    const validationError = validateSignup(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      name,
      email,
      password,
      businessName,
      businessType,
    } = req.body;

    const result = await registerTenantOwner({
      name,
      email,
      password,
      businessName,
      businessType,
    });

    return res.status(201).json({
      success: true,
      message: "Store owner account created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const validationError = validateLogin(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const { email, password } = req.body;

    const result = await loginUser({
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
};