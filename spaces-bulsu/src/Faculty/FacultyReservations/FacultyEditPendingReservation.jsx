import { useState } from "react";
import "./faculty-edit-pending-reservation.css";

function FacultyEditPendingReservation() {
  const [purpose, setPurpose] = useState("examination");

  return (
    <>
    <div className="container">
      <h1>Reservation Details</h1>

      <div className="faculty-edit-pending-box">
        <div className="faculty-edit-pending-sections">
          <div className="faculty-edit-pending-section">
            <div className="faculty-edit-pending-form-group">
              <label>Course Title</label>
              <input type="text" className="faculty-edit-pending-input" placeholder="Enter course title" />
            </div>

            <div className="faculty-edit-pending-form-group">
              <label>Date</label>
              <div className="faculty-edit-pending-icon-wrapper">
                <i
                  className="fa-regular fa-calendar faculty-edit-pending-icon"
                  onClick={() => document.getElementById('edit-date-input').showPicker()}
                ></i>
                <input
                  type="date"
                  id="edit-date-input"
                  className="faculty-edit-pending-input"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>

            <div className="faculty-edit-pending-time-fields">
              <div className="faculty-edit-pending-form-group">
                <label>Start Time</label>
                <div className="faculty-edit-pending-time-wrapper">
                  <i
                    className="fa-regular fa-clock faculty-edit-pending-time-icon"
                    onClick={() => document.getElementById('edit-start-time').showPicker()}
                  ></i>
                  <input
                    type="time"
                    id="edit-start-time"
                    className="faculty-edit-pending-input faculty-edit-pending-time-input"
                  />
                </div>
              </div>

              <div className="faculty-edit-pending-form-group">
                <label>End Time</label>
                <div className="faculty-edit-pending-time-wrapper">
                  <i
                    className="fa-regular fa-clock faculty-edit-pending-time-icon"
                    onClick={() => document.getElementById('edit-end-time').showPicker()}
                  ></i>
                  <input
                    type="time"
                    id="edit-end-time"
                    className="faculty-edit-pending-input faculty-edit-pending-time-input"
                  />
                </div>
              </div>
            </div>

            <div className="faculty-edit-pending-form-group">
              <label>Purpose of Reservation</label>
              <div className="faculty-edit-pending-dropdown-wrapper">
                <select
                  className="faculty-edit-pending-input faculty-edit-pending-dropdown"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="" disabled hidden>Select Purpose</option>
                  <option value="hands-on">Hands-On</option>
                  <option value="lecture">Lecture</option>
                  <option value="examination">Examination</option>
                </select>
                <i className="fa-solid fa-angle-down faculty-edit-pending-dropdown-icon"></i>
              </div>
            </div>
          </div>

          <div className="faculty-edit-pending-section">
            <div className="faculty-edit-pending-venue-header">
              <span className="faculty-edit-pending-venue-title">Available Room Slots</span>
              <div className="faculty-edit-pending-venue-dropdown-wrapper">
                <select className="faculty-edit-pending-venue-dropdown" defaultValue="">
                  <option value="" disabled hidden>Floor</option>
                  <option value="1st">1st Floor</option>
                  <option value="3rd">3rd Floor</option>
                  <option value="4th">4th Floor</option>
                </select>
                <i className="fa-solid fa-angle-down faculty-edit-pending-venue-dropdown-icon"></i>
              </div>
            </div>

            {purpose === "hands-on" && (
              <div className="faculty-edit-pending-form-group">
                <label>Available Units/Equipment</label>
                <input
                  type="text"
                  className="faculty-edit-pending-input"
                  placeholder="Enter units/equipment"
                />
              </div>
            )}

            {(purpose === "lecture" || purpose === "examination") && (
              <div className="faculty-edit-pending-form-group">
                <label>Estimated Number of Students</label>
                <div className="faculty-edit-pending-dropdown-wrapper">
                  <select className="faculty-edit-pending-input faculty-edit-pending-dropdown" defaultValue="">
                    <option value="" disabled hidden>Select Range</option>
                    <option value="30-50">30-50</option>
                    <option value="50-60">50-60</option>
                    <option value="60-80">60-80</option>
                    <option value="80-100">80-100</option>
                  </select>
                  <i className="fa-solid fa-angle-down faculty-edit-pending-dropdown-icon"></i>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="faculty-edit-pending-footer">
        <button className="faculty-edit-pending-back-btn">Back</button>
        <button className="faculty-edit-pending-save-btn">Save</button>
      </div>
    </div>
    </>

  );
}

export default FacultyEditPendingReservation;