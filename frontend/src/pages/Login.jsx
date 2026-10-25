import React, { useState } from "react";
import ReadAloudControls from "../components/ReadAloudControls";

function Login({ onBack, onLoginSuccess, onSignUp, onForgotPassword }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage(`Login successful. Welcome ${data.user.name}!`);
        onLoginSuccess(data.user);
      } else {
        setMessage(data.message || "Invalid email or password.");
      }
    } catch (error) {
      setMessage("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
     <div style={styles.page}>
    <div style={{ width: "100%", maxWidth: "440px" }}>
      <ReadAloudControls    guidance={{
    en: "Welcome to ImuniX. Enter your registered email address and password. Click Login to access your account. If you do not have an account, click Sign Up. If you forgot your password, select Forgot Password and follow the instructions.",
    bn: "ইমিউনিক্সে আপনাকে স্বাগতম। আপনার অ্যাকাউন্টে প্রবেশ করতে নিবন্ধিত ইমেইল ঠিকানা এবং পাসওয়ার্ড লিখুন। এরপর লগইন বাটনে ক্লিক করুন। অ্যাকাউন্ট না থাকলে সাইন আপ বাটনে ক্লিক করুন। পাসওয়ার্ড ভুলে গেলে ফরগট পাসওয়ার্ড নির্বাচন করে নির্দেশনা অনুসরণ করুন।"
  }} />

      <div style={styles.card} id="read-aloud-login"></div>
        <div style={styles.iconCircle}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3.5a8.5 8.5 0 0 0-8.5 8.5v1a2 2 0 0 0 2 2H7v-5H5.8A6.5 6.5 0 0 1 12 5.5a6.5 6.5 0 0 1 6.2 4.5H17v5h1.5a2 2 0 0 0 2-2v-1A8.5 8.5 0 0 0 12 3.5Z"
              fill="currentColor"
            />
            <path
              d="M9 19h6a3 3 0 0 0 3-3v-1.5h-2V16a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-1.5H6V16a3 3 0 0 0 3 3Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue to ImuniX</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label htmlFor="login-email" style={styles.label}>
              Email address
            </label>
            <div style={styles.inputWrapper}>
              <svg
                style={styles.inputIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                style={{ ...styles.input, paddingLeft: "45px" }}
                required
              />
            </div>
          </div>

          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label htmlFor="login-password" style={styles.label}>
                Password
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                style={styles.forgotButton}
              >
                Forgot password?
              </button>
            </div>

            <div style={styles.inputWrapper}>
              <svg
                style={styles.inputIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                style={{ ...styles.input, paddingLeft: "45px", paddingRight: "48px" }}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                style={styles.eyeButton}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 4.3A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a17.5 17.5 0 0 1-3.1 4.4" />
                    <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3 8 10 8a9.9 9.9 0 0 0 4-.8" />
                  </svg>
                ) : (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message && (
          <p
            style={{
              ...styles.message,
              color: message.startsWith("Login successful") ? "#15803d" : "#dc2626",
            }}
            role="alert"
          >
            {message}
          </p>
        )}

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>New to ImuniX?</span>
          <span style={styles.dividerLine} />
        </div>

        <button type="button" onClick={onSignUp} style={styles.signupButton}>
          Create an account
        </button>

        <button type="button" onClick={onBack} style={styles.backButton}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "680px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "28px 16px",
    background: "linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)",
    borderRadius: "16px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    padding: "40px 42px 32px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 18px 50px rgba(30, 60, 136, 0.14)",
    border: "1px solid #e8eef8",
    boxSizing: "border-box",
  },
  iconCircle: {
    width: "58px",
    height: "58px",
    margin: "0 auto 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1f3c88, #315ec8)",
    color: "#ffffff",
    boxShadow: "0 10px 22px rgba(31, 60, 136, 0.24)",
  },
  title: {
    textAlign: "center",
    margin: "0 0 7px",
    color: "#172554",
    fontSize: "30px",
    fontWeight: "800",
    letterSpacing: "-0.7px",
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
    margin: "0 0 30px",
  },
  field: {
    marginBottom: "21px",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "8px",
  },
  label: {
    display: "block",
    color: "#334155",
    fontSize: "14px",
    fontWeight: "700",
  },
  forgotButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    color: "#1f3c88",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
  inputIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    pointerEvents: "none",
    zIndex: 1,
  },
  input: {
    width: "100%",
    height: "50px",
    padding: "0 14px",
    border: "1px solid #d7dfeb",
    borderRadius: "10px",
    boxSizing: "border-box",
    backgroundColor: "#f8fafc",
    color: "#172033",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
  },
  eyeButton: {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    padding: 0,
  },
  button: {
    width: "100%",
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #1f3c88, #315ec8)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(31, 60, 136, 0.22)",
  },
  arrow: {
    fontSize: "20px",
    lineHeight: 1,
  },
  message: {
    textAlign: "center",
    margin: "15px 0 0",
    fontSize: "13px",
    fontWeight: "600",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "27px 0 17px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e2e8f0",
  },
  dividerText: {
    color: "#94a3b8",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  signupButton: {
    width: "100%",
    height: "46px",
    border: "1px solid #cbd7ec",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#1f3c88",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  backButton: {
    display: "block",
    margin: "16px auto 0",
    padding: "5px 10px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "13px",
    cursor: "pointer",
  },
};

export default Login;
