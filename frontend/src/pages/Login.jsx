import React, { useState } from "react";

function Login({ onBack, onLoginSuccess, onSignUp }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Logging in...");

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

        setMessage(`Login successful. Welcome ${data.user.name}!`);

        // Go to Admin Dashboard after successful login
        onLoginSuccess();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not connect to server");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <h1 style={styles.title}>
          Welcome to ImuniX
        </h1>

        <p style={styles.subtitle}>
          Login to your account
        </p>

        <form onSubmit={handleSubmit}>

          <label style={styles.label}>
            Email
          </label>

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <label style={styles.label}>
            Password
          </label>

          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <div style={styles.forgotContainer}>
            <span style={styles.forgotPassword}>
              Forgot Password?
            </span>
          </div>

          <button
            type="submit"
            style={styles.button}
          >
            Login
          </button>

        </form>

        {message && (
          <p style={styles.message}>
            {message}
          </p>
        )}

        <p style={styles.signupText}>
          Don't have an account?{" "}
          <span
            style={styles.signup}
            onClick={onSignUp}
          >
            Sign Up
          </span>
        </p>

        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back to Home
        </button>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f7fb",
  },

  card: {
    width: "380px",
    padding: "35px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },

  title: {
    textAlign: "center",
    marginBottom: "8px",
    color: "#1f3c88",
    fontSize: "32px",
    fontWeight: "800",
    letterSpacing: "-0.5px",
  },

  subtitle: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "15px",
    marginBottom: "28px",
    fontWeight: "400",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "18px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    boxSizing: "border-box",
  },

  forgotContainer: {
    textAlign: "center",
    marginTop: "-10px",
    marginBottom: "20px",
  },

  forgotPassword: {
    color: "#1f3c88",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1f3c88",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
  },

  message: {
    textAlign: "center",
    marginTop: "15px",
    color: "#1f3c88",
    fontSize: "14px",
  },

  signupText: {
    textAlign: "center",
    marginTop: "20px",
    color: "#666",
  },

  signup: {
    color: "#1f3c88",
    fontWeight: "bold",
    cursor: "pointer",
  },

  backButton: {
    width: "100%",
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "transparent",
    color: "#1f3c88",
    border: "none",
    fontSize: "14px",
    cursor: "pointer",
  },
};

export default Login;