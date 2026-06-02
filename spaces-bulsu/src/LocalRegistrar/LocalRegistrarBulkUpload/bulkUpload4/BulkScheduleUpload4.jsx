import { useState } from "react";
import "./bulk-schedule-upload4.css";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

export default function BulkScheduleUpload4() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
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
              <span className={`step-label ${step.number === 4 ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${step.number < 4 ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </div>

      <div className="form-card">
        <div className="info-card">
          <span className="info-title">Schedule Information</span>
          <div className="info-row">
            <div className="info-group">
              <span className="info-label">Semester</span>
              <span className="info-value">1st Semester</span>
            </div>
            <div className="info-group">
              <span className="info-label">School Year</span>
              <span className="info-value">2026-2027</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bulk-footer">
        <button className="btn-back">Back</button>
        <button className="btn-confirm" onClick={() => setShowModal(true)}>Confirm Upload</button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2 className="modal-title">Are you sure?</h2>
            <p className="modal-text">Do you want to proceed<br />with this operation?</p>
            <button className="modal-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="modal-btn-confirm" onClick={() => setShowModal(false)}>Confirm</button>
          </div>
        </div>
      )}

    </div>
    </>
  );
}