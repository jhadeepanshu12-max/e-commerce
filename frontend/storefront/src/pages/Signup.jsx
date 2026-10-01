import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import "./Auth.css";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    tenantSlug: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.tenantSlug
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/v1/customer-auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            tenantSlug: form.tenantSlug
              .trim()
              .toLowerCase(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Unable to create account."
        );
      }

      if (result?.data?.accessToken) {
        localStorage.setItem(
          "nova_customer_token",
          result.data.accessToken
        );
      }

      if (result?.data?.customer) {
        localStorage.setItem(
          "nova_customer",
          JSON.stringify(result.data.customer)
        );
      }

      navigate("/");
    } catch (submitError) {
      setError(
        submitError.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-background">
        <motion.div
          className="auth-orb auth-orb-one"
          animate={{
            x: [0, 45, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="auth-orb auth-orb-two"
          animate={{
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        className="auth-shell auth-shell-signup"
        initial={{
          opacity: 0,
          scale: 0.96,
          y: 25,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <section className="auth-showcase signup-showcase">
          <Link to="/" className="auth-brand">
            <span className="auth-brand-mark">N</span>
            <span>NOVA</span>
          </Link>

          <div className="showcase-content">
            <span className="showcase-kicker">
              ✦ JOIN THE EXPERIENCE
            </span>

            <h1>
              Make it
              <br />
              <span>personal.</span>
            </h1>

            <p>
              Create your NOVA account and unlock a
              more personal way to discover, save and
              shop what you love.
            </p>

            <div className="benefit-stack">
              <motion.div
                whileHover={{
                  x: 6,
                }}
              >
                <span>✦</span>
                <div>
                  <strong>Personalized discovery</strong>
                  <small>
                    Products shaped around your taste.
                  </small>
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  x: 6,
                }}
              >
                <span>♡</span>
                <div>
                  <strong>Save what you love</strong>
                  <small>
                    Wishlist and collections in one place.
                  </small>
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  x: 6,
                }}
              >
                <span>↗</span>
                <div>
                  <strong>Faster checkout</strong>
                  <small>
                    Your details, ready when you are.
                  </small>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="showcase-footer">
            <span>12K+ products</span>
            <span>AI powered</span>
            <span>Built for you</span>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-top">
            <Link to="/" className="mobile-auth-brand">
              <span>N</span>
              NOVA
            </Link>

            <span className="secure-label">
              <i />
              CREATE ACCOUNT
            </span>
          </div>

          <div className="auth-heading">
            <span className="auth-kicker">
              SIGN UP
            </span>

            <h2>Start your journey.</h2>

            <p>
              Create your account in a few seconds.
            </p>
          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>Full name</span>

              <div className="input-wrap">
                <span className="input-icon">
                  ✦
                </span>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            </label>

            <label>
              <span>Email address</span>

              <div className="input-wrap">
                <span className="input-icon">
                  @
                </span>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              <span>Store</span>

              <div className="input-wrap">
                <span className="input-icon">
                  ◈
                </span>

                <input
                  type="text"
                  name="tenantSlug"
                  value={form.tenantSlug}
                  onChange={handleChange}
                  placeholder="your-store"
                  autoComplete="organization"
                />
              </div>

              <small>
                Enter the store you want to shop from.
              </small>
            </label>

            <label>
              <span>Password</span>

              <div className="input-wrap">
                <span className="input-icon">
                  •
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                >
                  {showPassword ? "◉" : "◌"}
                </button>
              </div>
            </label>

            <label>
              <span>Confirm password</span>

              <div className="input-wrap">
                <span className="input-icon">
                  ✓
                </span>

                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
              </div>
            </label>

            {error && (
              <motion.div
                className="auth-error"
                initial={{
                  opacity: 0,
                  y: -5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                <span>!</span>
                {error}
              </motion.div>
            )}

            <p className="terms-text">
              By creating an account, you agree to
              NOVA's terms and privacy policy.
            </p>

            <motion.button
              className="auth-submit"
              type="submit"
              disabled={loading}
              whileHover={
                !loading
                  ? {
                      y: -3,
                      scale: 1.01,
                    }
                  : {}
              }
              whileTap={
                !loading
                  ? {
                      scale: 0.98,
                    }
                  : {}
              }
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <span>↗</span>
                </>
              )}
            </motion.button>
          </form>

          <p className="auth-switch">
            Already have an account?
            <Link to="/login">
              Sign in
            </Link>
          </p>
        </section>
      </motion.div>
    </main>
  );
}

export default Signup;