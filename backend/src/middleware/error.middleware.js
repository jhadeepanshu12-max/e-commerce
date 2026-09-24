const errorHandler = (err, req, res, next) => {
  console.error("API Error:", err);

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: duplicateField
        ? `${duplicateField} already exists`
        : "Duplicate value already exists",
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(
      (validationError) => validationError.message
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message,
  });
};

module.exports = errorHandler;