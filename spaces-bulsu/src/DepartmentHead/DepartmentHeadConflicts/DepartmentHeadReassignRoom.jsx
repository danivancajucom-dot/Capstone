import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./department-head-reassign-room.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";

function DepartmentHeadReassignRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/department-head/conflicts";

  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    setShowConfirm(false);
    navigate(from);
  };

  return (
    <>
      <div className="dept-reassign-room">
        <div className="dept-reassign-white-box">
          <h2 className="dept-reassign-title">Reassign Room</h2>

          <div className="dept-reassign-sections">
            <div className="dept-reassign-section">
              <div className="dept-reassign-section-label">
                <span>General Information</span>
              </div>

              <div className="dept-reassign-form-group">
                <label>Course Title</label>
                <input type="text" className="dept-reassign-form-input" value="Course Title" readOnly />
              </div>

              <div className="dept-reassign-form-group">
                <label>Assigned Faculty</label>
                <input type="text" className="dept-reassign-form-input" value="Faculty Name" readOnly />
              </div>

              <div className="dept-reassign-form-group">
                <label>Section</label>
                <input type="text" className="dept-reassign-form-input" value="Section" readOnly />
              </div>

              <div className="dept-reassign-form-group">
                <label>Date</label>
                <div className="dept-reassign-input-icon-wrapper">
                  <i className="fa-regular fa-calendar dept-reassign-input-icon"></i>
                  <input type="date" className="dept-reassign-form-input" value="2026-05-11" readOnly />
                </div>
              </div>
            </div>

            <div className="dept-reassign-section">
              <div className="dept-reassign-section-label">
                <span>Venue & Timing</span>
              </div>

              <div className="dept-venue-header">
                <span className="dept-venue-title">Available Room Slots</span>
                <div className="dept-dropdown-wrapper-venue">
                  <select className="dept-dropdown-venue" defaultValue="">
                    <option value="" disabled hidden>Floor</option>
                    <option value="1st">1st Floor</option>
                    <option value="3rd">3rd Floor</option>
                    <option value="4th">4th Floor</option>
                  </select>
                  <i className="fa-solid fa-angle-down dept-dropdown-icon-venue"></i>
                </div>
              </div>

              <div className="dept-reassign-time-fields">
                <div className="dept-reassign-form-group">
                  <label>Start Time</label>
                  <input type="text" className="dept-reassign-form-input" value="Start Time" readOnly />
                </div>

                <div className="dept-reassign-form-group">
                  <label>End Time</label>
                  <input type="text" className="dept-reassign-form-input" value="End Time" readOnly />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dept-reassign-footer">
          <button className="dept-reassign-back-btn" onClick={() => navigate(from)}>
            Back
          </button>
          <button className="dept-reassign-confirm-btn" onClick={() => setShowConfirm(true)}>
            Confirm
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmPopup
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

export default DepartmentHeadReassignRoom;