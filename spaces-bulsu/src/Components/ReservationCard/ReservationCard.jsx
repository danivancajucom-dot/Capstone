import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./reservation-card.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

function ReservationCard({ reservation }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDenial, setShowDenial] = useState(false);

  const approveReservation = async () => {
    try {
      await updateDoc(
        doc(db, "reservationRequests", reservation.id),
        {
          status: "Approved",
        }
      );

      setShowConfirm(false);

    } catch (err) {
      console.error(err);
    }
  };

  const denyReservation = async (reason) => {
    try {

      await updateDoc(
        doc(db, "reservationRequests", reservation.id),
        {
          status: "Rejected",
          denialReason: reason,
        }
      );

      setShowDenial(false);

    } catch (err) {
      console.error(err);
    }
  };
  return (
    <>
      <div
        className="reservation-card"
        onClick={() =>
          navigate("/department-head/view-reservation", {
            state: {
              reservation,
            },
          })
        }
        style={{ cursor: "pointer" }}
      >
        <div className="reservation-card-left">
          <span className="reservation-room-badge">{reservation.roomName}</span>
          <h3 className="reservation-name">{reservation.facultyName}</h3>
          <p className="reservation-time">{reservation.startTime} - {reservation.endTime} • {reservation.date}</p>
          <div className="reservation-course">
            <i className="fa-solid fa-users"></i>
            <span className="course-title">{reservation.courseTitle}</span>
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
          <span className="reservation-time-ago">{reservation.createdAt?.toDate?.().toLocaleDateString()}</span>
          <div className="reservation-image">
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmPopup
            onCancel={() => setShowConfirm(false)}
            onConfirm={approveReservation}
        />
      )}

      {showDenial && (
        <DenialPopup
            onCancel={() => setShowDenial(false)}
            onConfirm={denyReservation}
        />
      )}
    </>
  );
}

export default ReservationCard;