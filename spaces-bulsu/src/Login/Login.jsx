import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
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

  // ─── Role dropdown ─────────────────────────────────────────────────
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  // ─── Info modal (Privacy Policy / Terms / Accessibility / Contact Support / FAQs) ─
  const [activeModal, setActiveModal] = useState(null); // null | "privacy" | "terms" | "accessibility" | "support" | "faq"
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const FAQ_ITEMS = [
    {
      question: "Ano ang SpaceS CICT?",
      answer:
        "Ang SpaceS CICT ay isang web at mobile-based platform para sa classroom allocation at scheduling ng College of Information and Communications Technology (CICT) sa Bulacan State University. Pinapalitan nito ang manual, meeting-based na proseso ng pag-schedule gamit ang isang centralized system kung saan makikita ang lahat ng room schedules, reservations, at conflicts sa iisang lugar.",
    },
    {
      question: "Sino ang pwedeng gumawa ng account sa system?",
      answer:
        "Ang Department Head lang ang may access na gumawa ng user accounts para sa Local Registrar, Clerk, at Faculty Members. Kapag nagawa na ang account, automatic na ipapadala ang temporary login credentials sa registered email address ng user.",
    },
    {
      question: "Nakalimutan ko ang password ko, ano ang gagawin ko?",
      answer:
        "I-click lang ang 'Forgot Password?' sa login page. Makakatanggap ka ng password reset link sa iyong registered email address na pwede mong gamitin para mag-set ng bagong password.",
    },
    {
      question: "Bakit naka-block ang account ko?",
      answer:
        "Awtomatikong ma-bblock ang account pagkatapos ng 5 sunod-sunod na maling login attempts, para sa seguridad. Sa ika-3 attempt, may babalang notification ka na. Kung na-block na ang account mo, kontakin ang Department Head para ma-reactivate ito.",
    },
    {
      question: "Paano mag-request ng room reservation?",
      answer:
        "Bilang Faculty, pumunta sa Reservations page at pindutin ang '+' button. Punan ang course title, purpose, petsa, at oras ng gagamitin — automatic na magpapakita ang system ng mga available rooms na tugma sa iyong kailangan.",
    },
    {
      question: "Paano ko malalaman kung available ang isang room?",
      answer:
        "Makikita mo ang real-time status ng bawat classroom (Available, Occupied, o Under Maintenance) sa Rooms page. Pwede mo ring i-scan ang QR code na nakadikit sa pinto ng bawat room para makita agad ang current at upcoming schedule nito, kahit hindi ka naka-login.",
    },
    {
      question: "Ano ang gagawin ko kung hindi ko na gagamitin ang assigned room ko?",
      answer:
        "Sa Schedule page, piliin ang klase o booking na gusto mong i-release, bigyan ng dahilan (halimbawa: examination o class suspension), at kumpirmahin. Awtomatikong mano-notify ang Department Head at Clerk para maibalik na available ang room para sa ibang users.",
    },
    {
      question: "Sino ang makokontak ko kung may problema ako sa system?",
      answer:
        "Pwede mong i-click ang 'Contact Support' sa ibaba ng login form para makita ang aming official email addresses, o direktang mag-email sa spaces-bulsu@outlook.com o spacescict@gmail.com.",
    },
  ];

  useEffect(() => {
    const savedEmail = localStorage.getItem("login_email");
    const savedRole = localStorage.getItem("login_role");
    if (savedEmail) setEmail(savedEmail);
    if (savedRole) setSelectedRole(savedRole);
    if (savedEmail || savedRole) setRememberMe(true);
  }, []);

  // Close modal with ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setActiveModal(null);
        setRoleDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset the open FAQ item whenever the modal changes
  useEffect(() => {
    setOpenFaqIndex(null);
  }, [activeModal]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSignIn();
    }
  };

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

  // ─── Helper: notify all Department Heads ──────────────────────────────
  const notifyDepartmentHeads = async (title, message, type = "login-attempt") => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "Department Head"));
      const snap = await getDocs(q);
      const heads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      for (const head of heads) {
        await addDoc(collection(db, "notifications"), {
          userId: head.id,
          ownerType: "department-head",
          title,
          message,
          type,
          unread: true,
          archived: false,
          badge: "ALERT",
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Failed to notify department heads:", err);
    }
  };

  // ─── Helper: log activity ──────────────────────────────────────────────
  const logActivity = async ({ userId, user, role, action, actionType, target, status, details }) => {
    try {
      await addDoc(collection(db, "activityLogs"), {
        userId,
        user,
        role,
        action,
        actionType,
        target,
        status,
        details: details || {},
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Activity log error:", err);
    }
  };

  // ─── Main sign-in logic ────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!selectedRole || !email || !password) {
      showToast("error", "Input Required", "Please fill all fields.");
      return;
    }

    setLoading(true);
    showToast("loading", "Signing In", "Please wait while we verify your account.");

    // We'll track attempts in this variable so we can conditionally show toasts
    let attempts = 0;
    let userData = null;
    let uid = null;
    let fullName = "";

    try {
      // ─── 1. Find user by email ──────────────────────────────────────
      const userQuery = query(collection(db, "users"), where("email", "==", email));
      const userSnap = await getDocs(userQuery);

      if (userSnap.empty) {
        showToast("error", "Account Not Found", "No account exists with this email.");
        setLoading(false);
        return;
      }

      const userDoc = userSnap.docs[0];
      uid = userDoc.id;
      userData = userDoc.data();
      fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || email;

      // ─── 2. Check if account is blocked ─────────────────────────────
      if (userData.status === "Blocked") {
        showToast(
          "error",
          "Account Blocked",
          "Your account has been blocked due to multiple failed login attempts. Please contact the Department Head for assistance."
        );
        setLoading(false);
        return;
      }

      // ─── 3. Check if manually disabled ──────────────────────────────
      if (userData.status === "Disabled") {
        showToast("error", "Account Disabled", "Your account is disabled.");
        setLoading(false);
        return;
      }

      // ─── 4. Attempt Firebase sign-in ────────────────────────────────
      await signInWithEmailAndPassword(auth, email, password);

      // ─── 5. Success – reset attempts ────────────────────────────────
      if (userData.loginAttempts && userData.loginAttempts > 0) {
        await updateDoc(doc(db, "users", uid), { loginAttempts: 0 });
      }

      // ─── 6. Role check ──────────────────────────────────────────────
      if (userData.role !== selectedRole) {
        await auth.signOut();
        showToast("error", "Role Mismatch", `Not registered as ${selectedRole}`);
        setLoading(false);
        return;
      }

      // ─── 7. Proceed to dashboard ────────────────────────────────────
      setRedirecting(true);
      showToast("success", "Login Successful", `Welcome ${userData.role}!`);

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
      // ─── LOGIN FAILED ──────────────────────────────────────────────
      console.error("Login error:", err);

      // Map Firebase auth errors
      const MSG = {
        "auth/user-not-found": "No account found.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email format.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/invalid-credential": "Invalid credentials.",
      };
      const errorMessage = MSG[err.code] || "Login failed. Please try again.";

      // ─── Track failed attempts (only if user exists) ──────────────
      try {
        // Re‑fetch user if we don't have it (safety)
        let currentUserData = userData;
        let currentUid = uid;
        let currentFullName = fullName;

        if (!currentUserData) {
          const userQuery = query(collection(db, "users"), where("email", "==", email));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            const userDoc = userSnap.docs[0];
            currentUid = userDoc.id;
            currentUserData = userDoc.data();
            currentFullName = `${currentUserData.firstName || ""} ${currentUserData.lastName || ""}`.trim() || email;
          }
        }

        if (currentUserData && currentUid) {
          // Get current attempts
          attempts = (currentUserData.loginAttempts || 0) + 1;

          // Update attempts in Firestore
          await updateDoc(doc(db, "users", currentUid), {
            loginAttempts: attempts,
            lastAttempt: serverTimestamp(),
          });

          // ── 3 attempts – warning ──
          if (attempts === 3) {
            showToast("error", "Multiple Failed Attempts",
              `You have 3 failed login attempts. Your account will be blocked after 5 attempts.`);
            // Notify Department Heads
            await notifyDepartmentHeads(
              "⚠️ Failed Login Attempts",
              `${currentFullName} (${email}) has ${attempts} failed login attempts.`,
              "login-warning"
            );
            await logActivity({
              userId: currentUid,
              user: currentFullName,
              role: currentUserData.role || "Unknown",
              action: "Failed Login Attempt",
              actionType: "warning",
              target: email,
              status: "WARNING",
              details: { attempts, reason: "3 failed attempts" },
            });
          }

          // ── 5 attempts – block ──
          if (attempts >= 5) {
            await updateDoc(doc(db, "users", currentUid), {
              status: "Blocked",
              blockedAt: serverTimestamp(),
            });

            showToast(
              "error",
              "Account Blocked",
              "Your account has been blocked due to 5 failed login attempts. Please contact the Department Head to reactivate."
            );

            await notifyDepartmentHeads(
              "🚫 Account Blocked",
              `${currentFullName} (${email}) has been blocked due to 5 failed login attempts.`,
              "account-blocked"
            );
            await logActivity({
              userId: currentUid,
              user: currentFullName,
              role: currentUserData.role || "Unknown",
              action: "Account Blocked",
              actionType: "failed",
              target: email,
              status: "BLOCKED",
              details: { attempts, reason: "5 failed attempts" },
            });
          } else if (attempts === 4) {
            // ── 4 attempts – warning ──
            showToast("error", "Warning", "One more failed attempt will block your account.");
          } else {
            // 1st or 2nd attempt – show generic error
            showToast("error", "Login Failed", errorMessage);
          }
        } else {
          // User not found – show generic error
          showToast("error", "Login Failed", errorMessage);
        }
      } catch (trackErr) {
        console.error("Failed to track login attempts:", trackErr);
        // Still show the error toast so the user gets feedback
        showToast("error", "Login Failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoginNav
        activePage="login"
        onAboutClick={() => setActiveModal("about")}
        onSupportClick={() => setActiveModal("faq")}
        onContactClick={() => setActiveModal("support")}
      />
      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
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
              Optimize university resources with SpaceS CICT.
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
          <div className="login-card"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleSignIn();
              }
            }}
          >
            <div className="login-card-header">
              <div className="card-icon logo-icon">
                <img src={logo} alt="Logo" />
              </div>
              <div>
                <h2>SpaceS CICT</h2>
                <p className="card-subtitle">
                  Sign in to access the system.
                </p>
              </div>
            </div>

            {/* ROLE */}
            <div className="form-group">
              <label>Select Role</label>
              <div className="role-dropdown" ref={roleDropdownRef}>
                <button
                  type="button"
                  className={`role-dropdown-trigger ${selectedRole ? "has-value" : ""} ${roleDropdownOpen ? "open" : ""}`}
                  onClick={() => setRoleDropdownOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={roleDropdownOpen}
                >
                  <i
                    className={`fa-solid ${
                      selectedRole
                        ? roles.find((r) => r.name === selectedRole)?.icon
                        : "fa-user-shield"
                    } role-dropdown-icon`}
                  />
                  <span className="role-dropdown-value">
                    {selectedRole || "Select your role"}
                  </span>
                  <i className="fa-solid fa-chevron-down role-dropdown-chevron" />
                </button>

                {roleDropdownOpen && (
                  <div className="role-dropdown-menu" role="listbox">
                    {roles.map((role) => (
                      <button
                        key={role.name}
                        type="button"
                        role="option"
                        aria-selected={selectedRole === role.name}
                        className={`role-dropdown-option ${
                          selectedRole === role.name ? "selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedRole(role.name);
                          setRoleDropdownOpen(false);
                        }}
                      >
                        <i className={`fa-solid ${role.icon}`} />
                        <span>{role.name}</span>
                        {selectedRole === role.name && (
                          <i className="fa-solid fa-check option-check" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
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
                  onKeyDown={handleKeyDown}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    e.target.setAttribute("data-filled", e.target.value ? "true" : "");
                  }}
                  onKeyDown={handleKeyDown}
                  required
                />
                <label>Password</label>
                <button
                  type="button"
                  className="password-action"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
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
              Need help?{" "}
              <span onClick={() => setActiveModal("support")}>Contact Support</span>
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
          <button className="footer-link" onClick={() => setActiveModal("privacy")}>
            Privacy Policy
          </button>
          <button className="footer-link" onClick={() => setActiveModal("terms")}>
            Terms of Use
          </button>
          <button className="footer-link" onClick={() => setActiveModal("accessibility")}>
            Accessibility
          </button>
          <button className="footer-link" onClick={() => setActiveModal("faq")}>
            FAQs
          </button>
        </div>
      </footer>

      {/* ══════════════════════ INFO MODAL (Privacy / Terms / Accessibility / Support) ══════════════════════ */}
      {activeModal && (
        <div className="info-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="info-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="info-modal-close" onClick={() => setActiveModal(null)}>
              <i className="fa-solid fa-xmark" />
            </button>

            {/* ─── ABOUT ─── */}
            {activeModal === "about" && (
              <>
                <div className="info-modal-icon">
                  <i className="fa-solid fa-building-columns" />
                </div>
                <h2>About SpaceS CICT</h2>
                <p className="info-modal-subtitle">
                  A Web and Mobile-Based Smart Platform for Allocation of Classrooms and Efficient
                  Scheduling.
                </p>
                <div className="info-modal-body">
                  <p>
                    SpaceS CICT was developed for the College of Information and Communications
                    Technology (CICT) at Bulacan State University to replace the manual, meeting
                    and group chat-dependent process previously used for classroom scheduling.
                    Preparing a semester's timetable used to take 2 to 3 weeks of meetings between
                    the dean, program chairs, and registrar — with SpaceS CICT, schedules, room
                    activities, and reservations are all managed in one centralized platform.
                  </p>

                  <h4>What It Does</h4>
                  <ul>
                    <li>Detects double bookings and scheduling conflicts automatically, with smart room suggestions.</li>
                    <li>Lets the Local Registrar bulk-upload official class schedules via Excel or AI-assisted PDF extraction.</li>
                    <li>Gives Faculty a self-service way to check room availability, request rooms, and release unused ones.</li>
                    <li>Lets Clerks handle walk-in and online reservations with real-time room status.</li>
                    <li>Provides QR codes on classroom doors so anyone can check a room's schedule without logging in.</li>
                  </ul>

                  <h4>Who It's For</h4>
                  <p>
                    The platform serves four main roles — Department Head, Local Registrar, Clerk,
                    and Faculty Members — covering the 22 classrooms of CICT within Pimentel Hall,
                    supporting the BSIT, BSIS, and BLIS programs.
                  </p>
                </div>
              </>
            )}

            {/* ─── PRIVACY POLICY ─── */}
            {activeModal === "privacy" && (
              <>
                <div className="info-modal-icon">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <h2>Privacy Policy</h2>
                <p className="info-modal-subtitle">
                  How SpaceS CICT collects, uses, and protects your information.
                </p>
                <div className="info-modal-body">
                  <p>
                    SpaceS CICT is a classroom allocation and scheduling platform built for the
                    College of Information and Communications Technology (CICT) at Bulacan State
                    University. We are committed to protecting the personal information of our
                    Department Heads, Local Registrars, Clerks, and Faculty Members in accordance
                    with Republic Act No. 10173, the Data Privacy Act of 2012.
                  </p>

                  <h4>Information We Collect</h4>
                  <ul>
                    <li>Account details such as name, email address, and assigned role.</li>
                    <li>Login activity and system usage logs for security and accountability.</li>
                    <li>Class schedules, room reservations, and related academic records.</li>
                  </ul>

                  <h4>How We Use Your Information</h4>
                  <ul>
                    <li>To authenticate accounts and provide role-based access to the system.</li>
                    <li>To manage classroom scheduling, reservations, and conflict resolution.</li>
                    <li>To send notifications about approvals, denials, and schedule changes.</li>
                  </ul>

                  <h4>Data Protection</h4>
                  <p>
                    All account and scheduling data is stored securely and is accessible only to
                    authorized personnel. Information is used strictly for the operational purposes
                    of classroom allocation and scheduling within CICT and will not be shared with
                    unauthorized third parties.
                  </p>
                </div>
              </>
            )}

            {/* ─── TERMS OF USE ─── */}
            {activeModal === "terms" && (
              <>
                <div className="info-modal-icon">
                  <i className="fa-solid fa-file-signature" />
                </div>
                <h2>Terms of Use</h2>
                <p className="info-modal-subtitle">
                  Please read these terms before using SpaceS CICT.
                </p>
                <div className="info-modal-body">
                  <p>
                    By logging in and using SpaceS CICT, you agree to use the platform responsibly
                    and only for its intended purpose: managing classroom allocation, scheduling,
                    and reservations for the College of Information and Communications Technology.
                  </p>

                  <h4>Account Responsibility</h4>
                  <ul>
                    <li>Accounts are created and managed by the Department Head and must not be shared with other individuals.</li>
                    <li>Users are responsible for keeping their login credentials confidential.</li>
                    <li>Repeated failed login attempts may result in a temporarily blocked account for security purposes.</li>
                  </ul>

                  <h4>Acceptable Use</h4>
                  <ul>
                    <li>Room reservations and schedule changes must reflect genuine academic or institutional needs.</li>
                    <li>Users must not attempt to bypass conflict detection or falsify reservation details.</li>
                    <li>Access is limited to the features available to the user's assigned role.</li>
                  </ul>

                  <h4>Availability</h4>
                  <p>
                    While the system is designed for reliable, real-time use, scheduled maintenance
                    or unforeseen issues may occasionally affect availability. Users will be
                    notified of major changes or disruptions when possible.
                  </p>
                </div>
              </>
            )}

            {/* ─── ACCESSIBILITY ─── */}
            {activeModal === "accessibility" && (
              <>
                <div className="info-modal-icon">
                  <i className="fa-solid fa-universal-access" />
                </div>
                <h2>Accessibility</h2>
                <p className="info-modal-subtitle">
                  Our commitment to a usable experience for every CICT user.
                </p>
                <div className="info-modal-body">
                  <p>
                    SpaceS CICT is designed as a responsive web and mobile platform so that
                    Department Heads, Local Registrars, Clerks, and Faculty Members can access
                    scheduling and reservation features comfortably across desktop and mobile
                    devices.
                  </p>

                  <h4>Design Considerations</h4>
                  <ul>
                    <li>Clear typography, consistent color contrast, and readable layouts across pages.</li>
                    <li>Role-based interfaces that only display features relevant to each user, reducing clutter.</li>
                    <li>Mobile-optimized views for Faculty to check schedules and submit requests on the go.</li>
                  </ul>

                  <h4>Ongoing Improvements</h4>
                  <p>
                    We continue to refine the interface based on feedback gathered from actual CICT
                    users during system testing and evaluation. If you encounter any accessibility
                    issue while using SpaceS CICT, please let us know through Contact Support so we
                    can address it.
                  </p>
                </div>
              </>
            )}

            {/* ─── CONTACT SUPPORT ─── */}
            {activeModal === "support" && (
              <>
                <div className="info-modal-icon">
                  <i className="fa-solid fa-headset" />
                </div>
                <h2>Contact Support</h2>
                <p className="info-modal-subtitle">
                  Need help signing in or using SpaceS CICT? Reach out through either email below.
                </p>
                <div className="contact-list">
                  <a href="mailto:spaces-bulsu@outlook.com" className="contact-item">
                    <i className="fa-brands fa-microsoft" />
                    <div>
                      <span className="contact-label">Outlook</span>
                      <span className="contact-value">spaces-bulsu@outlook.com</span>
                    </div>
                  </a>
                  <a href="mailto:spacescict@gmail.com" className="contact-item">
                    <i className="fa-brands fa-google" />
                    <div>
                      <span className="contact-label">Gmail</span>
                      <span className="contact-value">spacescict@gmail.com</span>
                    </div>
                  </a>
                </div>
                <button
                  type="button"
                  className="faq-jump-link"
                  onClick={() => setActiveModal("faq")}
                >
                  Check the FAQs first <i className="fa-solid fa-arrow-right" />
                </button>
              </>
            )}

            {/* ─── FAQs ─── */}
            {activeModal === "faq" && (
              <>
                <div className="info-modal-icon">
                  <i className="fa-solid fa-circle-question" />
                </div>
                <h2>Frequently Asked Questions</h2>
                <p className="info-modal-subtitle">
                  Mabilisang sagot sa mga karaniwang tanong tungkol sa SpaceS CICT.
                </p>
                <div className="faq-list">
                  {FAQ_ITEMS.map((item, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div
                        key={index}
                        className={`faq-item ${isOpen ? "open" : ""}`}
                      >
                        <button
                          type="button"
                          className="faq-question"
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        >
                          <span>{item.question}</span>
                          <i className="fa-solid fa-chevron-down faq-chevron" />
                        </button>
                        <div className="faq-answer-wrapper">
                          <p className="faq-answer">{item.answer}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}