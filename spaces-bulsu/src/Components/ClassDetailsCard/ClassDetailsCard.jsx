import "./class-details-card.css";

function ClassDetailsCard({ schedule, roomName, onClose }) {

  if (!schedule) return null;

  const isReassignment =
    schedule.isReassignment === true ||
    String(schedule.sourceType || "").toLowerCase().includes("reassign") ||
    (!!schedule.oldRoomName && !!schedule.newRoomName);

  const formatTime = (time) => {
    if (!time || time === "-") return "-";
    const [hour, minute] = time.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
    const suffix = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const statusLabel = (status) => {
    if (!status) return null;
    const s = String(status).toLowerCase();
    if (s === "approved") return "Approved";
    if (s === "accepted") return "Accepted";
    if (s === "pending") return "Pending";
    if (s === "pending_admin") return "Needs Review";
    if (s === "pending_faculty") return "With Faculty";
    if (s === "needs_reassign") return "Returned to Clerk";
    if (s === "rejected") return "Rejected";
    if (s === "declined") return "Declined";
    if (s === "cancelled") return "Cancelled";
    if (s === "active") return "Active";
    return status;
  };

  const statusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved" || s === "accepted" || s === "active") return "green";
    if (s === "pending" || s === "pending_admin" || s === "pending_faculty" || s === "needs_reassign") return "yellow";
    if (s === "rejected" || s === "declined" || s === "cancelled") return "red";
    return "gray";
  };

  return (
    <>
      <div className="class-details-backdrop" onClick={onClose} />

      <div className="class-details-card">

        <div className="class-details-header">
          <span className="class-details-title">
            {isReassignment
              ? "Reassignment Details"
              : schedule.isAdminEvent
              ? "Room Activity Details"
              : schedule.isReservation
              ? "Reservation Details"
              : "Class Details"}
          </span>
          <span className="class-details-date">
            {schedule.date || schedule.day || "-"}
          </span>
          <span className="class-details-close" onClick={onClose} style={{ cursor: "pointer" }}>✕</span>
        </div>

        <div className="class-details-badges">
          <span className="class-details-badge type">
            {isReassignment ? "Reassignment" : schedule.sourceType || "Class Schedule"}
          </span>
          {isReassignment && schedule.status && (
            <span className={`class-details-badge status ${statusClass(schedule.status)}`}>
              {statusLabel(schedule.status)}
            </span>
          )}
          {schedule.isReservation && (
            <span className={`class-details-badge status ${statusClass(schedule.status)}`}>
              {statusLabel(schedule.status)}
            </span>
          )}
        </div>

        <div className="class-details-body">

          {/* ROOM CHANGE (reassignment only) */}
          {isReassignment && (
            <div className="class-detail-item">
              <div className="class-detail-icon">
                <i className="fa-solid fa-right-left"></i>
              </div>
              <div className="class-detail-info">
                <span className="class-detail-label">ROOM CHANGE</span>
                <span className="class-detail-value">
                  {schedule.oldRoomName || "-"} → <strong>{schedule.newRoomName || roomName || "-"}</strong>
                </span>
              </div>
            </div>
          )}

          {/* FACULTY */}
          <div className="class-detail-item">
            <div className="class-detail-icon"><i className="fa-regular fa-user"></i></div>
            <div className="class-detail-info">
              <span className="class-detail-label">
                {schedule.isAdminEvent ? "ISSUED BY" : schedule.isReservation ? "REQUESTED BY" : "FACULTY"}
              </span>
              <span className="class-detail-value">{schedule.faculty || "-"}</span>
            </div>
          </div>

          {/* SUBJECT */}
          <div className="class-detail-item">
            <div className="class-detail-icon"><i className="fa-regular fa-bookmark"></i></div>
            <div className="class-detail-info">
              <span className="class-detail-label">
                {schedule.isReservation ? "PURPOSE" : "SUBJECT"}
              </span>
              <span className="class-detail-value">{schedule.subject || "-"}</span>
            </div>
          </div>

          {/* SECTION */}
          <div className="class-detail-item">
            <div className="class-detail-icon"><i className="fa-solid fa-users"></i></div>
            <div className="class-detail-info">
              <span className="class-detail-label">
                {schedule.isReservation ? "SECTION / ATTENDEES" : "SECTION"}
              </span>
              <span className="class-detail-value">{schedule.section || "-"}</span>
            </div>
          </div>

          {/* REASON */}
          {(schedule.reason || schedule.adminNote || schedule.denialReason) && (
            <div className="class-detail-item">
              <div className="class-detail-icon"><i className="fa-solid fa-circle-info"></i></div>
              <div className="class-detail-info">
                <span className="class-detail-label">
                  {schedule.denialReason ? "DECLINE REASON" : "REASON"}
                </span>
                <span className="class-detail-value">
                  {schedule.denialReason || schedule.adminNote || schedule.reason}
                </span>
              </div>
            </div>
          )}

          {/* ROOM (non-reassignment) */}
          {!isReassignment && (
            <div className="class-detail-item">
              <div className="class-detail-icon"><i className="fa-solid fa-location-dot"></i></div>
              <div className="class-detail-info">
                <span className="class-detail-label">ROOM</span>
                <span className="class-detail-value">{roomName || schedule.roomName || "-"}</span>
              </div>
            </div>
          )}

          {/* TIME */}
          <div className="class-detail-item">
            <div className="class-detail-icon"><i className="fa-regular fa-clock"></i></div>
            <div className="class-detail-info">
              <span className="class-detail-label">TIME</span>
              <span className="class-detail-value">
                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
              </span>
            </div>
          </div>

          {/* SEMESTER */}
          {!schedule.isReservation && (
            <div className="class-detail-item">
              <div className="class-detail-icon"><i className="fa-solid fa-graduation-cap"></i></div>
              <div className="class-detail-info">
                <span className="class-detail-label">SEMESTER</span>
                <span className="class-detail-value">{schedule.semester || "-"}</span>
              </div>
            </div>
          )}

          {/* SCHOOL YEAR */}
          {!schedule.isReservation && (
            <div className="class-detail-item">
              <div className="class-detail-icon"><i className="fa-solid fa-calendar-days"></i></div>
              <div className="class-detail-info">
                <span className="class-detail-label">SCHOOL YEAR</span>
                <span className="class-detail-value">{schedule.schoolYear || "-"}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default ClassDetailsCard;