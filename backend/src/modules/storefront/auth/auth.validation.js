const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateSignup = (body) => {
  const { name, email, password, businessName } = body;

  if (!name || !email || !password || !businessName) {
    return "Name, email, password and business name are required";
  }

  if (name.trim().length < 2) {
    return "Name must contain at least 2 characters";
  }

  if (!isValidEmail(email)) {
    return "Please provide a valid email address";
  }

  if (password.length < 8) {
    return "Password must contain at least 8 characters";
  }

  if (businessName.trim().length < 2) {
    return "Business name must contain at least 2 characters";
  }

  return null;
};

const validateLogin = (body) => {
  const { email, password } = body;

  if (!email || !password) {
    return "Email and password are required";
  }

  if (!isValidEmail(email)) {
    return "Please provide a valid email address";
  }

  return null;
};

module.exports = {
  validateSignup,
  validateLogin,
};