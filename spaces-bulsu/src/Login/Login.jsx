import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBackground from "../assets/backgroundlogin.png";
import LoginNav from "../Components/LoginNav/LoginNav";
import "./login.css";

export default function Login() {
  const [selectedRole, setSelectedRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSignIn = () => {
    switch (selectedRole) {
      case "Local Registrar":
        navigate("/local-registrar");
        break;
      case "Clerk":
        navigate("/clerk");
        break;
      case "Department Head":
        navigate("/department-head");
        break;
      case "Faculty":
        navigate("/faculty");
        break;
      default:
        navigate("/");
    }
  };

  const roles = [
    {
      name: "Department Head",
      icon: "fa-user-tie",
    },
    {
      name: "Local Registrar",
      icon: "fa-building",
    },
    {
      name: "Clerk",
      icon: "fa-clipboard",
    },
    {
      name: "Faculty",
      icon: "fa-user",
    },
  ];

  return (
    <>
      <LoginNav activePage="login" />

      <div className="login-page-shell">
        <div
          className="login-hero"
          style={{
            backgroundImage: `linear-gradient(
              rgba(8,16,31,.75),
              rgba(8,16,31,.85)
            ), url(${heroBackground})`,
          }}
        >
          <div className="hero-content">
            <h1>Smarter Classrooms. Better Scheduling.</h1>

            <p className="hero-copy">
              Optimize university resources with the FIREFOX smart classroom
              scheduling and room utilization management system.
            </p>

            <div className="hero-features">
              <div className="feature-item">
                <i className="fa-regular fa-calendar"></i>
                <span>Real-Time Scheduling</span>
              </div>

              <div className="feature-item">
                <i className="fa-solid fa-chart-column"></i>
                <span>Resource Optimization</span>
              </div>

              <div className="feature-item">
                <i className="fa-solid fa-shield-halved"></i>
                <span>Secure & Reliable</span>
              </div>
            </div>
          </div>
        </div>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-card-header">
              <div className="card-icon">
                <i className="fa-solid fa-calendar-days"></i>
              </div>

              <div>
                <h2>University Portal</h2>

                <p className="card-subtitle">
                  Sign in to access the classroom scheduling system.
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>Select Your Role</label>

              <div className="role-selector">
                {roles.map((role) => (
                  <button
                    key={role.name}
                    className={`role-btn ${
                      selectedRole === role.name ? "active" : ""
                    }`}
                    onClick={() => setSelectedRole(role.name)}
                  >
                    <i className={`fa-solid ${role.icon}`}></i>
                    <span>{role.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>University ID or Email</label>

              <div className="input-with-icon">
                <i className="fa-solid fa-user input-icon"></i>
                <input
                  type="email"
                  placeholder="Enter your ID / Email"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>

              <div className="input-with-icon">
                <i className="fa-solid fa-lock input-icon"></i>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
                  ></i>
                </button>
              </div>
            </div>

            <div className="form-actions-row">
              <label className="checkbox-label">
                <input type="checkbox" />
                Remember this device
              </label>

              <button className="link-button">
                Forgot Password?
              </button>
            </div>

            <button
              type="button"
              className="sign-in-btn"
              onClick={handleSignIn}
            >
              Sign In
              <i className="fa-solid fa-arrow-right"></i>
            </button>

            <div className="support-text">
              Need help? <span>Contact Support</span>
            </div>
          </div>
        </section>

      </div>
      <footer className="login-footer">
      <div className="footer-left">
        <i className="fa-solid fa-building-columns footer-left-icon"></i>
        <span>
          © 2026 Firefox - Smart Classroom and Room Utilization Management
          System. All rights reserved.
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