import { useState } from "react";
import "./room-usage-tracking.css";
import DepartmentHeadNav from "../../Components/DepartmentHeadNav/DepartmentHeadNav";

const PLACEHOLDER_HISTORY = [
  { date: "Oct 24, 2026", time: "11:00 AM - 02:00 PM", subject: "PERDEV",   faculty: "Juan Dela Cruz", status: "COMPLETED" },
  { date: "Oct 24, 2026", time: "07:00 AM - 10:00 AM", subject: "CAPS 301", faculty: "Juan Dela Cruz", status: "COMPLETED" },
  { date: "Oct 23, 2026", time: "01:00 PM - 04:00 PM", subject: "IT308",    faculty: "Juan Dela Cruz", status: "COMPLETED" },
  { date: "Oct 23, 2026", time: "07:00 AM - 10:00 AM", subject: "PERDEV",   faculty: "Maria Santos",   status: "COMPLETED" },
  { date: "Oct 22, 2026", time: "09:00 AM - 12:00 PM", subject: "IT302",    faculty: "Liza Gomez",     status: "COMPLETED" },
];

export default function RoomUsageTracking() {
  const [activeTab, setActiveTab] = useState("current");
  const [room, setRoom]           = useState("Room A1");
  const [date, setDate]           = useState("10/25/2026");

  return (
    <>
      <DepartmentHeadNav activePage="room-usage-tracking" />
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
              <option>Room A1</option>
              <option>Room A2</option>
              <option>Room B1</option>
              <option>Room SDL1</option>
              <option>Room SDL2</option>
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
                <span className="rut-live-dot" />
                <span className="rut-live-label">Live Status: {room}</span>
              </div>
              <span className="rut-status-badge occupied">OCCUPIED</span>
            </div>

            <div className="rut-live-grid">
              <div className="rut-live-item">
                <div className="rut-live-item-header">
                  <div className="rut-icon-circle">
                    <i className="fa-solid fa-graduation-cap" />
                  </div>
                  <span className="rut-item-label">SUBJECT / EVENT</span>
                </div>
                <span className="rut-item-value large">IT302</span>
              </div>

              <div className="rut-live-item">
                <div className="rut-live-item-header">
                  <div className="rut-icon-circle">
                    <i className="fa-regular fa-building" />
                  </div>
                  <span className="rut-item-label">RESERVATION HOLDER</span>
                </div>
                <span className="rut-item-value">Registrar Office</span>
                <span className="rut-item-sub">Scheduled Recurring Booking</span>
              </div>

              <div className="rut-live-item">
                <div className="rut-live-item-header">
                  <div className="rut-icon-circle">
                    <i className="fa-regular fa-user" />
                  </div>
                  <span className="rut-item-label">ASSIGNED FACULTY</span>
                </div>
                <span className="rut-item-value">Juan Dela Cruz</span>
              </div>

              <div className="rut-live-item">
                <div className="rut-live-item-header">
                  <div className="rut-icon-circle">
                    <i className="fa-regular fa-clock" />
                  </div>
                  <span className="rut-item-label">DURATION</span>
                </div>
                <span className="rut-item-value">9:00 AM - 12:00 PM</span>
                <span className="rut-item-sub orange">45 minutes remaining</span>
              </div>
            </div>

            <div className="rut-progress-bar">
              <div className="rut-progress-fill" style={{ width: "70%" }} />
            </div>
          </div>

          <div className="rut-right-col">
            <div className="rut-specs-card">
              <div className="rut-specs-header">
                <i className="fa-solid fa-circle-info" />
                <span>Room Specs</span>
              </div>
              <div className="rut-specs-row">
                <span className="rut-specs-key">Capacity</span>
                <span className="rut-specs-val">30 Students</span>
              </div>
              <div className="rut-specs-row">
                <span className="rut-specs-key">A/V Setup</span>
                <span className="rut-specs-val">Projector, Audio</span>
              </div>
              <div className="rut-specs-row">
                <span className="rut-specs-key">Type</span>
                <span className="rut-specs-val">Lecture Hall</span>
              </div>
            </div>

            <div className="rut-next-card">
              <span className="rut-next-label">Next Schedule</span>
              <span className="rut-next-subject">IT311</span>
              <div className="rut-next-footer">
                <span className="rut-next-time">TODAY, 01:00 PM</span>
                <button className="rut-details-btn">Details</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="rut-history-placeholder">
          <p>Historical log coming soon.</p>
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
            {PLACEHOLDER_HISTORY.map((row, i) => (
              <tr key={i}>
                <td>
                  <div className="rut-date-cell">
                    <span className="rut-date">{row.date}</span>
                    <span className="rut-time">{row.time}</span>
                  </div>
                </td>
                <td className="rut-subject">{row.subject}</td>
                <td>{row.faculty}</td>
                <td><span className={`rut-badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>
                  <button className="rut-action-btn">⋮</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>

  );
}