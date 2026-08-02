import "./department-head-view-reservation.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";

function DepartmentHeadViewReservation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const reservation = state?.reservation;

  const toastTimeoutRef = useRef(null);
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      toastTimeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
        toastTimeoutRef.current = null;
      }, 4000);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ─── Redirect if no reservation ──────────────────────────────────────
  if (!reservation) {
    return (
      <div className="dh-view-reservation">
        <h2>Reservation not found.</h2>
        <button onClick={() => navigate("/department-head/reservations")}>Back</button>
      </div>
    );
  }

  // ─── Duration helper ──────────────────────────────────────────────────
  const getDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const diffMs = new Date().setHours(endHour, endMin, 0) - new Date().setHours(startHour, startMin, 0);
    if (diffMs <= 0) return "N/A";
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours && minutes) return `${hours} hr ${minutes} min`;
    if (hours) return `${hours} hr`;
    return `${minutes} min`;
  };

  const createdDate =
    reservation.createdAt?.seconds
      ? new Date(reservation.createdAt.seconds * 1000)
      : new Date(reservation.createdAt);

  const duration = getDuration(reservation.startTime, reservation.endTime);

  // ─── Status badge helper ─────────────────────────────────────────────
  const status = reservation.status?.toLowerCase().trim() || "pending";
  const isApproved = status === "approved";
  const isDenied = status === "rejected";

  // ─── Render ────────────────────────────────────────────────────────────

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
              <span className="dh-reservation-faculty-name">
                {reservation.facultyName || reservation.requesterName || "Unknown"}
              </span>
            </div>

            {/* ── Status badge (always shown, no actions) ── */}
            <div className="dh-reservation-header-right">
              <div className={`dh-reservation-status-badge ${isApproved ? "approved" : isDenied ? "denied" : "pending"}`}>
                <i className={`fa-solid ${isApproved ? "fa-check" : isDenied ? "fa-xmark" : "fa-clock"}`}></i>
                {reservation.status || "Pending"}
              </div>
            </div>
          </div>

          {/* ─── Info boxes (unchanged) ──────────────────────────────── */}

          <div className="dh-reservation-info-boxes">
            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Metadata</h3>
              <div className="dh-info-box-content">
                <p>
                  Requested On: {createdDate.toLocaleDateString()} |{" "}
                  {createdDate.toLocaleTimeString()}
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
                <p>
                  <strong>Audience Type:</strong> {reservation.audienceType}
                </p>

                {reservation.audienceType === "Class" && (
                  <>
                    <p>
                      <strong>Course:</strong> {reservation.attendees?.course}
                    </p>
                    <p>
                      <strong>Year/Section/Group:</strong>{" "}
                      {reservation.attendees?.yearSectionGroup}
                    </p>
                  </>
                )}

                {reservation.audienceType === "Organization" && (
                  <p>
                    <strong>Organization:</strong> {reservation.attendees?.organization}
                  </p>
                )}

                {reservation.audienceType === "Faculty" && (
                  <p>
                    <strong>Attendees:</strong> Faculty Members
                  </p>
                )}

                {reservation.audienceType === "Others" && (
                  <p>
                    <strong>Attendees:</strong> {reservation.attendees?.otherAudience}
                  </p>
                )}
                <p>
                  <strong>Purpose:</strong> {reservation.purpose}
                </p>
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

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </>
  );
}

export default DepartmentHeadViewReservation;