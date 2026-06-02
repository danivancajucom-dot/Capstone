import React from 'react';
import './local-registrar-nav.css';

export default function LocalRegistrarNav({
  onNotification,
  onLogout,
}) {
  return (
    <nav className="registrar-nav">
      {/* LEFT SIDE */}
      <div className="registrar-brand">
        <div className="registrar-brand-icon">
          <i className="fa-regular fa-calendar-days"></i>
        </div>

        <div>
          <h2>SpaceS CICT</h2>
          <p>CICT Local Registrar</p>
        </div>
      </div>

      {/* CENTER SEARCH */}
      <div className="registrar-search">
        <i className="fa-solid fa-magnifying-glass"></i>

        <input
          type="text"
          placeholder="Search rooms..."
        />
      </div>

      {/* RIGHT ACTIONS */}
      <div className="registrar-actions">
        <button
          type="button"
          className="registrar-icon-btn"
          aria-label="Notifications"
          onClick={onNotification}
        >
          <span className="notification-dot"></span>

          <i className="fa-regular fa-bell"></i>
        </button>

        <button
          type="button"
          className="registrar-icon-btn"
          aria-label="Logout"
          onClick={onLogout}
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    </nav>
  );
}