import { useState } from "react";
import "./WalkInReservation.css";

const ROOM_SLOTS = [
  { id: "A1",   available: false },
  { id: "A2",   available: true  },
  { id: "A3",   available: false },
  { id: "A4",   available: true  },
  { id: "IT13", available: false },
  { id: "IT14", available: true  },
];

const LIVE_SCHEDULE = [
  { time: "09:00", label: "Reserved: Faculty Meeting", type: "reserved"  },
  { time: "10:00", label: "Now Booking...",             type: "booking"   },
  { time: "11:00", label: "Available",                  type: "available" },
  { time: "12:00", label: "Available",                  type: "available" },
  { time: "01:00", label: "Reserved: IT312",            type: "reserved"  },
];

export default function WalkInReservation() {
  const [form, setForm] = useState({
    studentId: "", name: "", date: "", duration: "",
    startTime: "", endTime: "", purpose: "",
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [floor, setFloor]               = useState("1st Floor");
  const [showModal, setShowModal]       = useState(false);

  const handleChange = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleConfirm = () => {
    setShowModal(false);
    alert("Booking confirmed!");
  };

  return (
    <>
      <div className="wir-page">

      <h1 className="wir-title">Walk-In Reservation</h1>
      <p className="wir-subtitle">Instant Booking</p>

      <div className="wir-layout">

        <div className="wir-card">

          <div className="wir-section-title">
            <span className="wir-section-bar" />
            Requester Information
          </div>

          <div className="wir-row">
            <div className="wir-field">
              <label>Student or Faculty ID</label>
              <input className="wir-input" placeholder="Enter ID"
                value={form.studentId} onChange={handleChange("studentId")} />
            </div>
            <div className="wir-field">
              <label>Name</label>
              <input className="wir-input" placeholder="Enter name"
                value={form.name} onChange={handleChange("name")} />
            </div>
          </div>

          <div className="wir-section-title" style={{ marginTop: 24 }}>
            <span className="wir-section-bar" />
            Room And Schedule
          </div>

          <div className="wir-slots-header">
            <span className="wir-slots-label">Available Room Slots</span>
            <div className="wir-floor-pill">
              {floor}
              <i className="fa-solid fa-chevron-down" />
            </div>
          </div>

          <div className="wir-slots">
            {ROOM_SLOTS.map(r => (
              <button
                key={r.id}
                className={`wir-slot ${r.available ? "available" : "occupied"} ${selectedRoom === r.id ? "selected" : ""}`}
                onClick={() => r.available && setSelectedRoom(r.id)}
              >
                {r.id}
              </button>
            ))}
          </div>

          <div className="wir-row" style={{ marginTop: 20 }}>
            <div className="wir-field">
              <label>Date</label>
              <div className="wir-icon-input">
                <i className="fa-regular fa-calendar" />
                <input className="wir-plain-input" placeholder="MM/DD/YYYY"
                  value={form.date} onChange={handleChange("date")} />
              </div>
            </div>
            <div className="wir-field">
              <label>Duration</label>
              <input className="wir-input" placeholder=""
                value={form.duration} onChange={handleChange("duration")} />
            </div>
          </div>

          <div className="wir-row">
            <div className="wir-field">
              <label>Start Time</label>
              <div className="wir-icon-input">
                <i className="fa-regular fa-clock" />
                <input className="wir-plain-input" placeholder="-- : -- --"
                  value={form.startTime} onChange={handleChange("startTime")} />
              </div>
            </div>
            <div className="wir-field">
              <label>End Time</label>
              <div className="wir-icon-input">
                <i className="fa-regular fa-clock" />
                <input className="wir-plain-input" placeholder="-- : -- --"
                  value={form.endTime} onChange={handleChange("endTime")} />
              </div>
            </div>
          </div>

          <div className="wir-field">
            <label>Purpose</label>
            <textarea className="wir-textarea" placeholder="Enter purpose..."
              value={form.purpose} onChange={handleChange("purpose")} />
          </div>
        </div>

        <div className="wir-right-col">

          <div className="wir-quick-note">
            <i className="fa-solid fa-circle-info" />
            <div>
              <div className="wir-note-title">Quick Note</div>
              <div className="wir-note-text">Walk-in reservations are limited to a maximum of 4 hours.</div>
            </div>
          </div>

          <div className="wir-availability-card">
            <div className="wir-avail-header">
              <span className="wir-avail-title">Live Availability</span>
              <span className="wir-live-dot" />
            </div>
            <div className="wir-avail-date">TODAY, OCT 24</div>

            <div className="wir-avail-list">
              {LIVE_SCHEDULE.map((s, i) => (
                <div className={`wir-avail-item ${s.type}`} key={i}>
                  <span className="wir-avail-time">{s.time}</span>
                  <span className="wir-avail-label">{s.label}</span>
                </div>
              ))}
            </div>

            <button className="wir-view-btn">View Full Schedule</button>
          </div>
        </div>
      </div>

      <div className="wir-footer">
        <button className="wir-confirm-btn" onClick={() => setShowModal(true)}>
          Confirm Booking
        </button>
      </div>

      {showModal && (
        <div className="wir-modal-overlay">
          <div className="wir-modal">
            <div className="wir-modal-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3 className="wir-modal-title">Are you sure?</h3>
            <p className="wir-modal-text">Do you want to proceed<br />with this operation?</p>
            <button className="wir-modal-cancel"  onClick={() => setShowModal(false)}>Cancel</button>
            <button className="wir-modal-confirm" onClick={handleConfirm}>Confirm</button>
          </div>
        </div>
      )}
    </div>
    </>

  );
}