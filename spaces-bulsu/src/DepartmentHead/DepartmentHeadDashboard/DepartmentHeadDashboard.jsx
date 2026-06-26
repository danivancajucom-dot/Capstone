import React, { useState, useEffect } from 'react';
import './department-head-dashboard.css';
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import classroomImg from "../../assets/Classroom.jpeg";

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

const floors = ['All Floors', '1st Floor', '3rd Floor', '4th Floor'];

const getCurrentDay = () => {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[new Date().getDay()];
};

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const isRoomOccupiedNow = (schedules = []) => {
  const now = new Date();
  const currentDay = getCurrentDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return schedules.some((sched) => {
    if (sched.day !== currentDay) return false;

    const start = toMinutes(sched.start);
    const end = toMinutes(sched.end);

    return currentMinutes >= start && currentMinutes < end;
  });
};

export default function DepartmentHeadDashboard() {
  const [activeFloor, setActiveFloor] = useState('All Floors');
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupied: 0,
    available: 0,
    maintenance: 0,
    roomActivity: 0,
  });
  const normalize = (value) =>
  value?.toString().trim().toLowerCase();
  const [loading, setLoading] = useState(true);

  const getNextSchedule = (schedules = []) => {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const upcoming = schedules
    .filter(s => toMinutes(s.start) > nowMin)
    .sort((a,b) => toMinutes(a.start) - toMinutes(b.start));

  return upcoming[0];
};

  useEffect(() => {
    setLoading(true);

    const unsub = onSnapshot(collection(db, "rooms"), (snapshot) => {
      let totalRooms = 0;
      let occupied = 0;
      let available = 0;
      let maintenance = 0;

      const data = snapshot.docs.map((doc) => {
        const room = doc.data();

        totalRooms++;

        const schedules = room.schedules || [];
        const occupiedNow = isRoomOccupiedNow(schedules);

        let status = "free";

        if (room.status === "inactive") {
          status = "maintenance";
          maintenance++;
        } else if (occupiedNow) {
          status = "occupied";
          occupied++;
        } else {
          status = "free";
          available++;
        }

        return {
          id: room.roomName,
          label: room.roomType || "Room",
          image: room.image || null,
          status,
          schedules,
          floor: (room.floor || "").toString().trim(),
        };
      });

      setRooms(data);
      setStats({
        totalRooms,
        occupied,
        available,
        maintenance,
        roomActivity: occupied + maintenance,
      });

      setLoading(false); // ✅ done loading
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

  const filteredRooms =
  activeFloor === "All Floors"
    ? rooms
    : rooms.filter((room) => {
        if (!room.floor) return false;

        return normalize(room.floor) === normalize(activeFloor);
      });

  return (
    <div className="dept-db-dashboard">
      {/* STATS ROW */}
      <div className="dept-db-stats-row">
        {[
          {
            icon: "fa-solid fa-building",
            label: "Total Rooms",
            value: stats.totalRooms,
            color: "orange",
          },
          {
            icon: "fa-solid fa-location-dot",
            label: "Occupied",
            value: stats.occupied,
            color: "red",
          },
          {
            icon: "fa-solid fa-circle-check",
            label: "Available",
            value: stats.available,
            color: "green",
          },
          {
            icon: "fa-solid fa-users",
            label: "Under Maintenance",
            value: stats.maintenance,
            color: "gray",
          },
          {
            icon: "fa-solid fa-circle-plus",
            label: "Room Activity",
            value: stats.roomActivity,
            color: "orange",
          },
        ].map((s, i) => (
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
            {loading ? (
              <div className="dept-db-loading">
                <div className="spinner"></div>
                Loading rooms...
              </div>
            ) : filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <div
                  className={`dept-db-room-card ${room.status}`}
                  key={room.id}
                >
                  <div className="dept-db-room-card-header">
                    <span className="dept-db-room-id">
                      {room.id}
                    </span>

                    <span className={`dept-db-status-dot ${room.status}`}></span>
                  </div>

                  <div className="dept-db-room-card-img">
                    <img
                      src={room.image || classroomImg}
                      alt={room.id}
                      className="dept-db-room-img"
                    />

                    {room.status === "occupied" && (
                      <div className="dept-db-in-use-badge">
                        IN USE
                      </div>
                    )}
                  </div>

                  <p className={`dept-db-room-label ${room.status}`}>
                    {room.status === "occupied"
                      ? "In Use Now"
                      : (() => {
                          const next = getNextSchedule(room.schedules);

                          return next ? (
                            <>
                              Available Today <br />
                              <small>
                                Next: {next.day} {next.start}-{next.end}
                              </small>
                            </>
                          ) : (
                            "Available Today"
                          );
                        })()}
                  </p>
                </div>
              ))
            ) : (
              <div className="dept-db-no-rooms">
                No rooms found for {activeFloor}.
              </div>
            )}
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