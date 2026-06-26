import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./bulk-schedule-upload4.css";
import ConfirmPopup from "../../../Popup/ConfirmPopup/ConfirmPopup";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../../firebase";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

const formatTime12Hour = (time) => {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;

  if (displayHour === 0) displayHour = 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

export default function BulkScheduleUpload4() {
  const location = useLocation();
  const navigate = useNavigate();

  const { semester, schoolYear, room } = location.state || {};
  const rawSchedules = location.state?.schedules ?? [];

  const [showModal, setShowModal] = useState(false);

  const handleConfirm = async () => {
    try {
      const { collection, query, where, getDocs, addDoc } =
        await import("firebase/firestore");

      // hanapin ang room document
      const roomQuery = query(
        collection(db, "rooms"),
        where("roomName", "==", room)
      );

      const roomSnapshot = await getDocs(roomQuery);

      if (roomSnapshot.empty) {
        alert("Room not found.");
        return;
      }

      const roomDoc = roomSnapshot.docs[0];
      const roomId = roomDoc.id;

      // save schedules
      for (const schedule of rawSchedules) {
        await addDoc(
          collection(db, "rooms", roomId, "schedules"),
          {
            subject: schedule.subject || "",
            section: schedule.section || "",
            faculty: schedule.faculty || "TBA",

            day: schedule.day || "",

            startTime: schedule.startTime || "",
            endTime: schedule.endTime || "",

            semester,
            schoolYear,

            createdAt: serverTimestamp(),
          }
        );
      }

      alert(
        `${rawSchedules.length} schedules uploaded successfully!`
      );

      navigate("/local-registrar");

    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  if (!location.state) {
    return (
      <div className="bulk-upload-page-four">
        <h2>No data to confirm.</h2>
        <button onClick={() => navigate("/local-registrar/bulk-upload-2")}>
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="bulk-upload-page-four">

      <div className="bulk-header-four">
        <h1>Bulk Schedule Upload</h1>
        <p>Confirm extracted schedules before saving.</p>
      </div>

      {/* STEP */}
      <div className="stepper-four">
        {steps.map((step, index) => (
          <div className="step-wrapper-four" key={step.number}>
            <div className="step-item-four">
              <div className={`step-circle-four ${step.number < 4 ? "completed" : ""} ${step.number === 4 ? "active" : ""}`}>
                {step.number < 4 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label-four ${step.number === 4 ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && <div className="step-line-four completed" />}
          </div>
        ))}
      </div>

      {/* INFO */}
      <div className="form-card-four">
        <div className="info-card">
          <span className="info-title">Schedule Information</span>

          <div className="info-row">
            <div className="info-group">
              <span className="info-label">Room</span>
              <span className="info-value">{room}</span>
            </div>
            <div className="info-group">
              <span className="info-label">Semester</span>
              <span className="info-value">{semester}</span>
            </div>
            <div className="info-group">
              <span className="info-label">School Year</span>
              <span className="info-value">{schoolYear}</span>
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
                    {formatTime12Hour(s.startTime)} - {formatTime12Hour(s.endTime)}
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
      <div className="bulk-footer-four">
        <button className="btn-back-four" onClick={() => navigate(-1)}>
          Back
        </button>

               <button
          className="btn-confirm-four"
          onClick={() => setShowModal(true)}
        >
          Confirm Upload
        </button>
      </div>

      {/* MODAL */}
      {showModal && (
        <ConfirmPopup
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}

    </div>
  );
}
