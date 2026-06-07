import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./department-head-layout.css";

export default function DepartmentHeadLayout() {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <div className="dept-layout">

        {/* SIDEBAR */}
        <aside className="dept-sidebar">

          <div className="dept-logo">
            <h2>SpaceS</h2>
            <span>Department Head</span>
          </div>

          <nav className="dept-nav">

            <NavLink end to="/department-head">
              <i className="fa-solid fa-house"></i>
              Dashboard
            </NavLink>

            <NavLink to="/department-head/conflicts">
              <i className="fa-solid fa-triangle-exclamation"></i>
              Conflicts
            </NavLink>

            <NavLink to="/department-head/reservations">
              <i className="fa-solid fa-bookmark"></i>
              Reservations
            </NavLink>

            <NavLink to="/department-head/schedule">
              <i className="fa-solid fa-calendar-days"></i>
              Schedule
            </NavLink>

            <NavLink to="/department-head/room-management">
              <i className="fa-solid fa-building"></i>
              Room Management
            </NavLink>

            <NavLink to="/department-head/room-activity">
              <i className="fa-solid fa-chart-line"></i>
              Room Activity
            </NavLink>

            <NavLink to="/department-head/user-management">
              <i className="fa-solid fa-users"></i>
              User Management
            </NavLink>

            <NavLink to="/department-head/notification-management">
              <i className="fa-solid fa-bell"></i>
              Notifications
            </NavLink>

          </nav>

        </aside>

        {/* MAIN */}
        <div className="dept-main">

          <header className="dept-header">

            <div className="header-search">
              <i className="fa-solid fa-magnifying-glass"></i>

              <input
                type="text"
                placeholder="Search users, rooms, schedules..."
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

          <main className="dept-content">
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
}