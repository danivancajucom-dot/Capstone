import React, { useState, useEffect } from 'react';
import './department-head-dashboard.css';
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";

const getActivityIcon = (type) => {
  switch (type) {
    case "success": return "fa-solid fa-circle-check";
    case "edit": return "fa-solid fa-pen";
    case "failed": return "fa-solid fa-circle-xmark";
    default: return "fa-solid fa-circle";
  }
};

const getActivityColor = (type) => {
  switch (type) {
    case "success": return "green";
    case "edit": return "blue";
    case "failed": return "red";
    default: return "gray";
  }
};

const formatTime = (timestamp) => {
  if (!timestamp?.toDate) return "Just now";
  const date = timestamp.toDate();
  return date.toLocaleString();
};

const statsData = [
  { icon: 'fa-solid fa-building', label: 'Total Rooms', value: 22, color: 'orange' },
  { icon: 'fa-solid fa-location-dot', label: 'Occupied', value: 12, color: 'red' },
  { icon: 'fa-solid fa-circle-check', label: 'Available', value: 6, color: 'green' },
  { icon: 'fa-solid fa-calendar-check', label: 'Pending', value: 5, color: 'orange' },
  { icon: 'fa-solid fa-circle-plus', label: 'Room Activity', value: 2, color: 'orange' },
  { icon: 'fa-solid fa-users', label: 'Under Maintenance', value: 4, color: 'gray' },
];

const floors = ['All Floors', '1st Floor', '3rd Floor', '4th Floor'];

export default function DepartmentHeadDashboard() {
  const [activeFloor, setActiveFloor] = useState('1st Floor');
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const q = collection(db, "rooms");

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const r = doc.data();
        return {
          id: r.roomName,
          status: r.status === "inactive" ? "maintenance" :
                  r.occupied ? "occupied" : "free",
          label: r.roomType || "Room",
          image: null,
        };
      });
      setRooms(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "activityLogs"),
      orderBy("timestamp", "desc"),
      limit(6)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          icon: getActivityIcon(d.actionType),
          color: getActivityColor(d.actionType),
          title: d.action,
          sub: `${d.user} • ${d.target}`,
          time: formatTime(d.timestamp),
        };
      });
      setRecentActivity(logs);
    });

    return () => unsub();
  }, []);

  return (
    <div className="dept-db-dashboard">
      {/* STATS ROW */}
      <div className="dept-db-stats-row">
        {statsData.map((s, i) => (
          <div className="dept-db-stat-card" key={i}>
            <div className={`dept-db-stat-icon ${s.color}`}>
              <i className={s.icon}></i>
            </div>
            <p className="dept-db-stat-label">{s.label}</p>
            <h2 className={`dept-db-stat-value ${s.color}`}>{s.value}</h2>
          </div>
        ))}
      </div>

      {/* BOTTOM GRID */}
      <div className="dept-db-bottom-grid">

        {/* LIVE ROOM STATUS */}
        <div className="dept-db-panel dept-db-room-status-panel">
          <div className="dept-db-panel-header">
            <div className="dept-db-panel-title">
              <i className="fa-solid fa-table-columns"></i>
              <h3>Live Room Status</h3>
            </div>
            <div className="dept-db-legend">
              <span className="dept-db-legend-item green">AVAILABLE</span>
              <span className="dept-db-legend-item red">OCCUPIED</span>
            </div>
          </div>

          <div className="dept-db-floor-tabs">
            {floors.map(f => (
              <button
                key={f}
                className={`dept-db-floor-tab ${activeFloor === f ? 'active' : ''}`}
                onClick={() => setActiveFloor(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="dept-db-rooms-grid">
            {rooms.map((room) => (
              <div className={`dept-db-room-card ${room.status}`} key={room.id}>

                <div className="dept-db-room-card-header">
                  <span className="dept-db-room-id">{room.id}</span>
                  <span className={`dept-db-status-dot ${room.status}`}></span>
                </div>

                <div className="dept-db-room-card-img">
                  {room.image ? (
                    <img src={room.image} alt={room.id} />
                  ) : (
                    <div className="dept-db-room-placeholder">
                      <i className="fa-solid fa-image"></i>
                    </div>
                  )}

                  {room.status === "occupied" && (
                    <div className="dept-db-in-use-badge">IN USE</div>
                  )}
                </div>

                <p className={`dept-db-room-label ${room.status}`}>
                  {room.label}
                </p>
              </div>
            ))}
          </div>

          <p className="dept-db-last-updated">Last updated: Just now</p>
          <div className="dept-db-load-more">
          <button className="dept-db-load-more-btn">Load More</button>
        </div>
        </div>

        

        {/* RECENT ACTIVITY */}
        <div className="dept-db-panel dept-db-activity-panel">
          <div className="dept-db-panel-title">
            <i className="fa-solid fa-calendar-days"></i>
            <h3>Recent Activity</h3>
          </div>

          <div className="dept-db-activity-list">
            {recentActivity.map((a, i) => (
              <div className="dept-db-activity-item" key={i}>
                <div className={`dept-db-activity-icon ${a.color}`}>
                  <i className={a.icon}></i>
                </div>
                <div className="dept-db-activity-content">
                  <p className="dept-db-activity-title">{a.title}</p>
                  <p className="dept-db-activity-sub">{a.sub}</p>
                  <span className="dept-db-activity-time">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="dept-db-view-all-btn" onClick={() => navigate("/department-head/activity-log")}>
            View All Activity
          </button>
        </div>

      </div>
    </div>
  );
}