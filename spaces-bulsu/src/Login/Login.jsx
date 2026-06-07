import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

import heroBackground from "../assets/backgroundlogin.png";
import LoginNav from "../Components/LoginNav/LoginNav";
import "./login.css";

export default function Login() {
  const [selectedRole, setSelectedRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const ROLE_ROUTES = {
    "Local Registrar": "/local-registrar",
    Clerk: "/clerk",
    "Department Head": "/department-head",
    Faculty: "/faculty",
  };

  const roles = [
    { name: "Department Head", icon: "fa-user-tie" },
    { name: "Local Registrar", icon: "fa-building" },
    { name: "Clerk", icon: "fa-clipboard" },
    { name: "Faculty", icon: "fa-user" },
  ];

  const handleSignIn = async () => {
    setError("");

    if (!selectedRole) return setError("Please select your role.");
    if (!email) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = credential.user.uid;

      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
        await auth.signOut();
        setError("Account not found. Contact administrator.");
        setLoading(false);
        return;
      }

      const userData = snap.data();

      if (userData.role !== selectedRole) {
        await auth.signOut();
        setError(`This account is not registered as ${selectedRole}.`);
        setLoading(false);
        return;
      }

      if (userData.status === "Disabled") {
        await auth.signOut();
        setError("Your account has been disabled.");
        setLoading(false);
        return;
      }

      navigate(ROLE_ROUTES[userData.role] ?? "/");
    } catch (err) {
      const MSG = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/invalid-credential": "Invalid email or password.",
      };

      setError(MSG[err.code] || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoginNav activePage="login" />

      <div className="login-page-shell">
        {/* HERO SIDE */}
        <div
          className="login-hero"
          style={{
            backgroundImage: `
              linear-gradient(rgba(8,16,31,.75), rgba(8,16,31,.85)),
              url(${heroBackground})
            `,
          }}
        >
          <div className="hero-content">
            <h1>Smarter Classrooms. Better Scheduling.</h1>
            <p className="hero-copy">
              Optimize university resources with the FIREFOX smart classroom
              scheduling system.
            </p>

            <div className="hero-features">
              <div className="feature-item">
                <i className="fa-regular fa-calendar" />
                <span>Real-Time Scheduling</span>
              </div>

              <div className="feature-item">
                <i className="fa-solid fa-chart-column" />
                <span>Resource Optimization</span>
              </div>

              <div className="feature-item">
                <i className="fa-solid fa-shield-halved" />
                <span>Secure & Reliable</span>
              </div>
            </div>
          </div>
        </div>

        {/* LOGIN SIDE */}
        <section className="login-panel">
          <div className="login-card">
            <div className="login-card-header">
              <div className="card-icon">
                <i className="fa-solid fa-calendar-days" />
              </div>
              <div>
                <h2>University Portal</h2>
                <p className="card-subtitle">
                  Sign in to access the scheduling system.
                </p>
              </div>
            </div>

            {/* ROLE */}
            <div className="form-group">
              <label>Select Your Role</label>

              <div className="role-selector">
                {roles.map((role) => (
                  <button
                    key={role.name}
                    type="button"
                    className={`role-btn ${
                      selectedRole === role.name ? "active" : ""
                    }`}
                    onClick={() => setSelectedRole(role.name)}
                  >
                    <i className={`fa-solid ${role.icon}`} />
                    <span>{role.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* EMAIL */}
            <div className="form-group">
              <label>University ID or Email</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-user input-icon" />
                <input
                  type="email"
                  placeholder="Enter your ID / Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock input-icon" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="password-action"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i
                    className={`fa-solid ${
                      showPassword ? "fa-eye-slash" : "fa-eye"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && <div className="login-error">{error}</div>}

            {/* SIGN IN */}
            <button
              type="button"
              className="sign-in-btn"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
              <i className="fa-solid fa-arrow-right" />
            </button>

            <div className="support-text">
              Need help? <span>Contact Support</span>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="login-footer">
        <div className="footer-left">
          <i className="fa-solid fa-building-columns" />
          <span>
            © 2026 Firefox - Smart Classroom and Scheduling System
          </span>
        </div>

        <div className="footer-right">
          <button className="footer-link">Privacy Policy</button>
          <button className="footer-link">Terms of Use</button>
          <button className="footer-link">Accessibility</button>
        </div>
      </footer>
    </>
  );
}