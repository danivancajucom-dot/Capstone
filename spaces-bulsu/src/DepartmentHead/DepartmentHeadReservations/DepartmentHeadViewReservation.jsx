import "./department-head-view-reservation.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";

function DepartmentHeadViewReservation() {
  const navigate = useNavigate();
  const [showDenial, setShowDenial] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="dh-view-reservation">
        <i
          className="fa-solid fa-arrow-left dh-view-reservation-back"
          onClick={() => navigate(-1)}
        ></i>

        <div className="white-box-view-reservation">
          <div className="dh-reservation-header">
            <div className="dh-reservation-header-left">
              <div className="dh-reservation-profile">
                <i className="fa-solid fa-user"></i>
              </div>
              <span className="dh-reservation-faculty-name">Juan Dela Cruz</span>
            </div>
            <div className="dh-reservation-header-right">
              <button
                className="dh-deny-request-btn"
                onClick={() => setShowDenial(true)}
              >
                Deny
              </button>
              <button
                className="dh-approve-request-btn"
                onClick={() => setShowConfirm(true)}
              >
                Approve Request
              </button>
            </div>
          </div>

          <div className="dh-reservation-info-boxes">
            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Metadata</h3>
              <div className="dh-info-box-content">
                <p>Requested On: Date | Time</p>
                <p>Status:</p>
              </div>
            </div>

            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Details</h3>
              <div className="dh-info-box-content">
                <div className="dh-info-box-details">
                  <p>Room Name:</p>
                  <p>Room Capacity:</p>
                  <p>Course Title:</p>
                  <p>Date:</p>
                  <p>Start Time:</p>
                  <p>Total Duration:</p>
                  <p>End Time:</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dh-reservation-info-boxes">
            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Purpose</h3>
              <div className="dh-info-box-content">
                <p>Reservation Purpose</p>
              </div>
            </div>

            <div className="dh-reservation-info-box conflict-check-box">
              <h3 className="dh-info-box-title">Conflict Check</h3>
              <div className="dh-info-box-content">
              </div>
            </div>
          </div>

        </div>
      </div>

      {showDenial && (
        <DenialPopup
          onCancel={() => setShowDenial(false)}
          onConfirm={(reason) => {
            setShowDenial(false);
          }}
        />
      )}

      {showConfirm && (
        <ConfirmPopup
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
          }}
        />
      )}
    </>
  );
}

export default DepartmentHeadViewReservation;