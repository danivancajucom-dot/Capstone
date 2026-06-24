import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./reservation-card.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";

function ReservationCard() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDenial, setShowDenial] = useState(false);

  return (
    <>
      <div
        className="reservation-card"
        onClick={() => navigate("/department-head/view-reservation")}
        style={{ cursor: "pointer" }}
      >
        <div className="reservation-card-left">
          <span className="reservation-room-badge">Room Name</span>
          <h3 className="reservation-name">Faculty Name</h3>
          <p className="reservation-time">Time • Date</p>
          <div className="reservation-course">
            <i className="fa-solid fa-users"></i>
            <span className="course-title">Course Title</span>
          </div>
          <div className="reservation-actions">
            <button
              className="approve-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
            >
              <i className="fa-solid fa-circle-check"></i> Approve
            </button>
            <button
              className="deny-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowDenial(true);
              }}
            >
              <i className="fa-solid fa-circle-xmark"></i> Deny
            </button>
          </div>
        </div>

        <div className="reservation-card-right">
          <span className="reservation-time-ago">2 mins ago</span>
          <div className="reservation-image">
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmPopup
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => setShowConfirm(false)}
        />
      )}

      {showDenial && (
        <DenialPopup
          onCancel={() => setShowDenial(false)}
          onConfirm={(reason) => setShowDenial(false)}
        />
      )}
    </>
  );
}

export default ReservationCard;