import { useState } from "react";

function Login({ onLoginSuccess, onRegister, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");

    if (!email || !password) {
      setMessage("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
  "http://localhost:5000/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Invalid email or password");
        return;
      }

      // Save JWT token
      localStorage.setItem("token", data.token);

      // Save user data
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login successful!");

      // Send logged-in user to App.jsx
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

    } catch (error) {
      console.error("Login error:", error);
      setMessage("Server se connection nahi ho raha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-visual">
        <div className="login-visual-content">
          <div className="logo">SmartPark</div>
          <p>Reserve a verified parking slot before you even leave home.</p>
        </div>
      </div>

      <div className="login-panel">

      <div className="login-card">

        <h1>SmartPark</h1>

        <h2>Login</h2>

        <p className="login-subtitle">
          Login to reserve your parking slot
        </p>

        <form onSubmit={handleLogin}>

          {/* EMAIL */}

          <div className="form-group">

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

          </div>

          {/* PASSWORD */}

          <div className="form-group">

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

          </div>

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* MESSAGE */}

        {message && (
          <p className="login-message">
            {message}
          </p>
        )}

        {/* REGISTER */}

        <div className="register-link">

          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            className="link-button"
            onClick={onRegister}
          >
            Register
          </button>

        </div>

        {/* BACK */}

        <button
          type="button"
          className="link-button"
          onClick={onBack}
        >
          ← Back to Home
        </button>

      </div>

      </div>

    </div>
  );
}

export default Login;