import { useState } from "react";
import "./App.css";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import MyBookings from "./MyBookings";
import ManagerDashboard from "./ManagerDashboard";
import NotificationCenter from "./NotificationCenter";

function App() {
  const [page, setPage] = useState("home");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  // =========================
  // LOGIN SUCCESS
  // =========================

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setPage(
      loggedInUser?.role === "admin" ? "managerDashboard" : "dashboard"
    );
  };

  // =========================
  // REGISTER SUCCESS
  // =========================

  const handleRegisterSuccess = () => {
    // Registration ke baad direct dashboard nahi.
    // Pehle user login karega, jisse JWT token milega.
    setPage("login");
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setPage("home");
  };

  // =========================
  // LOGIN PAGE
  // =========================

  if (page === "login") {
    return (
      <>
        <NotificationCenter />
        <Login
          onBack={() => setPage("home")}
          onRegister={() => setPage("register")}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // =========================
  // REGISTER PAGE
  // =========================

  if (page === "register") {
    return (
      <>
        <NotificationCenter />
        <Register
          onBack={() => setPage("home")}
          onLogin={() => setPage("login")}
          onRegisterSuccess={handleRegisterSuccess}
        />
      </>
    );
  }

  // =========================
  // DASHBOARD PAGE (DRIVER)
  // =========================

  if (page === "dashboard") {
    return (
      <>
        <NotificationCenter />
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onViewBookings={() => setPage("bookings")}
        />
      </>
    );
  }

  // =========================
  // MY BOOKINGS PAGE (DRIVER)
  // =========================

  if (page === "bookings") {
    return (
      <>
        <NotificationCenter />
        <MyBookings
          user={user}
          onLogout={handleLogout}
          onBack={() => setPage("dashboard")}
        />
      </>
    );
  }

  // =========================
  // MANAGER DASHBOARD PAGE
  // =========================

  if (page === "managerDashboard") {
    return (
      <>
        <NotificationCenter />
        <ManagerDashboard
          user={user}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // =========================
  // HOME PAGE
  // =========================

  return (
    <div className="app">

      <NotificationCenter />

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">

        <div className="logo">
          SmartPark
        </div>

        <div className="nav-buttons">

          {user ? (
            <>
              <span className="welcome-text">
                Hi, {user.name}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    user.role === "admin"
                      ? "managerDashboard"
                      : "dashboard"
                  )
                }
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPage("login")}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => setPage("register")}
              >
                Register
              </button>
            </>
          )}

        </div>

      </nav>

      {/* ================= HERO ================= */}

      <section className="hero-section">

        <div className="hero-content">

          <div className="hero-small-title">
            SMART PARKING SYSTEM
          </div>

          <h1 className="hero-title">
            Find Your
            <br />

            <span>
              Perfect Parking
            </span>

            <br />

            Spot
          </h1>

          <p className="hero-description">
            Find available parking spaces, reserve your slot
            and park without the hassle.
          </p>

          <div className="hero-buttons">

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (user) {
                  setPage(
                    user.role === "admin"
                      ? "managerDashboard"
                      : "dashboard"
                  );
                } else {
                  setPage("login");
                }
              }}
            >
              {user ? "Find Parking" : "Get Started"}
            </button>

            {!user && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPage("register")}
              >
                Create Account
              </button>
            )}

          </div>

          <div className="hero-stats">

            <div className="hero-stat">
              <strong>40+</strong>
              <span>Parking Locations</span>
            </div>

            <div className="hero-stat">
              <strong>24/7</strong>
              <span>Live Availability</span>
            </div>

            <div className="hero-stat">
              <strong>Live</strong>
              <span>Slot Updates</span>
            </div>

          </div>

        </div>

      </section>

      {/* ================= FEATURES ================= */}

      <section className="features-section">

        <h2 className="section-title">
          Smart Parking
        </h2>

        <p className="section-description">
          Real-time parking availability and easy reservations.
        </p>

        <div className="features-container">

          <div className="feature-card">

            <div className="feature-icon">
              <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="19" cy="19" r="12" stroke="currentColor" strokeWidth="2.5" />
                <line x1="28" y1="28" x2="38" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <h3>
              100+ Parking Slots
            </h3>

            <p>
              Find available parking slots quickly
              and conveniently.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="22" cy="22" r="15" stroke="currentColor" strokeWidth="2.5" />
                <line x1="22" y1="13" x2="22" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="22" y1="22" x2="28" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <h3>
              24/7 Availability
            </h3>

            <p>
              Check parking availability anytime
              from anywhere.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="12" width="32" height="20" rx="2" stroke="currentColor" strokeWidth="2.5" />
                <line x1="6" y1="19" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" />
                <line x1="6" y1="25" x2="12" y2="25" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="26" cy="22" r="5" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>

            <h3>
              Easy Reservation
            </h3>

            <p>
              Reserve your parking slot with
              just a few clicks.
            </p>

          </div>

        </div>

      </section>

      {/* ================= HOW IT WORKS ================= */}

      <section className="steps-section">

        <h2 className="section-title">
          How It Works
        </h2>

        <p className="section-description">
          Three steps between you and a guaranteed spot.
        </p>

        <div className="steps-container">

          <div className="step-card">
            <span className="step-number">01</span>
            <h3>Search</h3>
            <p>Look up parking near your destination and filter by price or availability.</p>
          </div>

          <div className="step-card">
            <span className="step-number">02</span>
            <h3>Reserve</h3>
            <p>Pick an open slot, choose your time window and confirm your booking.</p>
          </div>

          <div className="step-card">
            <span className="step-number">03</span>
            <h3>Park</h3>
            <p>Drive in, park in your reserved slot, and cancel anytime if plans change.</p>
          </div>

        </div>

      </section>

      {/* ================= FOOTER ================= */}

      <footer className="site-footer">
        <div className="logo">SmartPark</div>
        <p>Smart parking, reserved in seconds.</p>
      </footer>

    </div>
  );
}

export default App;