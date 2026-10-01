import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { motion } from "motion/react";

import "./Auth.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api/v1";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const Login = () => {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    tenantSlug: "",
  });

  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [googleReady, setGoogleReady] =
    useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    if (
      !form.email.trim() ||
      !form.password ||
      !form.tenantSlug.trim()
    ) {
      setError(
        "Please enter your email, password and store slug."
      );

      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/customer-auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            tenantSlug:
              form.tenantSlug.trim(),
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Unable to login. Please check your credentials."
        );
      }

      const accessToken =
        result?.data?.accessToken ||
        result?.accessToken;

      const customer =
        result?.data?.customer ||
        result?.customer ||
        result?.data?.user ||
        result?.user;

      if (!accessToken) {
        throw new Error(
          "Login succeeded but no access token was returned."
        );
      }

      localStorage.setItem(
        "nova_customer_token",
        accessToken
      );

      if (customer) {
        localStorage.setItem(
          "nova_customer",
          JSON.stringify(customer)
        );
      }

      navigate("/");
    } catch (loginError) {
      setError(
        loginError.message ||
          "Something went wrong while logging in."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (
    response
  ) => {
    if (!response?.credential) {
      setError(
        "Google authentication did not return a valid credential."
      );

      return;
    }

    const currentTenantSlug =
      formRef.current.tenantSlug.trim();

    if (!currentTenantSlug) {
      setError(
        "Please enter your store slug before continuing with Google."
      );

      return;
    }

    try {
      setError("");
      setGoogleLoading(true);

      const apiResponse = await fetch(
        `${API_BASE_URL}/customer-auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential:
              response.credential,
            tenantSlug:
              currentTenantSlug,
          }),
        }
      );

      const result =
        await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Google login failed."
        );
      }

      const accessToken =
        result?.data?.accessToken ||
        result?.accessToken;

      const customer =
        result?.data?.customer ||
        result?.customer ||
        result?.data?.user ||
        result?.user;

      if (!accessToken) {
        throw new Error(
          "Google login succeeded but no access token was returned."
        );
      }

      localStorage.setItem(
        "nova_customer_token",
        accessToken
      );

      if (customer) {
        localStorage.setItem(
          "nova_customer",
          JSON.stringify(customer)
        );
      }

      navigate("/");
    } catch (googleError) {
      setError(
        googleError.message ||
          "Unable to continue with Google."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    const initializeGoogle = () => {
      if (
        !window.google ||
        !window.google.accounts ||
        !googleButtonRef.current
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleButtonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: "outline",
          size: "large",
          type: "standard",
          text: "continue_with",
          shape: "pill",
          width: 360,
          logo_alignment: "left",
        }
      );

      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();

      return undefined;
    }

    const existingScript =
      document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        initializeGoogle
      );

      return () => {
        existingScript.removeEventListener(
          "load",
          initializeGoogle
        );
      };
    }

    const script =
      document.createElement("script");

    script.src =
      "https://accounts.google.com/gsi/client";

    script.async = true;
    script.defer = true;

    script.onload = initializeGoogle;

    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  const fadeUp = {
    hidden: {
      opacity: 0,
      y: 20,
    },

    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <main className="auth-page">
      <div className="auth-background">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-grid" />
      </div>

      <section className="auth-shell">
        <motion.div
          className="auth-showcase"
          initial={{
            opacity: 0,
            x: -35,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="auth-brand">
            <span className="auth-brand-mark">
              N
            </span>

            <span>NOVA</span>
          </div>

          <div className="auth-showcase-content">
            <motion.div
              className="auth-eyebrow"
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.25,
              }}
            >
              ✦ THE NEXT SHOPPING EXPERIENCE
            </motion.div>

            <motion.h1
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.35,
              }}
            >
              Everything worth
              <span> wanting.</span>
            </motion.h1>

            <motion.p
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.45,
              }}
            >
              Discover products curated around
              your world, your taste and your
              next obsession.
            </motion.p>
          </div>

          <motion.div
            className="auth-showcase-card"
            initial={{
              opacity: 0,
              y: 25,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              delay: 0.55,
              duration: 0.7,
            }}
          >
            <div className="showcase-card-glow" />

            <div className="showcase-card-top">
              <span>AI CURATED</span>
              <span>✦</span>
            </div>

            <div className="showcase-product">
              <div className="showcase-product-orbit orbit-one" />
              <div className="showcase-product-orbit orbit-two" />

              <div className="showcase-product-core">
                NOVA
              </div>
            </div>

            <div className="showcase-card-bottom">
              <strong>
                Personalized shopping
              </strong>

              <span>
                Built around you.
              </span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="auth-panel"
          initial={{
            opacity: 0,
            x: 35,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="auth-panel-inner">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="auth-header"
            >
              <div className="mobile-auth-logo">
                <span>N</span>
                NOVA
              </div>

              <p className="auth-mini-label">
                WELCOME BACK
              </p>

              <h2>Sign in to NOVA</h2>

              <p>
                Continue your shopping journey.
              </p>
            </motion.div>

            {error && (
              <motion.div
                className="auth-error"
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                {error}
              </motion.div>
            )}

            <motion.form
              className="auth-form"
              onSubmit={handleLogin}
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.2,
              }}
            >
              <div className="auth-field">
                <label htmlFor="tenantSlug">
                  Store
                </label>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    ◈
                  </span>

                  <input
                    id="tenantSlug"
                    name="tenantSlug"
                    type="text"
                    placeholder="your-store"
                    value={form.tenantSlug}
                    onChange={updateField}
                    autoComplete="organization"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="email">
                  Email address
                </label>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    @
                  </span>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={updateField}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="password">
                    Password
                  </label>

                  <button
                    type="button"
                    className="auth-forgot"
                    onClick={() =>
                      setError(
                        "Password recovery will be available soon."
                      )
                    }
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    ◉
                  </span>

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={updateField}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? "◉" : "◌"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={
                  loading || googleLoading
                }
              >
                {loading ? (
                  <>
                    <span className="auth-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <span>→</span>
                  </>
                )}
              </button>
            </motion.form>

            <div className="auth-divider">
              <span />
              <p>OR CONTINUE WITH</p>
              <span />
            </div>

            <div className="google-login-wrapper">
              {GOOGLE_CLIENT_ID ? (
                <>
                  <div
                    className={`google-button-container ${
                      googleLoading
                        ? "google-loading"
                        : ""
                    }`}
                    ref={googleButtonRef}
                  />

                  {!googleReady && (
                    <div className="google-loading-placeholder">
                      Loading Google...
                    </div>
                  )}
                </>
              ) : (
                <div className="google-config-warning">
                  Add your Google Client ID in the
                  frontend environment file.
                </div>
              )}
            </div>

            <div className="auth-footer">
              <p>
                Don't have an account?

                <Link to="/signup">
                  Create account
                </Link>
              </p>

              <div className="auth-security">
                <span>✦</span>
                Secure NOVA authentication
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
};

export default Login;