import React from 'react';
import './clerk-nav.css';

export default function ClerkNav({
  onNotification,
  onLogout,
}) {
  return (
    <nav className="clerk-nav">

      {/* LEFT */}
      <div className="clerk-brand">
        <div className="clerk-brand-icon">
          <i className="fa-regular fa-calendar-days"></i>
        </div>

        <div>
          <h2>SpaceS CICT</h2>
          <p>CICT Clerk</p>
        </div>
      </div>

      {/* CENTER */}
      <div className="clerk-search-wrapper">
        <div className="clerk-search">
          <i className="fa-solid fa-magnifying-glass"></i>

          <input
            type="text"
            placeholder="Search rooms or users..."
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="clerk-actions">

        <button
          type="button"
          className="clerk-icon-btn"
          aria-label="Notifications"
          onClick={onNotification}
        >
          <span className="notification-dot"></span>
          <i className="fa-regular fa-bell"></i>
        </button>

        <button
          type="button"
          className="clerk-icon-btn"
          aria-label="Settings"
          onClick={onLogout}
        >
          <i className="fa-solid fa-gear"></i>
        </button>

      </div>

    </nav>
  );
}