import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./department-head-reassign-room.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";

function DepartmentHeadReassignRoom() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    setShowConfirm(false);
    navigate("/department-head/conflicts");
  };

  return (
    <>
      <div className="dept-reassign-room">
        <div className="white-box-reassign">
          <h2 className="reassign-title">Reassign Room</h2>

          <div className="reassign-sections">
            <div className="reassign-section">
              <div className="reassign-section-label">
                <span>General Information</span>
              </div>

              <div className="reassign-form-group">
                <label>Course Title</label>
                <input type="text" className="reassign-form-input" value="Course Title" readOnly />
              </div>

              <div className="reassign-form-group">
                <label>Assigned Faculty</label>
                <input type="text" className="reassign-form-input" value="Faculty Name" readOnly />
              </div>

              <div className="reassign-form-group">
                <label>Section</label>
                <input type="text" className="reassign-form-input" value="Section" readOnly />
              </div>

              <div className="reassign-form-group">
                <label>Date</label>
                <div className="reassign-input-icon-wrapper">
                  <i className="fa-regular fa-calendar reassign-input-icon"></i>
                  <input type="date" className="reassign-form-input" value="2026-05-11" readOnly />
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

              <div className="reassign-time-fields">
                <div className="reassign-form-group">
                  <label>Start Time</label>
                  <input type="text" className="reassign-form-input" value="Start Time" readOnly />
                </div>

                <div className="reassign-form-group">
                  <label>End Time</label>
                  <input type="text" className="reassign-form-input" value="End Time" readOnly />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dept-reassign-footer">
          <button
            className="reassign-back-btn"
            onClick={() => navigate("/department-head/conflicts")}
          >
            Back
          </button>
          <button
            className="reassign-confirm-btn"
            onClick={() => setShowConfirm(true)}
          >
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