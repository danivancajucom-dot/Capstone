import { useNavigate, useLocation } from "react-router-dom";
import "./clerk-view-reservation-denied.css";

function ClerkViewReservationDenied() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const reservation = state?.reservation;

  if (!reservation) {
    return (
      <div className="dh-denied-reservation-room">
        <h2>Reservation not found.</h2>

        <button onClick={() => navigate("/clerk/online-reservations")}>
          Back
        </button>
      </div>
    );
  }

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
              <input type="text" className="dh-denied-form-input" value={reservation.courseTitle || ""} readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Assigned Faculty</label>
              <input type="text" className="dh-denied-form-input" value={reservation.facultyName || ""} readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Section</label>
              <input type="text" className="dh-denied-form-input" value={reservation.attendees.yearSectionGroup || ""} readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Reason for Denial</label>
              <input type="text" className="dh-denied-form-input" value={reservation.denialReason || ""} readOnly />
            </div>
          </div>

          <div className="dh-denied-section">
            <div className="dh-denied-section-label">
              <span>Venue & Timing</span>
            </div>

            <div className="dh-denied-form-group">
              <label>Room</label>
              <input type="text" className="dh-denied-form-input" value={reservation.roomName || ""} readOnly />
            </div>

            <div className="dh-denied-form-group">
              <label>Date</label>
              <div className="dh-denied-input-icon-wrapper">
                <i className="fa-regular fa-calendar dh-denied-input-icon"></i>
                <input type="date" className="dh-denied-form-input" value={reservation.date || ""} readOnly />
              </div>
            </div>

            <div className="dh-denied-time-fields">
              <div className="dh-denied-form-group">
                <label>Start Time</label>
                <input type="text" className="dh-denied-form-input" value={reservation.startTime || ""} readOnly />
              </div>

              <div className="dh-denied-form-group">
                <label>End Time</label>
                <input type="text" className="dh-denied-form-input" value={reservation.endTime || ""} readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dh-denied-footer">
        <button
          className="dh-denied-back-btn"
          onClick={() => navigate("/clerk/reservations")}
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default ClerkViewReservationDenied;