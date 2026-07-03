import React, { useEffect, useState } from "react";
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

const floors = [
  "All Floors",
  "1st Floor",
  "3rd Floor",
  "4th Floor",
];

const dayMap = {
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

const reverseDayMap = {
  Sunday: "SUN",
  Monday: "MON",
  Tuesday: "TUE",
  Wednesday: "WED",
  Thursday: "THU",
  Friday: "FRI",
  Saturday: "SAT",
};

const normalize = (value) =>
  value?.toString().trim().toLowerCase();

const getCurrentDay = () => {
  const days = [
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
  ];

  return days[new Date().getDay()];
};

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
    case "success":
      return "fa-solid fa-circle-check";

    case "edit":
      return "fa-solid fa-pen";

    case "failed":
      return "fa-solid fa-circle-xmark";

    default:
      return "fa-solid fa-circle";
  }
};

const getActivityColor = (type) => {
  switch (type) {
    case "success":
      return "green";

    case "edit":
      return "blue";

    case "failed":
      return "red";

    default:
      return "gray";
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp?.toDate) return "";

  return timestamp.toDate().toLocaleString();
};

/*
|--------------------------------------------------------------------------
LIVE ROOM STATUS
|--------------------------------------------------------------------------
*/

const getRoomLiveStatus = (room, schedules) => {
 if(room.statusField==="inactive") {
    return {
      status: "maintenance",
      message: "Under Maintenance",
      currentSubject: "",
    };
  }

  const today = getCurrentDay();

  const currentMinutes =
    new Date().getHours() * 60 +
    new Date().getMinutes();

  const todaysSchedules = schedules
    .filter((s) => s.day === today)
    .sort(
      (a, b) =>
        toMinutes(a.startTime) -
        toMinutes(b.startTime)
    );

  if (todaysSchedules.length === 0) {
    return {
      status: "free",
      message: "Available all day",
      currentSubject: "",
    };
  }

  for (const sched of todaysSchedules) {
    const start = toMinutes(sched.startTime);
    const end = toMinutes(sched.endTime);

    if (
      currentMinutes >= start &&
      currentMinutes < end
    ) {
      return {
        status: "occupied",
        message: `Available at ${format12Hour(
          sched.endTime
        )}`,
        currentSubject: `${sched.subject} • ${sched.section}`,
      };
    }

    if (currentMinutes < start) {
      return {
        status: "free",
        message: `Available until ${format12Hour(
          sched.startTime
        )}`,
        currentSubject: "",
      };
    }
  }

  return {
    status: "free",
    message: "Available for the rest of today",
    currentSubject: "",
  };
};

export default function DepartmentHeadDashboard() {
  const navigate = useNavigate();
  const [activeFloor, setActiveFloor] = useState("All Floors");
  const [rooms, setRooms] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupied: 0,
    available: 0,
    maintenance: 0,
    roomActivity:0,
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

    const roomUnsubs = [];

    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {


        let roomList = [];

        snapshot.docs.forEach((roomDoc) => {

          const room = roomDoc.data();

          const unsubSchedules = onSnapshot(

            collection(db, "rooms", roomDoc.id, "schedules"),

            (scheduleSnap) => {

              const schedules = scheduleSnap.docs.map(doc=>({

                id:doc.id,

                ...doc.data()

              }));

              roomList = roomList.filter(r=>r.docId!==roomDoc.id);

              roomList.push({

                docId:roomDoc.id,

                roomName:room.roomName,

                roomType:room.roomType,

                floor:room.floor,

                statusField:room.status,

                image:room.image || null,

                schedules

              });

              let occupied = 0;

              let available = 0;

              let maintenance = 0;

              let scheduledToday = 0;

              const processedRooms = roomList.map(r=>{

                const live = getRoomLiveStatus(r,r.schedules);

                const today = getCurrentDay();

                const hasTodaySchedule = r.schedules.some(
                  s=>s.day===today
                );

                if(hasTodaySchedule)
                  scheduledToday++;

                if(live.status==="occupied")
                  occupied++;

                else if(live.status==="maintenance")
                  maintenance++;

                else
                  available++;

                return{

                  id:r.docId,

                  roomName:r.roomName,

                  roomType:r.roomType,

                  floor:r.floor,

                  image:r.image,

                  schedules:r.schedules,

                  status:live.status,

                  liveMessage:live.message,

                  currentSubject:live.currentSubject

                };

              });

              setRooms(processedRooms);

              setStats({

                totalRooms:processedRooms.length,

                occupied,

                available,

                maintenance,

              });

              setLastUpdated(new Date());

              setLoading(false);

            }

          );

          roomUnsubs.push(unsubSchedules);

        });

      }

    );

    const refreshInterval = setInterval(()=>{

        setLastUpdated(new Date());

        setRooms(old=>[...old]);

    },60000);

    return()=>{

        unsubRooms();

        roomUnsubs.forEach(u=>u());

        clearInterval(refreshInterval);

    };

  },[]);

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

              <span className="dept-db-legend-item green">

                  AVAILABLE

              </span>

              <span className="dept-db-legend-item red">

                  OCCUPIED

              </span>

              <span
                  className="dept-db-legend-item"
                  style={{
                      background:"#f3f4f6",
                      color:"#6b7280",
                      border:"1px solid #d1d5db"
                  }}
              >

                  MAINTENANCE

              </span>

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

            ) : (

              rooms
                .filter(room =>

                  activeFloor === "All Floors"
                    ? true
                    : normalize(room.floor) === normalize(activeFloor)

                )

                .sort((a,b)=>

                  a.roomName.localeCompare(
                    b.roomName,
                    undefined,
                    {numeric:true}
                  )

                )

                .map(room=>(

                  <div
                    key={room.id}
                    className={`dept-db-room-card ${room.status}`}
                  >

                    {/* HEADER */}

                    <div className="dept-db-room-card-header">

                      <span className="dept-db-room-id">

                        {room.roomName}

                      </span>

                      <span
                        className={`dept-db-status-dot ${room.status}`}
                      ></span>

                    </div>

                    {/* IMAGE */}

                    <div className="dept-db-room-card-img">

                      <img

                        src={room.image || classroomImg}

                        alt={room.roomName}

                        className="dept-db-room-img"

                      />

                      {room.status==="occupied" && (

                        <div className="dept-db-in-use-badge">

                          IN USE

                        </div>

                      )}

                      {room.status==="maintenance" && (

                        <div
                          className="dept-db-in-use-badge"
                          style={{

                            background:"#6b7280"

                          }}
                        >

                          MAINTENANCE

                        </div>

                      )}

                    </div>

                    {/* ROOM TYPE */}

                    <p
                      style={{
                        marginBottom:4,
                        fontWeight:700,
                        fontSize:13,
                        color:"#374151"
                      }}
                    >

                      {room.roomType}

                    </p>

                    {/* STATUS */}

                    <p
                      className={`dept-db-room-label ${room.status}`}
                    >

                      {room.liveMessage}

                    </p>

                    {/* CURRENT SUBJECT */}

                    {room.currentSubject && (

                      <small
                        style={{

                          display:"block",

                          marginTop:8,

                          color:"#6b7280",

                          fontSize:11,

                          fontWeight:600

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