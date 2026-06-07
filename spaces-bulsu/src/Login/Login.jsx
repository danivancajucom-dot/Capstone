import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import heroBackground from '../assets/backgroundlogin.png';
import LoginNav from '../Components/LoginNav/LoginNav';
import './login.css';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const navigate = useNavigate();

  const ROLE_ROUTES = {
    'Local Registrar': '/local-registrar',
    'Clerk':           '/clerk',
    'Department Head': '/department-head',
    'Faculty':         '/faculty',
  };

  const handleSignIn = async () => {
    setError('');

    if (!selectedRole) { setError('Please select your role.'); return; }
    if (!email)        { setError('Please enter your email.'); return; }
    if (!password)     { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      // Fetch user profile from Firestore to verify role
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        await auth.signOut();
        setError('Account not found. Contact your administrator.');
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

      if (userData.status === 'Disabled') {
        await auth.signOut();
        setError('Your account has been disabled. Contact your administrator.');
        setLoading(false);
        return;
      }

      // Role verified — navigate
      navigate(ROLE_ROUTES[userData.role] ?? '/');
    } catch (err) {
      const MSG = {
        'auth/user-not-found':   'No account found with this email.',
        'auth/wrong-password':   'Incorrect password.',
        'auth/invalid-email':    'Invalid email address.',
        'auth/too-many-requests':'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
      };
      setError(MSG[err.code] ?? 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSignIn();
  };

  return (
    <>
      <LoginNav activePage="login" />

      <div className="login-page-shell">
        <div
          className="login-hero"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(20,60,100,0.85) 0%, rgba(30,80,130,0.75) 100%), url(${heroBackground})`,
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
          <div className="login-card-header">
            <div className="card-icon">
              <i className="fa-solid fa-calendar-days" />
            </div>
            <div>
              <h2>University Portal</h2>
              <p className="card-subtitle">
                Secure access for campus scheduling and resource management.
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
              <i className="input-icon fa-solid fa-user" />
              <input
                type="email"
                placeholder="Enter your ID / Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <i className="input-icon fa-solid fa-lock" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          )}

          <button
            type="button"
            className="sign-in-btn"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
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
