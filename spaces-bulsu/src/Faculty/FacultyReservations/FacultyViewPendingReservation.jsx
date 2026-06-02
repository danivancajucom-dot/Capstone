import "./faculty-view-pending-reservation.css";

function FacultyViewPendingReservation() {
  const purpose = "Examination";

  return (
    <>
    <div className="container">
      <h1>Reservation Details</h1>
      <div className="faculty-view-pending-box">
        <div className="faculty-view-pending-sections">
          <div className="faculty-view-pending-section">
            <div className="faculty-view-pending-form-group">
              <label>Course Title</label>
              <input type="text" className="faculty-view-pending-input" value="Course Title" readOnly />
            </div>

            <div className="faculty-view-pending-form-group">
              <label>Date</label>
              <div className="faculty-view-pending-icon-wrapper">
                <i className="fa-regular fa-calendar faculty-view-pending-icon"></i>
                <input type="date" className="faculty-view-pending-input" value="2026-05-11" readOnly />
              </div>
            </div>

            <div className="faculty-view-pending-time-fields">
              <div className="faculty-view-pending-form-group">
                <label>Start Time</label>
                <div className="faculty-view-pending-time-wrapper">
                  <i className="fa-regular fa-clock faculty-view-pending-time-icon"></i>
                  <input type="time" className="faculty-view-pending-input faculty-view-pending-time-input" value="09:00" readOnly />
                </div>
              </div>

              <div className="faculty-view-pending-form-group">
                <label>End Time</label>
                <div className="faculty-view-pending-time-wrapper">
                  <i className="fa-regular fa-clock faculty-view-pending-time-icon"></i>
                  <input type="time" className="faculty-view-pending-input faculty-view-pending-time-input" value="12:00" readOnly />
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
              <input type="text" className="faculty-view-pending-input" value="Room A1" readOnly />
            </div>

            {purpose === "Hands-On" && (
              <div className="faculty-view-pending-form-group">
                <label>Available Units/Equipment</label>
                <input type="text" className="faculty-view-pending-input" value="30 Units" readOnly />
              </div>
            )}

            {(purpose === "Lecture" || purpose === "Examination") && (
              <div className="faculty-view-pending-form-group">
                <label>Estimated Number of Students</label>
                <input type="text" className="faculty-view-pending-input" value="30-50" readOnly />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="faculty-view-pending-footer">
        <button className="faculty-view-pending-back-btn">Back</button>
        <button className="faculty-view-pending-edit-btn">Edit</button>
      </div>
    </div>
    </>

  );
}

export default FacultyViewPendingReservation;