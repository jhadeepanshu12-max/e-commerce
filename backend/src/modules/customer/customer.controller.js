const {
  registerCustomer,
  loginCustomer,
} = require("./customer.service");

const register = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      email,
      password,
      tenantSlug,
    } = req.body;

    if (
      !name ||
      name.trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name must contain at least 2 characters",
      });
    }

    if (
      !email ||
      !email.includes("@")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid email is required",
      });
    }

    if (
      !password ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters",
      });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        message:
          "Store slug is required",
      });
    }

    const result =
      await registerCustomer({
        name,
        email,
        password,
        tenantSlug,
      });

    return res.status(201).json({
      success: true,
      message:
        "Customer account created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      password,
      tenantSlug,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        message:
          "Store slug is required",
      });
    }

    const result =
      await loginCustomer({
        email,
        password,
        tenantSlug,
      });

    return res.status(200).json({
      success: true,
      message:
        "Customer login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};