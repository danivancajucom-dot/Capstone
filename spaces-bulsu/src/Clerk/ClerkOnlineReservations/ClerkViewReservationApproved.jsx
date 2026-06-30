import { useNavigate, useLocation } from "react-router-dom";
import "./clerk-view-reservation-approved.css";

function ClerkViewReservationApproved() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const reservation = state?.reservation;

  if (!reservation) {
    return (
      <div className="dh-approved-reservation-room">
        <h2>Reservation not found.</h2>
        <button onClick={() => navigate("/clerk/reservations")}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="dh-approved-reservation-room">
      <div className="dh-white-box-approved">
        <h2 className="dh-approved-title">Reservation Details</h2>

        <div className="dh-approved-sections">
          <div className="dh-approved-section">
            <div className="dh-approved-section-label">
              <span>General Information</span>
            </div>

            <div className="dh-approved-form-group">
              <label>Course Title</label>
              <input
                type="text"
                className="dh-approved-form-input"
                value={reservation.courseTitle || ""}
                readOnly
              />
            </div>

            <div className="dh-approved-form-group">
              <label>Assigned Faculty</label>
              <input type="text" className="dh-approved-form-input" value={reservation.facultyName || ""} readOnly />
            </div>

            <div className="dh-approved-form-group">
              <label>Section</label>
              <input type="text" className="dh-approved-form-input" value={reservation.yearSectionGroup || ""} readOnly />
            </div>
          </div>

          <div className="dh-approved-section">
            <div className="dh-approved-section-label">
              <span>Venue & Timing</span>
            </div>

            <div className="dh-approved-form-group">
              <label>Room</label>
              <input type="text" className="dh-approved-form-input" value={reservation.roomName || ""} readOnly />
            </div>

            <div className="dh-approved-form-group">
              <label>Date</label>
              <div className="dh-approved-input-icon-wrapper">
                <i className="fa-regular fa-calendar dh-approved-input-icon"></i>
                <input type="date" className="dh-approved-form-input" value={reservation.date || ""} readOnly />
              </div>
            </div>

            <div className="dh-approved-time-fields">
              <div className="dh-approved-form-group">
                <label>Start Time</label>
                <input type="text" className="dh-approved-form-input" value={reservation.startTime || ""} readOnly />
              </div>

              <div className="dh-approved-form-group">
                <label>End Time</label>
                <input type="text" className="dh-approved-form-input" value={reservation.endTime || ""} readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dh-approved-footer">
        <button
          className="dh-approved-back-btn"
          onClick={() => navigate("/clerk/online-reservations")}
        >
          Back
        </button>
        <button 
          className="dh-approved-edit-btn"
          onClick={() => navigate("/clerk/edit-approved-reservation")}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

export default ClerkViewReservationApproved;