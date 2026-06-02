import React, { useState } from 'react';
import './faculty-notification.css';

export default function FacultyNotifications({ onLogout }) {
  const [activeTab, setActiveTab] = useState('all');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>

      <div className="notification-shell">
        {/* SIDEBAR */}
        <aside className="notification-sidebar">
          <div>
            <div className="sidebar-brand">
              <div className="sidebar-logo">
                <i className="fa-solid fa-calendar-days"></i>
              </div>

              <div>
                <h2>SpaceS CICT</h2>
                <p>CICT Faculty</p>
              </div>
            </div>

            <nav className="sidebar-nav">
              <button className="sidebar-item">
                <i className="fa-solid fa-table-columns"></i>
                Dashboard
              </button>

              <button className="sidebar-item">
                <i className="fa-solid fa-calendar-days"></i>
                Schedule
              </button>

              <button className="sidebar-item">
                <i className="fa-solid fa-door-open"></i>
                Rooms
              </button>

              <button className="sidebar-item">
                <i className="fa-solid fa-bookmark"></i>
                Reservations
              </button>

              <button className="sidebar-item">
                <i className="fa-solid fa-user"></i>
                Profile
              </button>
            </nav>
          </div>

          <div className="sidebar-profile">
            <div className="profile-avatar"></div>

            <div>
              <h4>Juan Dela Cruz</h4>
              <p>Faculty</p>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="notification-main">
          {/* TOPBAR */}
          <section className="notification-topbar">
            <div className="search-box">
              <i className="fa-solid fa-magnifying-glass"></i>

              <input
                type="text"
                placeholder="Search rooms or users..."
              />
            </div>

            <div className="topbar-actions">
              <button className="topbar-btn active">
                <i className="fa-regular fa-bell"></i>
              </button>

              <button className="topbar-btn">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </section>

          {/* HEADER */}
          <section className="notification-header">
            <h1>Notifications</h1>

            <div className="notification-tabs">
              <button
                className={activeTab === 'all' ? 'active' : ''}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>

              <button
                className={activeTab === 'unread' ? 'active' : ''}
                onClick={() => setActiveTab('unread')}
              >
                Unread
                <span className="dot"></span>
              </button>

              <button
                className={activeTab === 'archived' ? 'active' : ''}
                onClick={() => setActiveTab('archived')}
              >
                Archived
              </button>
            </div>
          </section>

          {/* NOTIFICATION CARD */}
          <section className="notification-card">
            {/* TODAY */}
            <div className="notification-group">
              <p className="group-title">TODAY</p>

              <div className="notification-item warning">
                <div className="notification-icon orange">
                  <i className="fa-regular fa-calendar"></i>
                </div>

                <div className="notification-content">
                  <div className="notification-top">
                    <h3>Schedule Changed: Gender and Society</h3>

                    <span className="new-badge">NEW</span>
                  </div>

                  <p>
                    Room changed from CT8 to CT6 for today's
                    12:00 PM lecture due to an event.
                  </p>

                  <small>2m ago</small>
                </div>
              </div>

              <div className="notification-item danger">
                <div className="notification-icon red">
                  <i className="fa-solid fa-exclamation"></i>
                </div>

                <div className="notification-content">
                  <h3>Override Alert: Lab 10</h3>

                  <p>
                    Dean Digna has requested an administrative
                    override for your 4:00 PM slot.
                  </p>

                  <small>15m ago</small>
                </div>
              </div>

              <div className="notification-item success">
                <div className="notification-icon green">
                  <i className="fa-solid fa-check"></i>
                </div>

                <div className="notification-content">
                  <h3>Reservation Approved</h3>

                  <p>
                    Your request for SDL1 on Saturday,
                    Oct 26th has been approved.
                  </p>

                  <small>15m ago</small>
                </div>
              </div>
            </div>

            {/* YESTERDAY */}
            <div className="notification-group">
              <p className="group-title">YESTERDAY</p>

              <div className="notification-item">
                <div className="notification-icon gray">
                  <i className="fa-regular fa-circle-check"></i>
                </div>

                <div className="notification-content">
                  <h3>Reservation Approved</h3>

                  <p>
                    Your request for Prog Lab 2 on Thursday,
                    Oct 24th has been approved.
                  </p>

                  <small>Yesterday, 4:50 PM</small>
                </div>
              </div>

              <div className="notification-item">
                <div className="notification-icon gray">
                  <i className="fa-solid fa-screwdriver-wrench"></i>
                </div>

                <div className="notification-content">
                  <h3>System Update</h3>

                  <p>
                    FIREFOX scheduling engine will be offline
                    for 15 minutes tonight at midnight.
                  </p>

                  <small>Yesterday, 10:15 AM</small>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* MODAL */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="logout-modal">
            <div className="modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h2>Are you sure you want to log out?</h2>

            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={handleCancelLogout}
              >
                Cancel
              </button>

              <button
                className="modal-btn confirm"
                onClick={handleConfirmLogout}
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