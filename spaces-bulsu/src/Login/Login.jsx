import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroBackground from '../assets/backgroundlogin.png';
import LoginNav from '../Components/LoginNav/LoginNav';
import './login.css';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('Local Registrar');
  const navigate = useNavigate();

  const handleSignIn = () => {
    if (selectedRole === "Local Registrar") {
      navigate("/local-registrar");
    } else if (selectedRole === "Clerk") {
      navigate("/clerk");
    } else if (selectedRole === "Department Head") {
      navigate("/department-head");
    } else if (selectedRole === "Faculty") {
      navigate("/faculty");
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <LoginNav activePage="login" />

      <div className="login-page-shell">
        <div
          className="login-hero"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(20, 60, 100, 0.85) 0%, rgba(30, 80, 130, 0.75) 100%), url(${heroBackground})`,
          }}
        >
          <div className="hero-content">
            <h1>Smart Platform for Allocation of Classrooms and Efficient Scheduling</h1>
            <p className="hero-copy">
              Optimize university resources with the FIREFOX smart classroom scheduling system.
            </p>
          </div>
        </div>

        <section className="login-panel">
          <div className="login-card-header">
            <div className="card-icon">
              <i className="fa-solid fa-calendar-days"></i>
            </div>
            <div>
              <h2>University Portal</h2>
              <p className="card-subtitle">
                Secure access for campus scheduling and resource management.
              </p>
            </div>
          </div>

          <p className="section-label">Select Your Role</p>

          <div className="role-selector">
            {['Department Head', 'Local Registrar', 'Clerk', 'Faculty'].map(role => (
              <button
                key={role}
                type="button"
                className={`role-btn ${selectedRole === role ? 'active' : ''}`}
                onClick={() => setSelectedRole(role)}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label>University ID or Email</label>
            <div className="input-with-icon">
              <i className="input-icon fa-solid fa-user"></i>
              <input type="email" placeholder="Enter your ID / Email" />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <i className="input-icon fa-solid fa-lock"></i>
              <input type="password" placeholder="Enter your password" />
            </div>
          </div>

          <button type="button" className="sign-in-btn" onClick={handleSignIn}>
            Sign In
          </button>
        </section>
      </div>
    </>
  );
}