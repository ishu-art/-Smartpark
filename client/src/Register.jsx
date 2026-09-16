import { useState } from "react";

function Register({
  onBack,
  onLogin,
  onRegisterSuccess
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!name || !email || !password) {
      setError("Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      // Yahan asli backend ko call kar rahe hain
      const response = await fetch(
        "http://localhost:5000/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("Registration successful! Please login.");

      setTimeout(() => {
        onRegisterSuccess();
      }, 800);

    } catch (err) {
      console.error("Register error:", err);
      setError("Server se connection nahi ho raha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-visual">
        <div className="login-visual-content">
          <div className="logo">SmartPark</div>
          <p>Join as a driver to book slots, or as a manager to run a lot.</p>
        </div>
      </div>

      <div className="login-panel">

      <div className="login-container">

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <h1>Create Account</h1>

        <p>Register for SmartPark</p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label>Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>I am a</label>

            <div className="role-toggle">
              <button
                type="button"
                className={`role-option ${
                  role === "user" ? "role-option-active" : ""
                }`}
                onClick={() => setRole("user")}
              >
                Driver
              </button>

              <button
                type="button"
                className={`role-option ${
                  role === "admin" ? "role-option-active" : ""
                }`}
                onClick={() => setRole("admin")}
              >
                Manager
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>

        </form>

        <div className="register-link">
          Already have an account?

          <button
            type="button"
            className="link-button"
            onClick={onLogin}
          >
            Login
          </button>
        </div>

      </div>

      </div>

    </div>
  );
}

export default Register;