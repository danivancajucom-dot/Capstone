import "./faculty-view-pending-reservation.css";
import { useNavigate, useLocation } from "react-router-dom";

function FacultyViewPendingReservation() {
  const purpose = reservation.purpose;
  const navigate = useNavigate();
  const location = useLocation();

  const reservation = location.state?.reservation;

  if (!reservation) {
    return (
      <div className="container">
        <h2>Reservation not found.</h2>
      </div>
    );
  }

  return (
    <>
    <div className="container">
      <h1>Reservation Details</h1>
      <div className="faculty-view-pending-box">
        <div className="faculty-view-pending-sections">
          <div className="faculty-view-pending-section">
            <div className="faculty-view-pending-form-group">
              <label>Course Title</label>
             <input
                type="text"
                className="faculty-view-pending-input"
                value={reservation.courseTitle}
                readOnly
              />
            </div>

            <div className="faculty-view-pending-form-group">
              <label>Date</label>
              <div className="faculty-view-pending-icon-wrapper">
                <i className="fa-regular fa-calendar faculty-view-pending-icon"></i>
                <input
                  type="date"
                  className="faculty-view-pending-input"
                  value={reservation.date}
                  readOnly
                />
              </div>
            </div>

            <div className="faculty-view-pending-time-fields">
              <div className="faculty-view-pending-form-group">
                <label>Start Time</label>
                <div className="faculty-view-pending-time-wrapper">
                  <i className="fa-regular fa-clock faculty-view-pending-time-icon"></i>
                  <input
                    type="time"
                    className="faculty-view-pending-input faculty-view-pending-time-input"
                    value={reservation.startTime}
                    readOnly
                  />
                </div>
              </div>

              <div className="faculty-view-pending-form-group">
                <label>End Time</label>
                <div className="faculty-view-pending-time-wrapper">
                  <i className="fa-regular fa-clock faculty-view-pending-time-icon"></i>
                  <input
                    type="time"
                    className="faculty-view-pending-input faculty-view-pending-time-input"
                    value={reservation.endTime}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="faculty-view-pending-section">
            <div className="faculty-view-pending-form-group">
              <label>Purpose of Reservation</label>
              <input type="text" className="faculty-view-pending-input" value={purpose} readOnly />
            </div>

            <div className="faculty-view-pending-form-group">
              <label>Room Name</label>
              <input
                type="text"
                className="faculty-view-pending-input"
                value={reservation.roomName}
                readOnly
              />
            </div>

            {purpose === "Hands-On" && (
              <div className="faculty-view-pending-form-group">
                <label>Available Units/Equipment</label>
                <input
                  type="text"
                  className="faculty-view-pending-input"
                  value={reservation.requiredEquipment?.join(", ") || ""}
                  readOnly
                />
              </div>
            )}

            {(purpose === "Lecture" || purpose === "Examination") && (
              <div className="faculty-view-pending-form-group">
                <label>Estimated Number of Students</label>
                <input
                  type="text"
                  className="faculty-view-pending-input"
                  value={reservation.studentRange}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="faculty-view-pending-footer">
        <button
          className="faculty-view-pending-back-btn"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="faculty-view-pending-edit-btn"
          onClick={() =>
            navigate("/faculty/edit-pending-reservation", {
              state: {
                reservation,
              },
            })
          }
        >
          Edit
        </button>
      </div>
    </div>
    </>

  );
}

export default FacultyViewPendingReservation;