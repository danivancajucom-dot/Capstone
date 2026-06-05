import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./department-head-layout.css";

export default function DepartmentHeadLayout() {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <div className="dept-layout">

        <aside className="dept-sidebar">

          <div className="dept-logo">
            <h2>SpaceS</h2>
            <span>Department Head</span>
          </div>

          <nav className="dept-nav">

            <NavLink end to="/department-head">
              Dashboard
            </NavLink>

            <NavLink to="/department-head/conflicts">
              Conflicts
            </NavLink>

            <NavLink to="/department-head/reassign-room">
              Reassign Room
            </NavLink>

            <NavLink to="/department-head/dept-reservations">
              Reservations
            </NavLink>

            <NavLink to="/department-head/dept-schedule">
              Schedule
            </NavLink>

            <NavLink to="/department-head/dept-room-management">
              Room Management
            </NavLink>

            <NavLink to="/department-head/room-activity">
              Room Activity
            </NavLink>

            <NavLink to="/department-head/user-management">
              User Management
            </NavLink>

            <NavLink to="/department-head/notification-management">
              Notifications
            </NavLink>

            <NavLink to="/department-head/activity-log">
              Activity Log
            </NavLink>

          </nav>

        </aside>

        <div className="dept-main">

          <header className="dept-header">

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

          <main className="dept-content">
            <Outlet />
          </main>

        </div>

      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay">

          <div className="logout-modal">

            <h2>Are you sure you want to log out?</h2>

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