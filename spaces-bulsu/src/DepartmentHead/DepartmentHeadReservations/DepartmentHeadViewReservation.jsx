import "./department-head-view-reservation.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

import DenialPopup from "../../Popup/DenialPopup/DenialPopup";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";

function DepartmentHeadViewReservation() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const reservation = state?.reservation;

    if (!reservation) {
    return (
      <div className="dh-view-reservation">
        <h2>Reservation not found.</h2>
        <button onClick={() => navigate("/department-head/reservations")}>
          Back
        </button>
      </div>
    );
  }
  const [showDenial, setShowDenial] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const approveReservation = async () => {
    try {

      await updateDoc(
        doc(db, "reservationRequests", reservation.id),
        {
          status: "Approved",
        }
      );

      await addDoc(collection(db, "events"), {

        roomId: reservation.roomId,
        roomName: reservation.roomName,

        facultyName: reservation.facultyName,

        courseTitle: reservation.courseTitle,

        purpose: reservation.purpose,

        date: reservation.date,

        startTime: reservation.startTime,

        endTime: reservation.endTime,

        createdAt: serverTimestamp(),

        source: "Reservation",

      });

      setShowConfirm(false);

      navigate("/department-head/reservations");

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

      navigate("/department-head/reservations");

    } catch (err) {

      console.error(err);

    }

  };

  const createdDate =
  reservation.createdAt?.seconds
    ? new Date(reservation.createdAt.seconds * 1000)
    : new Date(reservation.createdAt);

  const getDuration = (start, end) => {
    if (!start || !end) return "N/A";

    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMin, 0);

    const endDate = new Date();
    endDate.setHours(endHour, endMin, 0);

    const diffMs = endDate - startDate;

    if (diffMs <= 0) return "N/A";

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours && minutes) return `${hours} hr ${minutes} min`;
    if (hours) return `${hours} hr`;
    return `${minutes} min`;
  };

  const duration = getDuration(
    reservation.startTime,
    reservation.endTime
  );

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
              <span className="dh-reservation-faculty-name">{reservation.facultyName}</span>
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
                <p>
                Requested On: {createdDate.toLocaleDateString()} | {createdDate.toLocaleTimeString()}
                </p>
                <p>Status: {reservation.status}</p>
              </div>
            </div>

            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Details</h3>
              <div className="dh-info-box-content">
                <div className="dh-info-box-details">
                  <p>Room Name: {reservation.roomName}</p>
                  <p>Room Capacity: {reservation.roomCapacity}</p>
                  <p>Course Title: {reservation.courseTitle}</p>
                  <p>Date: {reservation.date}</p>
                  <p>Start Time: {reservation.startTime}</p>
                  <p>Total Duration: {duration}</p>
                  <p>End Time: {reservation.endTime}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dh-reservation-info-boxes">
            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Purpose</h3>
              <div className="dh-info-box-content">
                <p><strong>Audience Type:</strong> {reservation.audienceType}</p>

                {reservation.audienceType === "Class" && (
                  <>
                    <p><strong>Course:</strong> {reservation.attendees?.course}</p>
                    <p><strong>Year/Section/Group:</strong> {reservation.attendees?.yearSectionGroup}</p>
                  </>
                )}

                {reservation.audienceType === "Organization" && (
                  <p><strong>Organization:</strong> {reservation.attendees?.organization}</p>
                )}

                {reservation.audienceType === "Faculty" && (
                  <p><strong>Attendees:</strong> Faculty Members</p>
                )}

                {reservation.audienceType === "Others" && (
                  <p><strong>Attendees:</strong> {reservation.attendees?.otherAudience}</p>
                )}
                <p><strong>Purpose:</strong> {reservation.purpose}</p>
              </div>
            </div>

            <div className="dh-reservation-info-box conflict-check-box">
              <h3 className="dh-info-box-title">Conflict Check</h3>
              <div className="dh-info-box-content">
                <p>No conflict detected.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showDenial && (
        <DenialPopup
            onCancel={() => setShowDenial(false)}
            onConfirm={denyReservation}
        />
      )}

      {showConfirm && (
        <ConfirmPopup
            onCancel={() => setShowConfirm(false)}
            onConfirm={approveReservation}
        />
      )}
    </>
  );
}

export default DepartmentHeadViewReservation;