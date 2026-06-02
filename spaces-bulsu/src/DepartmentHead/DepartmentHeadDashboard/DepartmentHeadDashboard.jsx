import React, { useState } from 'react';
import './department-head-dashboard.css';

const statsData = [
  { icon: 'fa-solid fa-building', label: 'Total Rooms', value: 22, color: 'orange' },
  { icon: 'fa-solid fa-location-dot', label: 'Occupied', value: 12, color: 'red' },
  { icon: 'fa-solid fa-circle-check', label: 'Available', value: 6, color: 'green' },
  { icon: 'fa-solid fa-calendar-check', label: 'Pending', value: 5, color: 'orange' },
  { icon: 'fa-solid fa-circle-plus', label: 'Room Activity', value: 2, color: 'orange' },
  { icon: 'fa-solid fa-users', label: 'Under Maintenance', value: 4, color: 'gray' },
];

const floors = ['All Floors', '1st Floor', '3rd Floor', '4th Floor'];

const rooms = [
  { id: 'A1', status: 'occupied', label: 'Gender and Society', image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop' },
  { id: 'A2', status: 'free', label: 'Available: 12:00PM - 4:00PM', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200&auto=format&fit=crop' },
  { id: 'A3', status: 'free', label: 'Available: 7:00AM - 10:00AM', image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&auto=format&fit=crop' },
  { id: 'A4', status: 'maintenance', label: 'Under Maintenance', image: null },
  { id: 'IT13', status: 'free', label: 'Available: 8:00AM - 11:00AM', image: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=200&auto=format&fit=crop' },
  { id: 'IT14', status: 'maintenance', label: 'Under Maintenance', image: null },
];

const recentActivity = [
  { icon: 'fa-solid fa-lock-open', color: 'green', title: 'Room A1 Unlocked', sub: 'Scheduled: IT308', time: 'JUST NOW' },
  { icon: 'fa-solid fa-user-plus', color: 'orange', title: 'New User Registered', sub: 'Juan Dela Cruz added', time: '15 MINS AGO' },
  { icon: 'fa-solid fa-calendar-xmark', color: 'red', title: 'Request Reservation', sub: 'Denied | Prof. Delo Cruz', time: '42 MINS AGO' },
  { icon: 'fa-solid fa-calendar-days', color: 'blue', title: 'Schedule Updated', sub: 'Exam week slots finalized', time: '1 HOUR AGO' },
];

const barData = [
  { day: 'MON', pct: 55 },
  { day: 'TUE', pct: 70 },
  { day: 'WED', pct: 90 },
  { day: 'THU', pct: 75 },
  { day: 'FRI', pct: 60 },
  { day: 'SAT', pct: 40 },
];

export default function DepartmentHeadDashboard() {
  const [activeFloor, setActiveFloor] = useState('1st Floor');

  return (
    <div className="dh-dashboard">
      {/* STATS ROW */}
      <div className="stats-row">
        {statsData.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className={`stat-icon ${s.color}`}>
              <i className={s.icon}></i>
            </div>
            <p className="stat-label">{s.label}</p>
            <h2 className={`stat-value ${s.color}`}>{s.value}</h2>
          </div>
        ))}
      </div>

      {/* BOTTOM GRID */}
      <div className="bottom-grid">

        {/* LIVE ROOM STATUS */}
        <div className="panel room-status-panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fa-solid fa-table-columns"></i>
              <h3>Live Room Status</h3>
            </div>
            <div className="legend">
              <span className="legend-item green">GREEN: FREE</span>
              <span className="legend-item red">RED: OCCUPIED</span>
            </div>
          </div>

          <div className="floor-tabs">
            {floors.map(f => (
              <button
                key={f}
                className={`floor-tab ${activeFloor === f ? 'active' : ''}`}
                onClick={() => setActiveFloor(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="rooms-grid">
            {rooms.map(room => (
              <div className={`room-card ${room.status}`} key={room.id}>
                <div className="room-card-header">
                  <span className="room-id">{room.id}</span>
                  <span className={`status-dot ${room.status}`}></span>
                </div>

                <div className="room-card-img">
                  {room.image ? (
                    <img src={room.image} alt={room.id} />
                  ) : (
                    <div className="room-placeholder">
                      <i className="fa-solid fa-screwdriver-wrench"></i>
                    </div>
                  )}
                  {room.status === 'occupied' && (
                    <div className="in-use-badge">IN USE</div>
                  )}
                </div>

                <p className={`room-label ${room.status}`}>{room.label}</p>
              </div>
            ))}
          </div>

          <p className="last-updated">Last updated: Just now</p>
        </div>


        {/* RECENT ACTIVITY */}
        <div className="panel activity-panel">
          <div className="panel-title">
            <i className="fa-solid fa-calendar-days"></i>
            <h3>Recent Activity</h3>
          </div>

          <div className="activity-list">
            {recentActivity.map((a, i) => (
              <div className="activity-item" key={i}>
                <div className={`activity-icon ${a.color}`}>
                  <i className={a.icon}></i>
                </div>
                <div className="activity-content">
                  <p className="activity-title">{a.title}</p>
                  <p className="activity-sub">{a.sub}</p>
                  <span className="activity-time">{a.time}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="view-all-btn">View All Activity</button>
        </div>

      </div>
    </div>
  );
}