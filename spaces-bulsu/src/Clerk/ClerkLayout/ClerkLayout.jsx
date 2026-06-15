import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./clerk-layout.css";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function ClerkLayout() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [openReservations, setOpenReservations] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
  try {
    setShowLogoutConfirm(false);
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

  return (
    <>
      <div className="clerk-layout">

        {/* SIDEBAR */}
        <aside className="clerk-sidebar">

          <div className="clerk-logo">
            <h2>SpaceS</h2>
            <span>Clerk Panel</span>
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

            {/* DROPDOWN */}
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

                <NavLink to="/clerk/online-reservations">
                  Online Reservations
                </NavLink>

                <NavLink to="/clerk/walk-in-reservation">
                  Walk-in Reservations
                </NavLink>

              </div>
            </div>

          </nav>
        </aside>

        {/* MAIN */}
        <div className="clerk-main">

          {/* HEADER */}
          <header className="clerk-header">

            <div className="header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search..." />
            </div>

            <div className="header-actions">

              <button className="header-btn">
                <i className="fa-regular fa-bell"></i>
              </button>

              <button
                className="header-btn logout"
                onClick={() => setShowLogout(true)}
              >
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>

            </div>

          </header>

          {/* CONTENT */}
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

              <button
                className="modal-btn cancel"
                onClick={() => setShowLogout(false)}
              >
                Cancel
              </button>

              <button
                className="modal-btn confirm"
                onClick={handleLogout}
              >
                Confirm
              </button>

            </div>

          </div>
        </div>
      )}

      {loggingOut && (
        <div className="login-loading-screen">
          <div className="loading-card">
            <div className="spinner" />
            <h2>Signing you out...</h2>
            <p>Please wait while we securely end your session</p>
          </div>
        </div>
      )}
    </>
  );
}