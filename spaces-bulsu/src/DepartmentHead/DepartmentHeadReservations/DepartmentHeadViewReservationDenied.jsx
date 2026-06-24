import { useNavigate } from "react-router-dom";
import "./department-head-view-reservation-denied.css";

function DepartmentHeadViewReservationDenied() {
  const navigate = useNavigate();

  return (
    <div className="dh-denied-reservation-room">
      <div className="dh-denied-white-box">
        <h2 className="dh-denied-title">Reservation Details</h2>

        <div className="dh-denied-sections">
          <div className="dh-denied-section">
            <div className="dh-denied-section-label">
              <span>General Information</span>
            </div>

            <div className="dh-denied-form-group">
              <label>Course Title</label>
              <input type="text" className="dh-denied-form-input" value="Course Title" readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Assigned Faculty</label>
              <input type="text" className="dh-denied-form-input" value="Faculty Name" readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Section</label>
              <input type="text" className="dh-denied-form-input" value="Section" readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Reason for Denial</label>
              <input type="text" className="dh-denied-form-input" value="Reason for denial" readOnly />
            </div>
          </div>

          <div className="dh-denied-section">
            <div className="dh-denied-section-label">
              <span>Venue & Timing</span>
            </div>

            <div className="dh-denied-form-group">
              <label>Room</label>
              <input type="text" className="dh-denied-form-input" value="Room Name" readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Date</label>
              <div className="dh-denied-input-icon-wrapper">
                <i className="fa-regular fa-calendar dh-denied-input-icon"></i>
                <input type="date" className="dh-denied-form-input" value="2026-05-11" readOnly />
              </div>
            </div>

            <div className="dh-denied-time-fields">
              <div className="dh-denied-form-group">
                <label>Start Time</label>
                <input type="text" className="dh-denied-form-input" value="Start Time" readOnly />
              </div>

              <div className="dh-denied-form-group">
                <label>End Time</label>
                <input type="text" className="dh-denied-form-input" value="End Time" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dh-denied-footer">
        <button
          className="dh-denied-back-btn"
          onClick={() => navigate("/department-head/reservations")}
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default DepartmentHeadViewReservationDenied;