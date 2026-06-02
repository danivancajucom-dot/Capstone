import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import LogoutPopup from "../../Popup/LogoutPopup/LogoutPopup";
import SavePopup from "../../Popup/SavePopup/SavePopup";
import "./department-head-edit-approved-reservation.css";
import DepartmentHeadNav from "../../Components/DepartmentHeadNav/DepartmentHeadNav";

function DepartmentHeadEditApprovedReservation() {
  return (
    <>
      <DepartmentHeadNav activePage="reservations" />
    <div className="container">
      {/* lagay ko lang dito para makita popup */}
      {/* <ConfirmPopup/> */}
      {/* <SavePopup/> */}
      {/* <LogoutPopup/> */}
      <div className="white-box-edit-reservation">
        <h2 className="reassign-title">Reservation Details</h2>

        <div className="reassign-sections">
          <div className="reassign-section">
            <div className="reassign-section-label">
              <span>General Information</span>
            </div>

            <div className="form-group">
              <label>Course Title</label>
              <input type="text" className="form-input" value="Course Title" readOnly />
            </div>

            <div className="form-group">
              <label>Assigned Faculty</label>
              <input type="text" className="form-input" value="Faculty Name" readOnly />
            </div>

            <div className="form-group">
              <label>Section</label>
              <input type="text" className="form-input" value="Section" readOnly />
            </div>

            <div className="form-group">
              <label>Date</label>
              <div className="input-icon-wrapper">
                <i className="fa-regular fa-calendar input-icon"></i>
                <input type="date" className="form-input" value="2026-05-11" readOnly />
              </div>
            </div>
          </div>

          <div className="reassign-section">
            <div className="reassign-section-label">
              <span>Venue & Timing</span>
            </div>

            <div className="venue-header">
              <span className="venue-title">Available Room Slots</span>
              <div className="dropdown-wrapper-venue">
                <select className="dropdown-venue" defaultValue="">
                  <option value="" disabled hidden>Floor</option>
                  <option value="1st">1st Floor</option>
                  <option value="3rd">3rd Floor</option>
                  <option value="4th">4th Floor</option>
                </select>
                <i className="fa-solid fa-angle-down dropdown-icon-venue"></i>
              </div>
            </div>

            <div className="time-fields">
              <div className="form-group">
                <label>Start Time</label>
                <input type="text" className="form-input" value="Start Time" readOnly />
              </div>

              <div className="form-group">
                <label>End Time</label>
                <input type="text" className="form-input" value="End Time" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="reassign-footer">
        <button className="back-btn">Back</button>
        <button className="confirm-btn">Confirm</button>
      </div>
    </div>
    </>

  );
}

export default DepartmentHeadEditApprovedReservation;