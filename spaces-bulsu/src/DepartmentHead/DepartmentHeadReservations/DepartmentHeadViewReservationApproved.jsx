import "./department-head-view-reservation-approved.css";
import DepartmentHeadNav from "../../Components/DepartmentHeadNav/DepartmentHeadNav";

function DepartmentHeadViewReservationApproved() {
  return (
    <>
      <DepartmentHeadNav activePage="reservations" />
    <div className="container">
      <div className="white-box-approved">
        <h2 className="approved-title">Reservation Details</h2>

        <div className="approved-sections">
          <div className="approved-section">
            <div className="approved-section-label">
              <span>General Information</span>
            </div>

            <div className="approved-form-group">
              <label>Course Title</label>
              <input type="text" className="approved-form-input" value="Course Title" readOnly />
            </div>

            <div className="approved-form-group">
              <label>Assigned Faculty</label>
              <input type="text" className="approved-form-input" value="Faculty Name" readOnly />
            </div>

            <div className="approved-form-group">
              <label>Section</label>
              <input type="text" className="approved-form-input" value="Section" readOnly />
            </div>
          </div>

          <div className="approved-section">
            <div className="approved-section-label">
              <span>Venue & Timing</span>
            </div>

            <div className="approved-form-group">
              <label>Room</label>
              <input type="text" className="approved-form-input" value="Room Name" readOnly />
            </div>

            <div className="approved-form-group">
              <label>Date</label>
              <div className="approved-input-icon-wrapper">
                <i className="fa-regular fa-calendar approved-input-icon"></i>
                <input type="date" className="approved-form-input" value="2026-05-11" readOnly />
              </div>
            </div>

            <div className="approved-time-fields">
              <div className="approved-form-group">
                <label>Start Time</label>
                <input type="text" className="approved-form-input" value="Start Time" readOnly />
              </div>

              <div className="approved-form-group">
                <label>End Time</label>
                <input type="text" className="approved-form-input" value="End Time" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="approved-footer">
        <button className="approved-back-btn">Back</button>
        <button className="approved-edit-btn">Edit</button>
      </div>
    </div>
    </>

  );
}

export default DepartmentHeadViewReservationApproved;