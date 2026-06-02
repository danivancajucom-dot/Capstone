import { useState } from "react";
import "./faculty-view-approved-reservation.css";

function FacultyViewApprovedReservation() {
  const purpose = "Examination"; // palitan lang to ng examination or hands-on para ma-testt yung field na nababago hehe

  return (
    <>
    <div className="container">
      <h1>Reservation Details</h1>
      <div className="faculty-view-approved-box">
        <div className="faculty-view-approved-sections">
          <div className="faculty-view-approved-section">
            <div className="faculty-view-approved-form-group">
              <label>Course Title</label>
              <input type="text" className="faculty-view-approved-input" value="Course Title" readOnly />
            </div>

            <div className="faculty-view-approved-form-group">
              <label>Date</label>
              <div className="faculty-view-approved-icon-wrapper">
                <i className="fa-regular fa-calendar faculty-view-approved-icon"></i>
                <input type="date" className="faculty-view-approved-input" value="2026-05-11" readOnly />
              </div>
            </div>

            <div className="faculty-view-approved-time-fields">
              <div className="faculty-view-approved-form-group">
                <label>Start Time</label>
                <div className="faculty-view-approved-time-wrapper">
                  <i className="fa-regular fa-clock faculty-view-approved-time-icon"></i>
                  <input type="time" className="faculty-view-approved-input faculty-view-approved-time-input" value="09:00" readOnly />
                </div>
              </div>

              <div className="faculty-view-approved-form-group">
                <label>End Time</label>
                <div className="faculty-view-approved-time-wrapper">
                  <i className="fa-regular fa-clock faculty-view-approved-time-icon"></i>
                  <input type="time" className="faculty-view-approved-input faculty-view-approved-time-input" value="12:00" readOnly />
                </div>
              </div>
            </div>
          </div>

          <div className="faculty-view-approved-section">
            <div className="faculty-view-approved-form-group">
              <label>Purpose of Reservation</label>
              <input type="text" className="faculty-view-approved-input" value={purpose} readOnly />
            </div>

            <div className="faculty-view-approved-form-group">
              <label>Room Name</label>
              <input type="text" className="faculty-view-approved-input" value="Room A1" readOnly />
            </div>

            {purpose === "Hands-On" && (
              <div className="faculty-view-approved-form-group">
                <label>Available Units/Equipment</label>
                <input type="text" className="faculty-view-approved-input" value="30 Units" readOnly />
              </div>
            )}

            {(purpose === "Lecture" || purpose === "Examination") && (
              <div className="faculty-view-approved-form-group">
                <label>Estimated Number of Students</label>
                <input type="text" className="faculty-view-approved-input" value="30-50" readOnly />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="faculty-view-approved-footer">
        <button className="faculty-view-approved-back-btn">Back</button>
      </div>
    </div>
    </>

  );
}

export default FacultyViewApprovedReservation;