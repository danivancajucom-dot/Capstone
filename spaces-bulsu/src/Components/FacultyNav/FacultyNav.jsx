import React from 'react';
import './faculty-nav.css';

export default function FacultyNav({
  onNotification,
  onSettings,
}) {
  return (
    <nav className="faculty-nav">
      {/* LEFT */}
      <div className="faculty-brand">
        <div className="faculty-brand-icon">
          <i className="fa-regular fa-calendar-days"></i>
        </div>

        <div>
          <h2>SpaceS CICT</h2>
          <p>CICT Faculty</p>
        </div>
      </div>

      {/* CENTER */}
      <div className="faculty-search">
        <i className="fa-solid fa-magnifying-glass"></i>

        <input
          type="text"
          placeholder="Search rooms or users..."
        />
      </div>

      {/* RIGHT */}
      <div className="faculty-actions">
        <button
          type="button"
          className="faculty-icon-btn"
          aria-label="Notifications"
          onClick={onNotification}
        >
          <span className="notification-dot"></span>
          <i className="fa-regular fa-bell"></i>
        </button>

        <button
          type="button"
          className="faculty-icon-btn"
          aria-label="Exit"
          onClick={onSettings}
        >
          <i className="fa-solid fa-gear"></i>
        </button>
      </div>
    </nav>
  );
}
