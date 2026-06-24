import { useState } from "react";
import "./room-activity.css";
import { useNavigate } from "react-router-dom";

const PLACEHOLDER_CONFLICTS = [
  { id: 1, code: "PERDEV",  time: "07:00 AM - 10:00 AM" },
  { id: 2, code: "IT311",   time: "11:00 AM - 2:00 PM"  },
];

export default function RoomActivity() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title:    "CICT Event Meeting 2026",
    room:     "SDL1",
    date:     "10/21/2026",
    duration: "3 Hours",
    startTime:"9:00 AM",
    endTime:  "12:00 AM",
    reason:   "",
  });
  const [showModal, setShowModal] = useState(false);

  const handleChange = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleConfirm = () => {
    setShowModal(false);
    alert("Override confirmed!");
  };

  return (
    <>
    <div className="ra-page">
      <h1 className="ra-title">Room Activity</h1>

      <div className="ra-layout">

        <div className="ra-card">
          <div className="ra-card-title">
            <span className="ra-card-bar" />
            Activity Details
          </div>

          <div className="ra-form">
            <div className="ra-field">
              <label>Activity Title</label>
              <input
                className="ra-input"
                value={form.title}
                onChange={handleChange("title")}
              />
            </div>

            <div className="ra-field">
              <label>Assigned Room</label>
              <div className="ra-input ra-select-wrap">
                <i className="fa-regular fa-building" />
                <select
                  className="ra-select"
                  value={form.room}
                  onChange={handleChange("room")}
                >
                  <option>SDL1</option>
                  <option>SDL2</option>
                  <option>Room A1</option>
                  <option>Room A2</option>
                  <option>Room B1</option>
                </select>
                <i className="fa-solid fa-chevron-down ra-chevron" />
              </div>
            </div>

            <div className="ra-row">
              <div className="ra-field">
                <label>Date</label>
                <div className="ra-input ra-icon-input">
                  <i className="fa-regular fa-calendar" />
                  <input
                    className="ra-plain-input"
                    value={form.date}
                    onChange={handleChange("date")}
                  />
                </div>
              </div>
              <div className="ra-field">
                <label>Duration</label>
                <input
                  className="ra-input"
                  value={form.duration}
                  onChange={handleChange("duration")}
                />
              </div>
            </div>

            <div className="ra-row">
              <div className="ra-field">
                <label>Start Time</label>
                <div className="ra-input ra-icon-input">
                  <i className="fa-regular fa-clock" />
                  <input
                    className="ra-plain-input"
                    value={form.startTime}
                    onChange={handleChange("startTime")}
                  />
                </div>
              </div>
              <div className="ra-field">
                <label>End Time</label>
                <div className="ra-input ra-icon-input">
                  <i className="fa-regular fa-clock" />
                  <input
                    className="ra-plain-input"
                    value={form.endTime}
                    onChange={handleChange("endTime")}
                  />
                </div>
              </div>
            </div>

            <div className="ra-field">
              <label>Override Reason</label>
              <textarea
                className="ra-textarea"
                placeholder="Briefly explain the need for this override..."
                value={form.reason}
                onChange={handleChange("reason")}
              />
            </div>
          </div>
        </div>

        <div className="ra-conflict-card">
          <div className="ra-conflict-title">
            <i className="fa-solid fa-triangle-exclamation" />
            Conflict Detected
          </div>
          <div className="ra-conflict-desc">
            The selected room is occupied during the requested timeframe.
            Creating this override will displace the following schedules:
          </div>

          <div className="ra-conflict-list">
            {PLACEHOLDER_CONFLICTS.map(c => (
              <div className="ra-conflict-item" key={c.id}>
                <div>
                  <div className="ra-conflict-code">{c.code}</div>
                  <div className="ra-conflict-time">{c.time}</div>
                </div>
                      <button 
        className="ra-reassign-btn" 
        onClick={() => navigate("/department-head/reassign-room", { state: { from: "/department-head/room-activity" } })}>REASSIGN ROOM
      </button>
              </div>
            ))}
          </div>

          <div className="ra-conflict-info">
            <i className="fa-solid fa-circle-info" />
            <span>Auto-notification will be sent to Professors regarding the displacement and room reassignment request.</span>
          </div>
        </div>
      </div>

      <div className="ra-footer">
        <button className="ra-confirm-btn" onClick={() => setShowModal(true)}>
          Confirm Override
        </button>
      </div>

      {showModal && (
        <div className="ra-modal-overlay">
          <div className="ra-modal">
            <div className="ra-modal-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3 className="ra-modal-title">Are you sure?</h3>
            <div className="ra-modal-text">Do you want to proceed<br />with this operation?</div>
            <button className="ra-modal-cancel"  onClick={() => setShowModal(false)}>Cancel</button>
            <button className="ra-modal-confirm" onClick={handleConfirm}>Confirm</button>
          </div>
        </div>
      )}
    </div>
    </>

  );
}