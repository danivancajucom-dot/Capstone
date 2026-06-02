import React from 'react';
import './department-head-nav.css';

export default function DepartmentHeadNav({
  onNotification,
  onSettings,
}) {
  return (
    <nav className="department-nav">
      {/* LEFT */}
      <div className="department-brand">
        <div className="department-brand-icon">
          <i className="fa-regular fa-calendar-days"></i>
        </div>

        <div>
          <h2>SpaceS CICT</h2>
          <p>CICT Department Head</p>
        </div>
      </div>

      {/* CENTER */}
      <div className="department-search">
        <i className="fa-solid fa-magnifying-glass"></i>

        <input
          type="text"
          placeholder="Search rooms or users..."
        />
      </div>

      {/* RIGHT */}
      <div className="department-actions">
        <button
          type="button"
          className="department-icon-btn"
          aria-label="Notifications"
          onClick={onNotification}
        >
          <span className="notification-dot"></span>
          <i className="fa-regular fa-bell"></i>
        </button>

        <button
          type="button"
          className="department-icon-btn"
          aria-label="Settings"
          onClick={onSettings}
        >
          <i className="fa-solid fa-gear"></i>
        </button>
      </div>
    </nav>
  );
}
