import { useState } from 'react';
import './Shared/room-management-sidebar.css';

function RoomManagementSidebar({ onNavigate }) {
  const [roomsOpen, setRoomsOpen] = useState(true);
  const [activeRoomItem, setActiveRoomItem] = useState('Room Management');

  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="brand-block">
          <div className="brand-icon">
            <i className="fa-solid fa-calendar-days" aria-hidden="true" />
          </div>
          <div>
            <p className="brand-name">SpaceS CICT</p>
            <p className="brand-tag">CICT Department Head</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button type="button" className="sidebar-link" onClick={() => onNavigate('dashboard')}>
            <i className="fa-solid fa-chart-pie sidebar-link-icon" aria-hidden="true" />
            Dashboard
          </button>

          <button type="button" className="sidebar-link" onClick={() => onNavigate('schedule')}>
            <i className="fa-solid fa-calendar-days sidebar-link-icon" aria-hidden="true" />
            Schedule
          </button>

          <div className={`sidebar-dropdown ${roomsOpen ? 'open' : ''}`}>
            <button
              type="button"
              className={`sidebar-link sidebar-dropdown-trigger ${roomsOpen ? 'active' : ''}`}
              onClick={() => {
                setRoomsOpen((prev) => !prev);
                onNavigate('rooms');
              }}
              aria-expanded={roomsOpen}
            >
              <i className="fa-solid fa-door-open sidebar-link-icon" aria-hidden="true" />
              Rooms
              <span className="dropdown-icon">{roomsOpen ? '▾' : '▸'}</span>
            </button>
            <div className="sidebar-dropdown-menu">
              {['Room Management', 'Room Usage Tracking'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`sidebar-dropdown-item ${activeRoomItem === item ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRoomItem(item);
                    onNavigate('rooms', item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="sidebar-link" onClick={() => onNavigate('reservations')}>
            <i className="fa-solid fa-book-open-reader sidebar-link-icon" aria-hidden="true" />
            Reservations
          </button>
          <button type="button" className="sidebar-link" onClick={() => onNavigate('roomActivity')}>
            <i className="fa-solid fa-chart-line sidebar-link-icon" aria-hidden="true" />
            Room Activity
          </button>
          <button type="button" className="sidebar-link" onClick={() => onNavigate('conflicts')}>
            <i className="fa-solid fa-triangle-exclamation sidebar-link-icon" aria-hidden="true" />
            Conflicts
          </button>
          <button type="button" className="sidebar-link" onClick={() => onNavigate('users')}>
            <i className="fa-solid fa-user sidebar-link-icon" aria-hidden="true" />
            Users
          </button>
          <button type="button" className="sidebar-link" onClick={() => onNavigate('notifications')}>
            <i className="fa-solid fa-bell sidebar-link-icon" aria-hidden="true" />
            Notifications
          </button>
        </nav>
      </div>

      <div className="sidebar-profile">
        <div className="profile-avatar">JD</div>
        <div className="profile-info">
          <p className="profile-name">Juan Dela Cruz</p>
          <p className="profile-role">Department Head</p>
        </div>
      </div>
    </aside>
  );
}

export default RoomManagementSidebar;
