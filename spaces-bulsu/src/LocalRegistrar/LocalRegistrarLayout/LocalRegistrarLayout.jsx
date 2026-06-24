import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import "./local-registrar-layout.css";
import { onAuthStateChanged, signOut } from "firebase/auth";
import LogoutPopup from "../../Popup/LogoutPopup/LogoutPopup";

export default function LocalRegistrarLayout() {
  const [openSchedule, setOpenSchedule] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const scheduleRoutes = [
    "/local-registrar/bulk-upload-1",
    "/local-registrar/academic-schedule",
    "/local-registrar/my-submitted-schedules",
    "/local-registrar/qr-code",
  ];

  const isScheduleActive = scheduleRoutes.some((path) =>
    location.pathname.startsWith(path)
  );

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
              <img src="/SpaceSLogo.png" alt="SpaceS Logo" className="clerk-logo-img" />
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
  className={`lr-nav-parent ${isScheduleActive ? "active-parent" : ""}`}
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

            <NavLink to="/local-registrar/broadcast-channel">
              <i className="fa-solid fa-bell"></i>
              <span>Announcement Channel</span>
            </NavLink>

          </nav>

        </aside>

        <div className="registrar-main">

          <header className="registrar-header">

            <div className="registrar-header-search">
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
  className="header-btn lr-logout-btn"
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
        <LogoutPopup
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
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

