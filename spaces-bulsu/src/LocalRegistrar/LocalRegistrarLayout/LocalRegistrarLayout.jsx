import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./local-registrar-layout.css";

export default function LocalRegistrarLayout() {

  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <div className="registrar-layout">

        <aside className="registrar-sidebar">

          <div className="registrar-logo">
            <h2>SpaceS</h2>
            <span>Local Registrar</span>
          </div>

          <nav className="registrar-nav">

            <NavLink end to="/local-registrar">
              Dashboard
            </NavLink>

            <NavLink to="/local-registrar/academic-schedule">
              Academic Schedule
            </NavLink>

            <NavLink to="/local-registrar/room-card">
              Room Card
            </NavLink>

            <NavLink to="/local-registrar/qr-code">
              QR Code
            </NavLink>

            <NavLink to="/local-registrar/activity-log">
              Activity Log
            </NavLink>

            <NavLink to="/local-registrar/my-submitted-schedules">
              Submitted Schedules
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