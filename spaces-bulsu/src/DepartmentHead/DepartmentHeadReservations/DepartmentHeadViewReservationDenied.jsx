import "./department-head-view-reservation-denied.css";
import DepartmentHeadNav from "../../Components/DepartmentHeadNav/DepartmentHeadNav";

function DepartmentHeadViewReservationDenied() {
  return (
    <>
      <DepartmentHeadNav activePage="reservations" />
    <div className="container">
      <div className="white-box-denied">
        <h2 className="denied-title">Reservation Details</h2>

        <div className="denied-sections">
          <div className="denied-section">
            <div className="denied-section-label">
              <span>General Information</span>
            </div>

            <div className="denied-form-group">
              <label>Course Title</label>
              <input type="text" className="denied-form-input" value="Course Title" readOnly />
            </div>

            <div className="denied-form-group">
              <label>Assigned Faculty</label>
              <input type="text" className="denied-form-input" value="Faculty Name" readOnly />
            </div>

            <div className="denied-form-group">
              <label>Section</label>
              <input type="text" className="denied-form-input" value="Section" readOnly />
            </div>

            <div className="denied-form-group">
              <label>Reason for Denial</label>
              <input type="text" className="denied-form-input" value="Reason for denial" readOnly />
            </div>
          </div>

          <div className="denied-section">
            <div className="denied-section-label">
              <span>Venue & Timing</span>
            </div>

            <div className="denied-form-group">
              <label>Room</label>
              <input type="text" className="denied-form-input" value="Room Name" readOnly />
            </div>

            <div className="denied-form-group">
              <label>Date</label>
              <div className="denied-input-icon-wrapper">
                <i className="fa-regular fa-calendar denied-input-icon"></i>
                <input type="date" className="denied-form-input" value="2026-05-11" readOnly />
              </div>
            </div>

            <div className="denied-time-fields">
              <div className="denied-form-group">
                <label>Start Time</label>
                <input type="text" className="denied-form-input" value="Start Time" readOnly />
              </div>

              <div className="denied-form-group">
                <label>End Time</label>
                <input type="text" className="denied-form-input" value="End Time" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="denied-footer">
        <button className="denied-back-btn">Back</button>
      </div>
    </div>
    </>

  );
}

export default DepartmentHeadViewReservationDenied;