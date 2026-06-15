import { useState } from "react";
import "./bulk-schedule-upload3.css";
import { useNavigate, useLocation } from "react-router-dom";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 60;

function getTopFromStart(hour, minute) {
  const startTotal = START_HOUR * 60;
  const total = hour * 60 + minute;
  const diff = total - startTotal;
  return (diff / 60) * HOUR_HEIGHT;
}

function getBlockHeight(startH, startM, endH, endM) {
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const duration = endTotal - startTotal;
  return (duration / 60) * HOUR_HEIGHT;
}

const colourPalette = [
  "#4a6cf7", "#f7b84d", "#f06548", "#3bc14a", "#e83e8c",
  "#6f42c1", "#fd7e14", "#20c997", "#d63384", "#6610f2"
];

// ---------- Edit Modal with Section ----------
function EditScheduleModal({ schedule, onSave, onClose }) {
  const [code, setCode] = useState(schedule.code);
  const [name, setName] = useState(schedule.name);
  const [day, setDay] = useState(schedule.day);
  const [startH, setStartH] = useState(schedule.startH);
  const [startM, setStartM] = useState(schedule.startM);
  const [endH, setEndH] = useState(schedule.endH);
  const [endM, setEndM] = useState(schedule.endM);
  const [faculty, setFaculty] = useState(schedule.faculty);
  const [section, setSection] = useState(schedule.section || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...schedule,
      code: code.trim(),
      name: name.trim(),
      day: parseInt(day),
      startH: parseInt(startH),
      startM: parseInt(startM),
      endH: parseInt(endH),
      endM: parseInt(endM),
      faculty: faculty.trim() || "TBA",
      section: section.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Schedule</h3>
        <form onSubmit={handleSubmit}>
          <label>Course Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} required />

          <label>Course Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />

          <label>Day</label>
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d, idx) => (
              <option key={idx} value={idx + 1}>{d}</option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label>Start Time</label>
              <div>
                <input type="number" value={startH} onChange={(e) => setStartH(e.target.value)} min={0} max={23} step="1" style={{width: "60px"}} />
                :
                <input type="number" value={startM} onChange={(e) => setStartM(e.target.value)} min={0} max={59} step="1" style={{width: "60px"}} />
              </div>
            </div>
            <div>
              <label>End Time</label>
              <div>
                <input type="number" value={endH} onChange={(e) => setEndH(e.target.value)} min={0} max={23} step="1" style={{width: "60px"}} />
                :
                <input type="number" value={endM} onChange={(e) => setEndM(e.target.value)} min={0} max={59} step="1" style={{width: "60px"}} />
              </div>
            </div>
          </div>

          <label>Faculty</label>
          <input value={faculty} onChange={(e) => setFaculty(e.target.value)} />

          <label>Section</label>
          <input value={section} onChange={(e) => setSection(e.target.value)} />

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function BulkScheduleUpload3() {
  const navigate = useNavigate();
  const location = useLocation();

  if (!location.state) {
    return (
      <div className="bulk-upload-page">
        <h2>No session data found.</h2>
        <button className="btn-next" onClick={() => navigate("/local-registrar/bulk-upload-2")}>
          Start Again
        </button>
      </div>
    );
  }

  const { semester, schoolYear, room, schedules: initialSchedules } = location.state;
  const [schedules, setSchedules] = useState(initialSchedules);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Debug logs – remove after testing
  console.log("📅 Schedules received:", schedules);
  console.log("First schedule day:", schedules[0]?.day);

  // Real‑time week dates (Monday to Sunday)
  const today = new Date();
  const currentMonday = new Date(today);
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentMonday.setDate(today.getDate() + daysToMonday);
  const displayMonday = new Date(currentMonday);
  displayMonday.setDate(currentMonday.getDate() + weekOffset * 7);

  const weekEnd = new Date(displayMonday);
  weekEnd.setDate(displayMonday.getDate() + 6);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const weekLabel = `${monthNames[displayMonday.getMonth()]} ${displayMonday.getDate()} - ${weekEnd.getDate()}, ${displayMonday.getFullYear()}`;

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(displayMonday);
    d.setDate(displayMonday.getDate() + i);
    return d.getDate();
  });

  const handleUpdateSchedule = (updated) => {
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
    setEditingSchedule(null);
  };

  const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="bulk-upload-page">
      <div className="bulk-header">
        <h1>Bulk Schedule Upload</h1>
        <p>Follow the steps to upload and process schedules.</p>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {steps.map((step, index) => (
          <div className="step-wrapper" key={step.number}>
            <div className="step-item">
              <div className={`step-circle ${step.number < 3 ? "completed" : ""} ${step.number === 3 ? "active" : ""}`}>
                {step.number < 3 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label ${step.number === 3 ? "active" : ""}`}>{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${step.number < 3 ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {/* Calendar Card */}
      <div className="form-card calendar-card">
        <div className="calendar-header">
          <div className="week-nav">
            <i className="fa-solid fa-chevron-left" onClick={() => setWeekOffset(w => w - 1)} />
            <span>{weekLabel}</span>
            <i className="fa-solid fa-chevron-right" onClick={() => setWeekOffset(w => w + 1)} />
          </div>
          <div className="room-pill">
            {room} <span className="caret">&#9660;</span>
          </div>
        </div>

        {/* Day headers */}
        <div className="days-header">
          <div className="time-offset" />
          {DAYS.map((d, i) => (
            <div className="day-cell" key={d}>
              <span className="day-name">{d}</span>
              <span className="day-date">{dayDates[i]}</span>
            </div>
          ))}
        </div>
        <hr className="days-divider" />

        {/* Scrollable grid */}
        <div className="scroll-area">
          <div className="cal-grid" style={{ height: totalGridHeight }}>
            {/* Time column */}
            <div className="time-col">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
                const h = START_HOUR + i;
                const label = h < 12 ? `${String(h).padStart(2, "0")} AM` : h === 12 ? "12 PM" : `${String(h - 12).padStart(2, "0")} PM`;
                return (
                  <div className="time-slot" key={h}>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            {DAYS.map((_, dayIdx) => {
              const dayNumber = dayIdx + 1;
              const daySchedules = schedules.filter(s => s.day === dayNumber);
              return (
                <div className="day-col" key={dayIdx} style={{ height: totalGridHeight, position: "relative" }}>
                  {/* Hour separator lines */}
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                    <div className="hour-line" key={i} style={{ top: i * HOUR_HEIGHT }} />
                  ))}

                  {/* Schedule blocks */}
                  {daySchedules.map((item) => {
                    const top = getTopFromStart(item.startH, item.startM);
                    const height = getBlockHeight(item.startH, item.startM, item.endH, item.endM);
                    const color = colourPalette[item.colorIdx % colourPalette.length];
                    return (
                      <div
                        key={item.id}
                        className="calendar-event"
                        style={{
                          position: "absolute",
                          top: `${top}px`,
                          height: `${height}px`,
                          left: "4px",
                          right: "4px",
                          backgroundColor: color,
                          borderRadius: "6px",
                          padding: "4px",
                          color: "white",
                          fontSize: "10px",
                          cursor: "pointer",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                        onClick={() => setEditingSchedule(item)}
                      >
                        <div>
                          <strong>{item.code}</strong>
                          {item.section && <span style={{ fontSize: "8px", marginLeft: "4px" }}>({item.section})</span>}
                        </div>
                        <div>
                          {item.startH.toString().padStart(2,"0")}:{item.startM.toString().padStart(2,"0")} - {item.endH.toString().padStart(2,"0")}:{item.endM.toString().padStart(2,"0")}
                        </div>
                        {item.faculty && item.faculty !== "TBA" && (
                          <div style={{ fontSize: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.faculty}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSchedule && (
        <EditScheduleModal
          schedule={editingSchedule}
          onSave={handleUpdateSchedule}
          onClose={() => setEditingSchedule(null)}
        />
      )}

      {/* Navigation buttons */}
      <div className="bulk-footer step2-footer">
        <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
        <button
          className="btn-next"
          onClick={() =>
            navigate("/local-registrar/bulk-upload-4", {
              state: { semester, schoolYear, room, schedules },
            })
          }
        >
          Continue
        </button>
      </div>
    </div>
  );
}