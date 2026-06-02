import { useState } from "react";
import "./faculty-submit-reservation.css";

function FacultySubmitReservation() {
  const [purpose, setPurpose] = useState("");

  return (
    <>
    <div className="container">
      <h1>Reservation Requests</h1>
      <p>Fill out the details below to reserve a classroom.</p>

      <div className="faculty-submit-box">
        <div className="faculty-submit-sections">
          <div className="faculty-submit-section">
            <div className="faculty-submit-form-group">
              <label>Course Title</label>
              <input type="text" className="faculty-submit-input" placeholder="Enter course title" />
            </div>

            <div className="faculty-submit-form-group">
              <label>Date</label>
              <div className="faculty-submit-icon-wrapper">
                <i
                  className="fa-regular fa-calendar faculty-submit-icon"
                  onClick={() => document.getElementById('date-input').showPicker()}
                ></i>
                <input
                  type="date"
                  id="date-input"
                  className="faculty-submit-input"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>

            <div className="faculty-submit-time-fields">
              <div className="faculty-submit-form-group">
                <label>Start Time</label>
                <div className="faculty-submit-time-wrapper">
                  <i
                    className="fa-regular fa-clock faculty-submit-time-icon"
                    onClick={() => document.getElementById('start-time-input').showPicker()}
                  ></i>
                  <input
                    type="time"
                    id="start-time-input"
                    className="faculty-submit-input faculty-submit-time-input"
                  />
                </div>
              </div>

              <div className="faculty-submit-form-group">
                <label>End Time</label>
                <div className="faculty-submit-time-wrapper">
                  <i
                    className="fa-regular fa-clock faculty-submit-time-icon"
                    onClick={() => document.getElementById('end-time-input').showPicker()}
                  ></i>
                  <input
                    type="time"
                    id="end-time-input"
                    className="faculty-submit-input faculty-submit-time-input"
                  />
                </div>
              </div>
            </div>

            <div className="faculty-submit-form-group">
              <label>Purpose of Reservation</label>
              <div className="faculty-submit-dropdown-wrapper">
                <select
                  className="faculty-submit-input faculty-submit-dropdown"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="" disabled hidden>Select Purpose</option>
                  <option value="hands-on">Hands-On</option>
                  <option value="lecture">Lecture</option>
                  <option value="examination">Examination</option>
                </select>
                <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>
              </div>
            </div>
          </div>

          <div className="faculty-submit-section">
            <div className="faculty-submit-venue-header">
              <span className="faculty-submit-venue-title">Available Room Slots</span>
              <div className="faculty-submit-venue-dropdown-wrapper">
                <select className="faculty-submit-venue-dropdown" defaultValue="">
                  <option value="" disabled hidden>Floor</option>
                  <option value="1st">1st Floor</option>
                  <option value="3rd">3rd Floor</option>
                  <option value="4th">4th Floor</option>
                </select>
                <i className="fa-solid fa-angle-down faculty-submit-venue-dropdown-icon"></i>
              </div>
            </div>

            {purpose === "hands-on" && (
              <div className="faculty-submit-form-group">
                <label>Available Units/Equipment</label>
                <input
                  type="text"
                  className="faculty-submit-input"
                  placeholder="Enter units/equipment"
                />
              </div>
            )}

            {(purpose === "lecture" || purpose === "examination") && (
              <div className="faculty-submit-form-group">
                <label>Estimated Number of Students</label>
                <div className="faculty-submit-dropdown-wrapper">
                  <select className="faculty-submit-input faculty-submit-dropdown" defaultValue="">
                    <option value="" disabled hidden>Select Range</option>
                    <option value="30-50">30-50</option>
                    <option value="50-60">50-60</option>
                    <option value="60-80">60-80</option>
                    <option value="80-100">80-100</option>
                  </select>
                  <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="faculty-submit-footer">
        <button className="faculty-submit-back-btn">Back</button>
        <button className="faculty-submit-confirm-btn">Submit Request</button>
      </div>
    </div>
    </>

  );
}

export default FacultySubmitReservation;