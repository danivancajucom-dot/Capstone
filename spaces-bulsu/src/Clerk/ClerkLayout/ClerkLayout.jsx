import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./clerk-layout.css";

export default function ClerkLayout() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [openReservations, setOpenReservations] = useState(false);

  return (
    <>
      <div className="clerk-layout">

        {/* SIDEBAR */}
        <aside className="clerk-sidebar">

          <div className="clerk-logo">
            <h2>SpaceS</h2>
            <span>Clerk</span>
          </div>

          <nav className="clerk-nav">

            <NavLink end to="/clerk">
              Dashboard
            </NavLink>

            <NavLink to="/clerk/schedule">
              Schedule
            </NavLink>

            {/* DROPDOWN GROUP */}
            <div className="sidebar-group">

              <div
                className="sidebar-parent"
                onClick={() => setOpenReservations(!openReservations)}
              >
                Reservations
              </div>

              {openReservations && (
                <div className="sidebar-child">

                  <NavLink to="/clerk/online-reservations">
                    Online Reservations
                  </NavLink>

                  <NavLink to="/clerk/walk-in-reservation">
                    Walk-in Reservations
                  </NavLink>

                </div>
              )}

            </div>

          </nav>
        </aside>

        {/* MAIN */}
        <div className="clerk-main">

          {/* HEADER */}
          <header className="clerk-header">

            <div className="header-search">
              <input type="text" placeholder="Search..." />
            </div>

            <div className="header-actions">
              <button className="header-btn">🔔</button>
              <button className="header-btn" onClick={() => setShowLogout(true)}>
                ⎋
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