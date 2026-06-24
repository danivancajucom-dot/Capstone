import { useNavigate } from "react-router-dom";
import "./department-head-view-reservation-approved.css";

function DepartmentHeadViewReservationApproved() {
  const navigate = useNavigate();

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
              <input type="text" className="dh-approved-form-input" value="Course Title" readOnly />
            </div>

            <div className="dh-approved-form-group">
              <label>Assigned Faculty</label>
              <input type="text" className="dh-approved-form-input" value="Faculty Name" readOnly />
            </div>

            <div className="dh-approved-form-group">
              <label>Section</label>
              <input type="text" className="dh-approved-form-input" value="Section" readOnly />
            </div>
          </div>

          <div className="dh-approved-section">
            <div className="dh-approved-section-label">
              <span>Venue & Timing</span>
            </div>

            <div className="dh-approved-form-group">
              <label>Room</label>
              <input type="text" className="dh-approved-form-input" value="Room Name" readOnly />
            </div>

            <div className="dh-approved-form-group">
              <label>Date</label>
              <div className="dh-approved-input-icon-wrapper">
                <i className="fa-regular fa-calendar dh-approved-input-icon"></i>
                <input type="date" className="dh-approved-form-input" value="2026-05-11" readOnly />
              </div>
            </div>

            <div className="dh-approved-time-fields">
              <div className="dh-approved-form-group">
                <label>Start Time</label>
                <input type="text" className="dh-approved-form-input" value="Start Time" readOnly />
              </div>

              <div className="dh-approved-form-group">
                <label>End Time</label>
                <input type="text" className="dh-approved-form-input" value="End Time" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dh-approved-footer">
        <button
          className="dh-approved-back-btn"
          onClick={() => navigate("/department-head/reservations")}
        >
          Back
        </button>
        <button 
          className="dh-approved-edit-btn"
          onClick={() => navigate("/department-head/edit-approved-reservation")}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

export default DepartmentHeadViewReservationApproved;