import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./faculty-layout.css";

export default function FacultyLayout() {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <div className="faculty-layout">

        {/* SIDEBAR */}
        <aside className="faculty-sidebar">

          <div className="faculty-logo">
            <h2>SpaceS</h2>
            <span>Faculty Portal</span>
          </div>

          <nav className="faculty-nav">

            <NavLink end to="/faculty">
              <i className="fa-solid fa-house"></i>
              Dashboard
            </NavLink>

            <NavLink to="/faculty/schedule">
              <i className="fa-solid fa-calendar-days"></i>
              Schedule
            </NavLink>

            <NavLink to="/faculty/rooms">
              <i className="fa-solid fa-building"></i>
              Rooms
            </NavLink>

            <NavLink to="/faculty/reservations">
              <i className="fa-solid fa-bookmark"></i>
              Reservations
            </NavLink>

            <NavLink to="/faculty/profile">
              <i className="fa-solid fa-user"></i>
              Profile
            </NavLink>

          </nav>

        </aside>

        {/* MAIN */}
        <div className="faculty-main">

          <header className="faculty-header">

            <div className="header-search">

              <i className="fa-solid fa-magnifying-glass"></i>

              <input
                type="text"
                placeholder="Search rooms or users..."
              />

            </div>

            <div className="header-actions">

              <button
                className="header-btn"
                onClick={() => navigate("/faculty/notifications")}
              >
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

          <main className="faculty-content">
            <Outlet />
          </main>

        </div>

      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay">

          <div className="logout-modal">

            <div className="modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

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
                onClick={() => navigate("/login")}
              >
                Confirm
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}s