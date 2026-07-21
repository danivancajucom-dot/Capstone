import React, { useEffect, useMemo, useState } from "react";
import "./department-head-dashboard.css";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import classroomImg from "../../assets/Classroom.jpeg";

const floors = ["All Floors", "1st Floor", "3rd Floor", "4th Floor"];
const ROOMS_PER_PAGE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────

const getCurrentDay = () => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date().getDay()];
};

const getTodayLocal = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const normalize = (value) => value?.toString().trim().toLowerCase();

const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const format12Hour = (time) => {
  if (!time) return "";
  let [hour, minute] = time.split(":").map(Number);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour %= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
};

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

const formatTimestamp = (timestamp) => {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleString();
};

// ─── Main Component ──────────────────────────────────────────────────────

export default function DepartmentHeadDashboard() {
  const navigate = useNavigate();
  const [activeFloor, setActiveFloor] = useState("All Floors");

  const [roomsData, setRoomsData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [allReservations, setAllReservations] = useState([]); // <-- all reservations
  const [releasesData, setReleasesData] = useState([]);
  const [reassignmentsData, setReassignmentsData] = useState([]);

  const [recentActivity, setRecentActivity] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [tick, setTick] = useState(0);
  const [visibleCount, setVisibleCount] = useState(ROOMS_PER_PAGE);
  const [loading, setLoading] = useState(true);

  const today = getTodayLocal();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayAbbrev = getCurrentDay();

  // ─── Listeners ─────────────────────────────────────────────────────────

  // 1. Rooms + schedules
  useEffect(() => {
    setLoading(true);
    const roomUnsubs = [];

    const unsubRooms = onSnapshot(collection(db, "rooms"), (snapshot) => {
      let list = [];

      snapshot.docs.forEach((roomDoc) => {
        const room = roomDoc.data();

        const unsubSchedules = onSnapshot(
          collection(db, "rooms", roomDoc.id, "schedules"),
          (scheduleSnap) => {
            const schedules = scheduleSnap.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .filter((s) => !s.initialized);

            list = list.filter((r) => r.docId !== roomDoc.id);
            list.push({
              docId: roomDoc.id,
              roomName: room.roomName,
              roomType: room.roomType,
              floor: room.floor,
              statusField: room.roomStatus,
              image: room.image || null,
              schedules,
            });

            setRoomsData([...list]);
            setLoading(false);
          }
        );
        roomUnsubs.push(unsubSchedules);
      });
    });

    return () => {
      unsubRooms();
      roomUnsubs.forEach((u) => u());
    };
  }, []);

  // 2. Events (room activities)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      setEventsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // 3. All reservations (including pending)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservationRequests"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllReservations(data);
    });
    return unsub;
  }, []);

  // 4. Room releases
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "roomReleases"), (snap) => {
      setReleasesData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // 5. Room reassignments (approved only)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "roomReassignments"), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => normalize(r.status) === "approved");
      setReassignmentsData(data);
    });
    return unsub;
  }, []);

  // 6. 1‑minute tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setLastUpdated(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 7. Recent activity
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
          time: formatTimestamp(d.timestamp),
        };
      });
      setRecentActivity(logs);
    });
    return () => unsub();
  }, []);

  // ─── Build lookup maps for releases & reassignments ──────────────────

  const releaseKeysToday = useMemo(() => {
    return new Set(
      releasesData
        .filter((r) => r.date === today)
        .map((r) => `${r.scheduleId}_${r.date}`)
    );
  }, [releasesData, today]);

  const reassignAwayKeysToday = useMemo(() => {
    return new Set(
      reassignmentsData
        .filter((r) => r.date === today && r.oldRoomId)
        .map((r) => `${r.scheduleId}_${r.date}`)
    );
  }, [reassignmentsData, today]);

  const reassignIntoByRoom = useMemo(() => {
    const map = {};
    reassignmentsData
      .filter((r) => r.date === today && r.newRoomId)
      .forEach((r) => {
        if (!map[r.newRoomId]) map[r.newRoomId] = [];
        map[r.newRoomId].push(r);
      });
    return map;
  }, [reassignmentsData, today]);

  // ─── Compute room status with full availability windows ──────────────

  const rooms = useMemo(() => {
    return roomsData.map((r) => {
      // Maintenance check
      if (normalize(r.statusField) === "maintenance") {
        return {
          id: r.docId,
          roomName: r.roomName,
          roomType: r.roomType,
          floor: r.floor,
          image: r.image,
          status: "maintenance",
          liveMessage: "Under Maintenance",
          currentSubject: "",
        };
      }

      // ── Filter schedules: skip released & reassigned‑away ──
      const filteredSchedules = r.schedules.filter((s) => {
        const key = `${s.id}_${today}`;
        return !releaseKeysToday.has(key) && !reassignAwayKeysToday.has(key);
      });

      // ── Build busy items ──
      const busyItems = [];

      filteredSchedules
        .filter((s) => s.day === todayAbbrev)
        .forEach((s) => {
          busyItems.push({
            startTime: s.startTime,
            endTime: s.endTime,
            label: s.section ? `${s.subject} • ${s.section}` : s.subject,
            source: "schedule",
          });
        });

      eventsData
        .filter((e) => e.roomId === r.docId && e.date === today)
        .forEach((e) => {
          busyItems.push({
            startTime: e.startTime,
            endTime: e.endTime,
            label: e.title || e.purpose || "Room Activity",
            source: "event",
          });
        });

      // Approved reservations only (for occupancy)
      const approvedReservations = allReservations.filter(
        (res) =>
          res.roomId === r.docId &&
          res.date === today &&
          normalize(res.status) === "approved"
      );

      approvedReservations.forEach((res) => {
        busyItems.push({
          startTime: res.startTime,
          endTime: res.endTime,
          label: res.customPurpose || res.courseTitle || res.purpose || "Reservation",
          source: "reservation",
        });
      });

      (reassignIntoByRoom[r.docId] || []).forEach((re) => {
        busyItems.push({
          startTime: re.startTime,
          endTime: re.endTime,
          label: `${re.courseTitle || "Class"} (Moved)`,
          source: "reassignment",
        });
      });

      busyItems.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

      // ── Determine status with full availability window ──
      let status = "free";
      let message = "Available all day";
      let currentSubject = "";
      let foundStatus = false;
      let previousEndTime = null;

      for (const item of busyItems) {
        const start = toMinutes(item.startTime);
        const end = toMinutes(item.endTime);

        if (currentMinutes >= start && currentMinutes < end) {
          status = "occupied";
          message = `Occupied until ${format12Hour(item.endTime)}`;
          currentSubject = item.label;
          foundStatus = true;
          break;
        }

        if (currentMinutes < start) {
          status = "free";
          currentSubject = "";
          if (previousEndTime) {
            message = `Available from ${format12Hour(previousEndTime)} to ${format12Hour(item.startTime)}`;
          } else {
            message = `Available until ${format12Hour(item.startTime)}`;
          }
          foundStatus = true;
          break;
        }

        previousEndTime = item.endTime;
      }

      if (!foundStatus) {
        status = "free";
        currentSubject = "";
        if (previousEndTime) {
          message = `Available from ${format12Hour(previousEndTime)} onwards`;
        } else {
          message = "Available all day";
        }
      }

      return {
        id: r.docId,
        roomName: r.roomName,
        roomType: r.roomType,
        floor: r.floor,
        image: r.image,
        status,
        liveMessage: message,
        currentSubject,
      };
    });
  }, [
    roomsData,
    eventsData,
    allReservations,
    releasesData,
    reassignmentsData,
    releaseKeysToday,
    reassignAwayKeysToday,
    reassignIntoByRoom,
    today,
    todayAbbrev,
    currentMinutes,
  ]);

  // ─── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let occupied = 0,
      available = 0,
      maintenance = 0;
    rooms.forEach((r) => {
      if (r.status === "occupied") occupied++;
      else if (r.status === "maintenance") maintenance++;
      else available++;
    });

    // Pending reservations (status "pending")
    const pending = allReservations.filter(
      (r) => normalize(r.status) === "pending"
    ).length;

    // Room activities for today (all events, not just ongoing)
    const roomActivitiesToday = eventsData.filter(
      (e) => e.date === today
    ).length;

    return {
      totalRooms: rooms.length,
      occupied,
      available,
      maintenance,
      pending,
      roomActivitiesToday,
    };
  }, [rooms, allReservations, eventsData, today]);

  // ─── Floor filter & pagination ────────────────────────────────────────

  const filteredRooms = useMemo(() => {
    const base =
      activeFloor === "All Floors"
        ? rooms
        : rooms.filter((room) => normalize(room.floor) === normalize(activeFloor));
    return [...base].sort((a, b) =>
      a.roomName.localeCompare(b.roomName, undefined, { numeric: true })
    );
  }, [rooms, activeFloor]);

  useEffect(() => {
    setVisibleCount(ROOMS_PER_PAGE);
  }, [activeFloor]);

  const visibleRooms = filteredRooms.slice(0, visibleCount);
  const hasMoreRooms = filteredRooms.length > visibleCount;

  // ─── Tooltip descriptions for stats ───────────────────────────────────

  const statTooltips = {
    totalRooms: "Total number of rooms in the system.",
    occupied: "Rooms currently occupied (class, reservation, or room activity).",
    available: "Rooms that are free right now.",
    maintenance: "Rooms under maintenance and not available.",
    pending: "Reservation requests waiting for approval.",
    roomActivitiesToday: "Room activities scheduled for today (created by Department Head).",
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="dept-db-dashboard">
      {/* STATS ROW */}
      <div className="dept-db-stats-row">
        {[
          { key: "totalRooms", icon: "fa-solid fa-building", label: "Total Rooms", value: stats.totalRooms, color: "orange" },
          { key: "occupied", icon: "fa-solid fa-location-dot", label: "Occupied", value: stats.occupied, color: "red" },
          { key: "available", icon: "fa-solid fa-circle-check", label: "Available", value: stats.available, color: "green" },
          { key: "maintenance", icon: "fa-solid fa-users", label: "Under Maintenance", value: stats.maintenance, color: "gray" },
          { key: "pending", icon: "fa-solid fa-clock", label: "Pending", value: stats.pending, color: "orange" },
          { key: "roomActivitiesToday", icon: "fa-solid fa-calendar-plus", label: "Room Activity", value: stats.roomActivitiesToday, color: "orange" },
        ].map((s) => (
          <div
            className="dept-db-stat-card"
            key={s.key}
            title={statTooltips[s.key] || ""}  // <-- hover tooltip
          >
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
        <div className="dept-db-panel dept-db-room-status-panel">
          <div className="dept-db-panel-header">
            <div className="dept-db-panel-title">
              <i className="fa-solid fa-table-columns"></i>
              <h3>Live Room Status</h3>
            </div>
            <div className="dept-db-legend">
              <span className="dept-db-legend-item green">AVAILABLE</span>
              <span className="dept-db-legend-item red">OCCUPIED</span>
              <span
                className="dept-db-legend-item"
                style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" }}
              >
                MAINTENANCE
              </span>
            </div>
          </div>

          <div className="dept-db-floor-tabs">
            {floors.map((f) => (
              <button
                key={f}
                className={`dept-db-floor-tab ${activeFloor === f ? "active" : ""}`}
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
            ) : visibleRooms.length === 0 ? (
              <div className="dept-db-loading">No rooms found.</div>
            ) : (
              visibleRooms.map((room) => (
                <div key={room.id} className={`dept-db-room-card ${room.status}`}>
                  <div className="dept-db-room-card-header">
                    <span className="dept-db-room-id">{room.roomName}</span>
                    <span className={`dept-db-status-dot ${room.status}`}></span>
                  </div>

                  <div className="dept-db-room-card-img">
                    <img src={room.image || classroomImg} alt={room.roomName} className="dept-db-room-img" />
                    {room.status === "occupied" && (
                      <div className="dept-db-in-use-badge">OCCUPIED</div>
                    )}
                    {room.status === "maintenance" && (
                      <div className="dept-db-in-use-badge" style={{ background: "#6b7280" }}>
                        MAINTENANCE
                      </div>
                    )}
                  </div>

                  <p style={{ marginBottom: 4, fontWeight: 700, fontSize: 13, color: "#374151" }}>
                    {room.roomType}
                  </p>

                  <p className={`dept-db-room-label ${room.status}`}>{room.liveMessage}</p>

                  {room.currentSubject && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 8,
                        color: "#6b7280",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {room.currentSubject}
                    </small>
                  )}
                </div>
              ))
            )}
          </div>

          <p className="dept-db-last-updated">Last Updated: {lastUpdated.toLocaleTimeString()}</p>

          {hasMoreRooms && (
            <div className="dept-db-load-more">
              <button
                className="dept-db-load-more-btn"
                onClick={() => setVisibleCount((c) => c + ROOMS_PER_PAGE)}
              >
                Load More
              </button>
            </div>
          )}
        </div>

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
          <button
            className="dept-db-view-all-btn"
            onClick={() => navigate("/department-head/activity-log")}
          >
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}