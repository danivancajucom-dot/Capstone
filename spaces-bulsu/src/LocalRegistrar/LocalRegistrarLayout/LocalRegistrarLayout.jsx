import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./local-registrar-layout.css";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function LocalRegistrarLayout() {
  const [openSchedule, setOpenSchedule] = useState(true);
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
      <div className="registrar-layout">

        <aside className="registrar-sidebar">

          <div className="registrar-logo">

            <div className="logo-icon">
              <i className="fa-solid fa-calendar-check"></i>
            </div>

            <div className="logo-text">
              <h2>SpaceS CICT</h2>
              <span>CICT Local Registrar</span>
            </div>

          </div>

          <nav className="registrar-nav">

            <NavLink end to="/local-registrar">
              <i className="fa-solid fa-table-columns"></i>
              <span>Dashboard</span>
            </NavLink>


            <div className="nav-group">

              <button
                className="nav-parent active-parent"
                onClick={() => setOpenSchedule(!openSchedule)}
              >
                <div className="nav-left">
                  <i className="fa-solid fa-calendar-days"></i>
                  <span>Schedule</span>
                </div>

                <i
                  className={`fa-solid fa-chevron-down arrow ${
                    openSchedule ? "open" : ""
                  }`}
                />
              </button>

              <div className={`submenu-card ${openSchedule ? "open" : ""}`}>

                <NavLink to="/local-registrar/bulk-upload-1">
                  Bulk Upload
                </NavLink>

                <NavLink to="/local-registrar/academic-schedule">
                  View Academic Schedule
                </NavLink>

                <NavLink to="/local-registrar/my-submitted-schedules">
                  My Submitted Schedules
                </NavLink>

                <NavLink to="/local-registrar/qr-code">
                  QR Code Management
                </NavLink>

              </div>
            </div>

            <NavLink to="/local-registrar/room-card">
              <i className="fa-solid fa-building"></i>
              <span>Room Card</span>
            </NavLink>

            <NavLink to="/local-registrar/activity-log">
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>Activity Log</span>
            </NavLink>

            <NavLink to="/local-registrar/broadcast-channel">
              <i className="fa-solid fa-bell"></i>
              Announcement Channel
            </NavLink>

          </nav>

        </aside>

        <div className="registrar-main">

          <header className="registrar-header">

            <div className="header-search">
              <i className="fa-solid fa-magnifying-glass"></i>

              <input
                type="text"
                placeholder="Search..."
              />
            </div>

            <div className="header-actions">

              <button className="header-btn">
                <i className="fa-regular fa-bell"></i>
              </button>

              <button
                className="header-btn"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>

            </div>

          </header>

          <main className="registrar-content">
            <Outlet />
          </main>

        </div>

      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay">

          <div className="logout-modal">

            <h2>
              Are you sure you want to log out?
            </h2>

            <div className="modal-actions">

              <button
                className="modal-btn cancel"
                onClick={() => setShowLogoutConfirm(false)}
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