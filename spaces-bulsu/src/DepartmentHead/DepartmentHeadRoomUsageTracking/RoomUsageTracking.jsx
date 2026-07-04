import "./room-usage-tracking.css";

import { useEffect, useMemo, useState } from "react";
import "./room-usage-tracking.css";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

const timeToMinutes = (time) => {
  if (!time) return 0;

  const [clock, period] = time.trim().split(" ");
  let [hour, minute] = clock.split(":").map(Number);

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
};

const getStatus = (start, end) => {
  const now = new Date();

  const current =
    now.getHours() * 60 +
    now.getMinutes();

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (current >= startMin && current <= endMin)
    return "ONGOING";

  if (current < startMin)
    return "UPCOMING";

  return "COMPLETED";
};

export default function RoomUsageTracking() {
 const [activeTab, setActiveTab] = useState("current");

  const [rooms, setRooms] = useState([]);

  const [room, setRoom] = useState("");

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [allSchedules, setAllSchedules] = useState([]);

  const [currentSchedule, setCurrentSchedule] = useState(null);

  const [nextSchedule, setNextSchedule] = useState(null);

  const [history, setHistory] = useState([]);

  const [lastUser, setLastUser] = useState(null);

  const [historyPage, setHistoryPage] = useState(1);

  const HISTORY_PAGE_SIZE = 10;

  const [loading, setLoading] = useState(true);

  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

  const [analytics, setAnalytics] = useState({
      totalSchedules: 0,
      completed: 0,
      ongoing: 0,
      upcoming: 0,
      utilization: 0,
  });

  useEffect(() => {

    loadRooms();

    const interval = setInterval(() => {

        loadRooms();

    }, 30000);

    return () => clearInterval(interval);

}, []);

  useEffect(() => {

    if (!allSchedules.length) return;

    trackRoom();

    buildHistory();

    buildAnalytics();

}, [room, date, allSchedules]);

  const loadRooms = async () => {

    setLoading(true);

    try {

      const roomSnap = await getDocs(
        collection(db, "rooms")
      );

      const roomList = [];

      const scheduleList = [];

      for (const roomDoc of roomSnap.docs) {

        const roomData = {
          id: roomDoc.id,
          ...roomDoc.data(),
        };

        roomList.push(roomData);

        const scheduleSnap = await getDocs(
          collection(db, "rooms", roomDoc.id, "schedules")
        );

        scheduleSnap.forEach(doc => {

          scheduleList.push({

            id: doc.id,

            roomId: roomDoc.id,

            roomName:
              roomData.roomName ||
              roomData.name,

            ...doc.data(),

          });

        });

      }

      setRooms(roomList);

      setAllSchedules(scheduleList);

      if (
        roomList.length &&
        !room
      ) {

        setRoom(
          roomList[0].roomName ||
          roomList[0].name
        );

      }

    }

    catch (err) {

      console.log(err);

    }

    setLoading(false);

  };

  const trackRoom = () => {

    const currentDate = date || todayString();

    const schedules = allSchedules
        .filter(schedule =>
            schedule.roomName === room &&
            schedule.date === currentDate
        )
        .sort(
            (a, b) =>
                timeToMinutes(a.startTime) -
                timeToMinutes(b.startTime)
        );

    const now = getCurrentMinutes();

    let current = null;

    let next = null;

    const upcoming = [];

    for (let i = 0; i < schedules.length; i++) {

        const start = timeToMinutes(schedules[i].startTime);

        const end = timeToMinutes(schedules[i].endTime);

        if (now >= start && now <= end) {

            current = schedules[i];

            next = schedules[i + 1] || null;

        }

        if (start > now) {

            upcoming.push(schedules[i]);

        }

    }

    setCurrentSchedule(current);

    setNextSchedule(next);

    setUpcomingSchedules(upcoming);

};

    const calculateProgress = (schedule) => {

      if (!schedule) return 0;

      const now = new Date();

      const current =
          now.getHours()*60 +
          now.getMinutes();

      const start =
          timeToMinutes(schedule.startTime);

      const end =
          timeToMinutes(schedule.endTime);

      if(current<=start) return 0;

      if(current>=end) return 100;

      return (
          ((current-start)/(end-start))*100
      );

  };

  const todayString = () => {

    return new Date().toISOString().split("T")[0];

};

const getCurrentMinutes = () => {

    const now = new Date();

    return now.getHours() * 60 + now.getMinutes();

};

const formatDate = (date) => {

    return new Date(date).toLocaleDateString();

};

  const buildHistory = () => {

    const historyData = allSchedules

        .filter(schedule =>

            schedule.roomName === room

        )

        .sort((a, b) => {

            const dateA = new Date(
                `${a.date} ${a.startTime}`
            );

            const dateB = new Date(
                `${b.date} ${b.startTime}`
            );

            return dateB - dateA;

        });

    setHistory(historyData);

    const completed = historyData.filter(schedule => {

        const scheduleDate = schedule.date;

        const today = todayString();

        if (scheduleDate < today)
            return true;

        if (scheduleDate > today)
            return false;

        return getStatus(
            schedule.startTime,
            schedule.endTime
        ) === "COMPLETED";

    });

    setLastUser(completed[0] || null);

};

const buildAnalytics = () => {

    const today = todayString();

    const schedules = allSchedules.filter(schedule =>
        schedule.roomName === room &&
        schedule.date === today
    );

    let completed = 0;
    let ongoing = 0;
    let upcoming = 0;

    let occupiedMinutes = 0;

    schedules.forEach(schedule => {

        const status = getStatus(
            schedule.startTime,
            schedule.endTime
        );

        if(status === "COMPLETED") completed++;

        if(status === "ONGOING") ongoing++;

        if(status === "UPCOMING") upcoming++;

        occupiedMinutes +=
            timeToMinutes(schedule.endTime) -
            timeToMinutes(schedule.startTime);

    });

    const utilization = Math.min(
        100,
        Math.round((occupiedMinutes / (12 * 60)) * 100)
    );

    setAnalytics({

        totalSchedules: schedules.length,

        completed,

        ongoing,

        upcoming,

        utilization

    });

};

  return (
    <>
    <div className="rut-page">

      <div className="rut-header">
        <h1 className="rut-title">Room Usage Tracking</h1>
        <p className="rut-subtitle">Investigate real-time occupancy and historical usage patterns for any campus facility.</p>
      </div>

      <div className="rut-filter-bar">
        <div className="rut-filter-group">
          <span className="rut-filter-label">SELECT ROOM</span>
          <div className="rut-filter-input">
            <i className="fa-regular fa-building" />
            <select value={room} onChange={e => setRoom(e.target.value)} className="rut-select">
              {rooms.map(room => (

              <option
                  key={room.id}
                  value={room.roomName || room.name}
              >

                  {room.roomName || room.name}

              </option>

              ))}
            </select>
            <i className="fa-solid fa-chevron-down rut-chevron" />
          </div>
        </div>

        <div className="rut-filter-group">
          <span className="rut-filter-label">SELECT DATE</span>
          <div className="rut-filter-input">
            <i className="fa-regular fa-calendar" />
            <input
              type="text"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rut-date-input"
            />
          </div>
        </div>

        <div className="rut-filter-group">
          <span className="rut-filter-label">TIME SLOT</span>
          <div className="rut-filter-input">
            <i className="fa-regular fa-clock" />
            <select className="rut-select">
              <option>Current (Now)</option>
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Evening</option>
            </select>
            <i className="fa-solid fa-chevron-down rut-chevron" />
          </div>
        </div>

        <div className="rut-analytics">

          <div className="rut-analytics-card">

              <h3>

                  Total Schedule

              </h3>

              <h1>

                  {analytics.totalSchedules}

              </h1>

          </div>

          <div className="rut-analytics-card">

              <h3>

                  Completed

              </h3>

              <h1>

                  {analytics.completed}

              </h1>

          </div>

          <div className="rut-analytics-card">

              <h3>

                  Ongoing

              </h3>

              <h1>

                  {analytics.ongoing}

              </h1>

          </div>

          <div className="rut-analytics-card">

              <h3>

                  Upcoming

              </h3>

              <h1>

                  {analytics.upcoming}

              </h1>

          </div>

          <div className="rut-analytics-card utilization">

              <h3>

                  Utilization

              </h3>

              <h1>

                  {analytics.utilization}%

              </h1>

          </div>

      </div>

        <button className="rut-track-btn">
          <i className="fa-solid fa-magnifying-glass" />
          Track Usage
        </button>
      </div>

      <div className="rut-tabs">
        <button
          className={`rut-tab ${activeTab === "current" ? "active" : ""}`}
          onClick={() => setActiveTab("current")}
        >
          Current/Upcoming Usage
        </button>
        <button
          className={`rut-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Historical Log
        </button>
      </div>

      {activeTab === "current" && (

      <div className="rut-current-layout">

          <div className="rut-live-card">

              <div className="rut-live-header">

                  <div className="rut-live-indicator">

                      <span className="rut-live-dot"></span>

                      <span className="rut-live-label">

                          Live Status : {room}

                      </span>

                  </div>

                  <span
                      className={`rut-status-badge ${
                          currentSchedule
                              ? "occupied"
                              : "vacant"
                      }`}
                  >

                      {currentSchedule
                          ? "OCCUPIED"
                          : "VACANT"}

                  </span>

              </div>

              {currentSchedule ? (

                  <>

                      <div className="rut-live-grid">

                          <div className="rut-live-item">

                              <div className="rut-live-item-header">

                                  <div className="rut-icon-circle">

                                      <i className="fa-solid fa-book"/>

                                  </div>

                                  <span className="rut-item-label">

                                      SUBJECT

                                  </span>

                              </div>

                              <span className="rut-item-value large">

                                  {currentSchedule.subject}

                              </span>

                          </div>

                          <div className="rut-live-item">

                              <div className="rut-live-item-header">

                                  <div className="rut-icon-circle">

                                      <i className="fa-solid fa-building"/>

                                  </div>

                                  <span className="rut-item-label">

                                      RESERVED BY

                                  </span>

                              </div>

                              <span className="rut-item-value">

                                  {currentSchedule.organization ||
                                      currentSchedule.department ||
                                      "N/A"}

                              </span>

                          </div>

                          <div className="rut-live-item">

                              <div className="rut-live-item-header">

                                  <div className="rut-icon-circle">

                                      <i className="fa-solid fa-user"/>

                                  </div>

                                  <span className="rut-item-label">

                                      FACULTY

                                  </span>

                              </div>

                              <span className="rut-item-value">

                                  {currentSchedule.facultyName}

                              </span>

                          </div>

                          <div className="rut-live-item">

                              <div className="rut-live-item-header">

                                  <div className="rut-icon-circle">

                                      <i className="fa-solid fa-clock"/>

                                  </div>

                                  <span className="rut-item-label">

                                      TIME

                                  </span>

                              </div>

                              <span className="rut-item-value">

                                  {currentSchedule.startTime}

                                  {" - "}

                                  {currentSchedule.endTime}

                              </span>

                          </div>

                      </div>

                      <div className="rut-progress-bar">

                          <div
                              className="rut-progress-fill"
                              style={{
                                  width:
                                      `${calculateProgress(currentSchedule)}%`
                              }}
                          />

                      </div>

                  </>

              ) : (

                  <div
                      style={{
                          padding:"50px",
                          textAlign:"center"
                      }}
                  >

                      <h2>

                          Room is currently available.

                      </h2>

                  </div>

              )}

          </div>

          <div className="rut-right-col">

              <div className="rut-specs-card">

                  <div className="rut-specs-header">

                      <i className="fa-solid fa-circle-info"/>

                      <span>

                          Room Information

                      </span>

                  </div>

                  {rooms
                      .filter(r =>
                          (r.roomName || r.name) === room
                      )
                      .map(r=>(

                      <>

                          <div className="rut-specs-row">

                              <span className="rut-specs-key">

                                  Capacity

                              </span>

                              <span className="rut-specs-val">

                                  {r.capacity || "-"}

                              </span>

                          </div>

                          <div className="rut-specs-row">

                              <span className="rut-specs-key">

                                  Type

                              </span>

                              <span className="rut-specs-val">

                                  {r.roomType || "-"}

                              </span>

                          </div>

                          <div className="rut-specs-row">

                              <span className="rut-specs-key">

                                  Floor

                              </span>

                              <span className="rut-specs-val">

                                  {r.floor || "-"}

                              </span>

                          </div>

                      </>

                  ))}

              </div>

              <div className="rut-next-card">

                <span className="rut-next-label">

                    TODAY'S UPCOMING

                </span>

                {

                    upcomingSchedules.length === 0 ?

                    (

                        <div
                            style={{
                                color:"#fff",
                                marginTop:15
                            }}
                        >

                            No more schedules today.

                        </div>

                    )

                    :

                    upcomingSchedules.map(schedule=>(

                        <div
                            key={schedule.id}
                            className="rut-upcoming-item"
                        >

                            <div className="rut-upcoming-subject">

                                {schedule.subject}

                            </div>

                            <div className="rut-upcoming-info">

                                {schedule.startTime}

                                {" - "}

                                {schedule.endTime}

                            </div>

                            <div className="rut-upcoming-info">

                                {schedule.facultyName}

                            </div>

                        </div>

                    ))

                }

            </div>

          </div>

      </div>

      )}

      {activeTab==="history" && (

      <div className="rut-live-card">

      <h2
      style={{
      marginBottom:20
      }}
      >

      Historical Room Usage

      </h2>

      <div
      style={{
      marginBottom:20
      }}
      >

      <strong>

      Last User

      </strong>

      <br/>

      {lastUser ? (

      <>

      {lastUser.facultyName}

      <br/>

      {lastUser.subject}

      <br/>

      {lastUser.date}

      <br/>

      {lastUser.startTime} - {lastUser.endTime}

      </>

      ):(

      "No previous usage."

      )}

      </div>

      <div className="rut-progress-bar">

      <div
      className="rut-progress-fill"
      style={{
      width:"100%"
      }}
      />

      </div>

      </div>

      )}

      <div className="rut-history-section">
        <div className="rut-history-header">
          <h2 className="rut-history-title">Recent History Log</h2>
          <button className="rut-export-btn">
            <i className="fa-solid fa-download" />
            Export
          </button>
        </div>

        <table className="rut-table">
          <thead>
            <tr>
              <th>DATE &amp; TIME</th>
              <th>SUBJECT/EVENT</th>
              <th>FACULTY</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>

          {history

          .slice(

          (historyPage-1)*HISTORY_PAGE_SIZE,

          historyPage*HISTORY_PAGE_SIZE

          )

          .map(schedule=>(

          <tr key={schedule.id}>

          <td>

          <div className="rut-date-cell">

          <span className="rut-date">

          {schedule.date}

          </span>

          <span className="rut-time">

          {schedule.startTime}

          {" - "}

          {schedule.endTime}

          </span>

          </div>

          </td>

          <td className="rut-subject">

          {schedule.subject}

          </td>

          <td>

          {schedule.facultyName}

          </td>

          <td>

          <span
          className={`rut-badge ${getStatus(
          schedule.startTime,
          schedule.endTime
          ).toLowerCase()}`}

          >

          {getStatus(
          schedule.startTime,
          schedule.endTime
          )}

          </span>

          </td>

          <td>

          <button
          className="rut-action-btn"
          onClick={()=>{

          alert(

          `Faculty : ${schedule.facultyName}

          Subject : ${schedule.subject}

          Section : ${schedule.section}

          Program : ${schedule.program}

          Date : ${schedule.date}

          Time : ${schedule.startTime} - ${schedule.endTime}`

          );

          }}

          >

          <i className="fa-solid fa-eye"/>

          </button>

          </td>

          </tr>

          ))}

          </tbody>
        </table>

      </div>
    </div>

    <div className="rut-pagination">

      <button

      disabled={historyPage===1}

      onClick={()=>setHistoryPage(p=>p-1)}

      >

      <i className="fa-solid fa-chevron-left"/>

      </button>

      <span>

      Page {historyPage} of {Math.ceil(history.length/HISTORY_PAGE_SIZE)||1}

      </span>

      <button

      disabled={

      historyPage===Math.ceil(history.length/HISTORY_PAGE_SIZE)

      }

      onClick={()=>setHistoryPage(p=>p+1)}

      >

      <i className="fa-solid fa-chevron-right"/>

      </button>

      </div>
    </>

  );
}