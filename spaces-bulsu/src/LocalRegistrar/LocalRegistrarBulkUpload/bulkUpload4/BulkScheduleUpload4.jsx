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

  const { semester, schoolYear, room } = location.state || {};
  const rawSchedules = location.state?.schedules ?? [];

  const [showModal, setShowModal] = useState(false);

  const handleConfirm = () => {
    console.log("Final schedules:", rawSchedules);
    alert("Schedules successfully uploaded!");
    navigate("/local-registrar");
  };

  if (!location.state) {
    return (
      <div className="bulk-upload-page">
        <h2>No data to confirm.</h2>
        <button onClick={() => navigate("/local-registrar/bulk-upload-2")}>
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="bulk-upload-page">

      <div className="bulk-header">
        <h1>Bulk Schedule Upload</h1>
        <p>Confirm extracted schedules before saving.</p>
      </div>

      {/* STEP */}
      <div className="stepper">
        {steps.map((step, index) => (
          <div className="step-wrapper" key={step.number}>
            <div className="step-item">
              <div className={`step-circle ${step.number === 4 ? "active" : "completed"}`}>
                {step.number}
              </div>
              <span className={`step-label ${step.number === 4 ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && <div className="step-line completed" />}
          </div>
        ))}
      </div>

      {/* INFO */}
      <div className="form-card">
        <div className="info-card">
          <span className="info-title">Schedule Information</span>

          <div className="info-row">
            <div className="info-group">
              <span className="info-label">Semester</span>
              <span className="info-value">{semester}</span>
            </div>

            <div className="info-group">
              <span className="info-label">School Year</span>
              <span className="info-value">{schoolYear}</span>
            </div>

            <div className="info-group">
              <span className="info-label">Room</span>
              <span className="info-value">{room}</span>
            </div>
          </div>
        </div>

        {/* ✅ FIXED DISPLAY */}
        <div className="schedule-preview-list">
        <h3 className="preview-title">
          Extracted Schedules ({rawSchedules.length})
        </h3>

        <div className="schedule-grid">
          {rawSchedules.map((s, i) => (
            <div key={i} className="schedule-card">

              <div className="schedule-header">
                <span className="schedule-subject">
                  {s.subject}
                </span>

                {s.section && (
                  <span className="schedule-badge">
                    {s.section}
                  </span>
                )}
              </div>

              <div className="schedule-body">
                <div className="schedule-row">
                  <i className="fa-regular fa-calendar"></i>
                  <span>{s.day}</span>
                </div>

                <div className="schedule-row time">
                  <i className="fa-regular fa-clock"></i>
                  <span>
                    {s.startTime} - {s.endTime}
                  </span>
                </div>

                <div className="schedule-row">
                  <i className="fa-regular fa-user"></i>
                  <span>{s.faculty || "TBA"}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
      </div>

      {/* FOOTER */}
      <div className="bulk-footer">
        <button className="btn-back" onClick={() => navigate(-1)}>
          Back
        </button>

        <button
          className="btn-confirm"
          onClick={() => setShowModal(true)}
        >
          Confirm Upload
        </button>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Are you sure?</h2>
            <p>Do you want to proceed?</p>

            <button onClick={() => setShowModal(false)}>
              Cancel
            </button>

            <button onClick={handleConfirm}>
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}