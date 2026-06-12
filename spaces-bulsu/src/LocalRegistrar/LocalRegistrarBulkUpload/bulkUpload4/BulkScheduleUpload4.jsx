// BulkScheduleUpload4.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./bulk-schedule-upload4.css";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

export default function BulkScheduleUpload4() {
  const location = useLocation();
  const navigate = useNavigate();
  const { semester, schoolYear, room, schedules } = location.state || {};
  const [showModal, setShowModal] = useState(false);

  const handleConfirm = async () => {
    // Simulate API call
    console.log("Final schedules to save:", { semester, schoolYear, room, schedules });
    alert("Schedules successfully uploaded! (Demo)");
    // navigate back to dashboard or success page
    navigate("/local-registrar");
  };

  if (!location.state) {
    return <div className="bulk-upload-page"><h2>No data to confirm.</h2><button onClick={() => navigate("/local-registrar/bulk-upload-2")}>Start Over</button></div>;
  }

  return (
    <div className="bulk-upload-page">
      <div className="bulk-header">
        <h1>Bulk Schedule Upload</h1>
        <p>Follow the steps to upload and process schedules.</p>
      </div>
      <div className="stepper">
        {steps.map((step, index) => (
          <div className="step-wrapper" key={step.number}>
            <div className="step-item">
              <div className={`step-circle ${step.number < 4 ? "completed" : step.number === 4 ? "active" : ""}`}>
                {step.number < 4 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label ${step.number === 4 ? "active" : ""}`}>{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className={`step-line ${step.number < 4 ? "completed" : ""}`} />}
          </div>
        ))}
      </div>
      <div className="form-card">
        <div className="info-card">
          <span className="info-title">Schedule Information</span>
          <div className="info-row">
            <div className="info-group"><span className="info-label">Semester</span><span className="info-value">{semester}</span></div>
            <div className="info-group"><span className="info-label">School Year</span><span className="info-value">{schoolYear}</span></div>
            <div className="info-group"><span className="info-label">Room</span><span className="info-value">{room}</span></div>
          </div>
        </div>
        <div className="schedule-preview-list">
          <h3>Extracted Schedules ({schedules.length})</h3>
          {schedules.map(s => (
            <div key={s.id} className="preview-item">
              <strong>{s.code}</strong> – {s.name}<br />
              Day: {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][s.day-1]}, {s.startH.toString().padStart(2,"0")}:{s.startM.toString().padStart(2,"0")} - {s.endH.toString().padStart(2,"0")}:{s.endM.toString().padStart(2,"0")}, Faculty: {s.faculty}, Room: {s.room}
            </div>
          ))}
        </div>
      </div>
      <div className="bulk-footer">
        <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-confirm" onClick={() => setShowModal(true)}>Confirm Upload</button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <h2 className="modal-title">Are you sure?</h2>
            <p className="modal-text">Do you want to proceed with this operation?</p>
            <button className="modal-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="modal-btn-confirm" onClick={handleConfirm}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}