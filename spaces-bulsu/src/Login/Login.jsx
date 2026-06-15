import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import Toast from "../Popup/Toast/Toast";
import heroBackground from "../assets/backgroundlogin.png";
import LoginNav from "../Components/LoginNav/LoginNav";
import "./login.css";
import logo from "../assets/logo.png";

export default function Login() {
  const [selectedRole, setSelectedRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
  const savedEmail = localStorage.getItem("login_email");
  const savedRole = localStorage.getItem("login_role");

  if (savedEmail) setEmail(savedEmail);
  if (savedRole) setSelectedRole(savedRole);
  if (savedEmail || savedRole) setRememberMe(true);
}, []);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

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

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });

    if (type !== "loading") {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    }
  };

  const handleSignIn = async () => {
    if (!selectedRole || !email || !password) {
      showToast("error", "Input Required", "Please fill all fields.");
      return;
    }
   
    setLoading(true);

    showToast(
      "loading",
      "Signing In",
      "Please wait while we verify your account."
    );

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
        showToast("error", "Account Not Found", "Contact admin.");
        setLoading(false);
        return;
      }

      const userData = snap.data();

      if (userData.role !== selectedRole) {
        await auth.signOut();
        showToast(
          "error",
          "Role Mismatch",
          `Not registered as ${selectedRole}`
        );
        setLoading(false);
        return;
      }

      if (userData.status === "Disabled") {
        await auth.signOut();
        showToast(
          "error",
          "Account Disabled",
          "Your account is disabled."
        );
        setLoading(false);
        return;
      }

      // ✅ LOADING SCREEN
      setRedirecting(true);

      showToast(
        "success",
        "Login Successful",
        `Welcome ${userData.role}!`
      );

       if (rememberMe) {
        localStorage.setItem("login_email", email);
        localStorage.setItem("login_role", selectedRole);
      } else {
        localStorage.removeItem("login_email");
        localStorage.removeItem("login_role");
      }

      setTimeout(() => {
        setRedirecting(false);
        navigate(ROLE_ROUTES[userData.role] ?? "/");
      }, 2000);
    } catch (err) {
      const MSG = {
        "auth/user-not-found": "No account found.",
        "auth/wrong-password": "Wrong password.",
        "auth/invalid-email": "Invalid email.",
        "auth/too-many-requests": "Too many attempts.",
        "auth/invalid-credential": "Invalid credentials.",
      };

      showToast(
        "error",
        "Login Failed",
        MSG[err.code] || "Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoginNav activePage="login" />

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() =>
          setToast((prev) => ({ ...prev, show: false }))
        }
      />

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
              Optimize university resources with FIREFOX system.
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
              <div className="card-icon logo-icon">
                <img src={logo} alt="Logo" />
              </div>

              <div>
                <h2>University Portal</h2>
                <p className="card-subtitle">
                  Sign in to access the system.
                </p>
              </div>
            </div>

            {/* ROLE */}
            <div className="form-group">
              <label>Select Role</label>

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
          
            <div className="form-group float-group">
              <div className="float-input">
                <i className="fa-solid fa-user input-icon" />
                <input
                  type="email"
                  value={email}
                  placeholder=" "
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <label>Email or University ID</label>
              </div>
            </div>

            {/* PASSWORD */}
            <div className="form-group float-group">
              <div className="float-input">
                <i className="fa-solid fa-lock input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder=" "
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <label>Password</label>
                
                <button
                  type="button"
                  className="password-action"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <i
                    className={`fa-solid ${
                      showPassword ? "fa-eye-slash" : "fa-eye"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="form-actions-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember this device
              </label>

              <button
                className="link-button"
                onClick={() => navigate("/reset-password")}
              >
                Forgot Password?
              </button>
            </div>

            {/* SIGN IN */}
            <button
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

      {/* LOADING OVERLAY */}
      {redirecting && (
        <div className="login-loading-screen">
          <div className="loading-card">
            <div className="spinner" />
            <h2>Signing you in...</h2>
            <p>Please wait while we prepare your dashboard</p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="login-footer">
        <div className="footer-left">
          <i className="fa-solid fa-building-columns" />
          <span>© 2026 SpaceS CICT </span>
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