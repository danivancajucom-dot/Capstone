import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./clerk-layout.css";
import { auth, db } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ClerkLayout() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout]             = useState(false);
  const [openReservations, setOpenReservations] = useState(false);
  const [loggingOut, setLoggingOut]             = useState(false);
  const [profile, setProfile]                   = useState({ firstName: "", lastName: "", role: "", photoUrl: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            firstName: d.firstName || "",
            lastName:  d.lastName  || "",
            role:      d.role      || "",
            photoUrl:  d.photoUrl  || "",
          });
        }
      });
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      setShowLogout(false);
      setLoggingOut(true);
      setTimeout(async () => {
        await signOut(auth);
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error(error);
      setLoggingOut(false);
    }
  };

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <>
      <div className="clerk-layout">

        {/* SIDEBAR */}
        <aside className="clerk-sidebar">

          <div className="clerk-logo">
            <img src="/SpaceSLogo.png" alt="SpaceS Logo" className="clerk-logo-img" />
            <div className="clerk-logo-text">
              <h2>SpaceS</h2>
              <span>Clerk Panel</span>
            </div>
          </div>

          <nav className="clerk-nav">
            <NavLink end to="/clerk">
              <i className="fa-solid fa-house"></i>
              Dashboard
            </NavLink>

            <NavLink to="/clerk/schedule">
              <i className="fa-solid fa-calendar"></i>
              Schedule
            </NavLink>

            {/* RESERVATIONS DROPDOWN */}
            <div className="nav-group">
              <button
                className="nav-parent"
                onClick={() => setOpenReservations(!openReservations)}
              >
                <i className="fa-solid fa-bookmark"></i>
                Reservations
                <i className={`fa-solid fa-chevron-down arrow ${openReservations ? "open" : ""}`}></i>
              </button>

              <div className={`submenu ${openReservations ? "open" : ""}`}>
                <NavLink to="/clerk/online-reservations">Online Reservations</NavLink>
                <NavLink to="/clerk/walk-in-reservation">Walk-in Reservations</NavLink>
              </div>
            </div>
          </nav>

          {/* PROFILE CARD — bottom of sidebar */}
          <NavLink to="/clerk/profile" className="clerk-sidebar-profile">
            <div className="clerk-sidebar-avatar">
              {profile.photoUrl
                ? <img src={profile.photoUrl} alt="Profile" />
                : <span>{initials || <i className="fa-solid fa-user" />}</span>
              }
            </div>
            <div className="clerk-sidebar-profile-info">
              <span className="clerk-sidebar-profile-name">{fullName || "My Profile"}</span>
              <span className="clerk-sidebar-profile-role">{profile.role}</span>
            </div>
          </NavLink>

        </aside>

        {/* MAIN */}
        <div className="clerk-main">
          <header className="clerk-header">
            <div className="header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search..." />
            </div>
            <div className="header-actions">
              <button className="header-btn">
                <i className="fa-regular fa-bell"></i>
              </button>
              <button className="header-btn logout" onClick={() => setShowLogout(true)}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </header>

          <main className="clerk-content">
            <Outlet />
          </main>
        </div>
      </div>

      {/* LOGOUT MODAL */}
      {showLogout && (
        <div className="modal-overlay">
          <div className="logout-modal">
            <div className="modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2>Are you sure you want to logout?</h2>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={handleLogout}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT LOADING */}
      {loggingOut && (
        <div className="logout-loading-screen">
          <div className="logout-loading-card">
            <div className="logout-spinner" />
            <h2>Signing you out...</h2>
            <p>Please wait while we securely end your session</p>
          </div>
        </div>
      )}
    </>
  );
}
