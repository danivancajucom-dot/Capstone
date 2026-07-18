import "./class-details-card.css";

function ClassDetailsCard({
  schedule,
  roomName,
  onClose,
}) {

  if (!schedule) return null;

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
    if (s === "pending") return "Pending";
    if (s === "rejected") return "Rejected";
    if (s === "active") return "Active";

    return status;
  };

  const statusClass = (status) => {
    const s = String(status || "").toLowerCase();

    if (s === "approved") return "green";
    if (s === "pending") return "yellow";
    if (s === "rejected") return "red";
    if (s === "active") return "green";

    return "gray";
  };

  return (
    <div className="class-details-card">

      <div className="class-details-header">

        <span className="class-details-title">
          {schedule.isDeptHeadEvent
            ? "Room Activity Details"
            : schedule.isReservation
            ? "Reservation Details"
            : "Class Details"}
        </span>

        <span className="class-details-date">
          {schedule.day || schedule.date || "-"}
        </span>

        <span
          className="class-details-close"
          onClick={onClose}
          style={{ cursor: "pointer" }}
        >
          ✕
        </span>

      </div>

      {/* SOURCE / STATUS BADGES */}
      <div className="class-details-badges">

        <span className="class-details-badge type">
          {schedule.sourceType || "Class Schedule"}
        </span>

        {schedule.isReservation && (
          <span
            className={`class-details-badge status ${statusClass(
              schedule.status
            )}`}
          >
            {statusLabel(schedule.status)}
          </span>
        )}

      </div>

      <div className="class-details-body">

        {/* FACULTY / REQUESTER */}
        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-regular fa-user"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">
              {schedule.isDeptHeadEvent
                ? "ISSUED BY"
                : schedule.isReservation
                ? "REQUESTED BY"
                : "FACULTY"}
            </span>
            <span className="class-detail-value">
              {schedule.faculty || "-"}
            </span>
          </div>
        </div>

        {/* SUBJECT / PURPOSE */}
        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-regular fa-bookmark"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">
              {schedule.isReservation ? "PURPOSE" : "SUBJECT"}
            </span>
            <span className="class-detail-value">
              {schedule.subject || "-"}
            </span>
          </div>
        </div>

        {/* SECTION / ATTENDEES */}
        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-solid fa-users"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">
              {schedule.isReservation ? "SECTION / ATTENDEES" : "SECTION"}
            </span>
            <span className="class-detail-value">
              {schedule.section || "-"}
            </span>
          </div>
        </div>

        {/* REASON - dept head override lang */}
        {schedule.reason && (
          <div className="class-detail-item">
            <div className="class-detail-icon">
              <i className="fa-solid fa-circle-info"></i>
            </div>
            <div className="class-detail-info">
              <span className="class-detail-label">
                REASON
              </span>
              <span className="class-detail-value">
                {schedule.reason}
              </span>
            </div>
          </div>
        )}

        {/* ROOM */}
        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">
              ROOM
            </span>
            <span className="class-detail-value">
              {roomName}
            </span>
          </div>
        </div>

        {/* TIME */}
        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-regular fa-clock"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">
              TIME
            </span>
            <span className="class-detail-value">
              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
            </span>
          </div>
        </div>

        {/* SEMESTER - class schedule lang */}
        {!schedule.isReservation && (
          <div className="class-detail-item">
            <div className="class-detail-icon">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <div className="class-detail-info">
              <span className="class-detail-label">
                SEMESTER
              </span>
              <span className="class-detail-value">
                {schedule.semester}
              </span>
            </div>
          </div>
        )}

        {/* SCHOOL YEAR - class schedule lang */}
        {!schedule.isReservation && (
          <div className="class-detail-item">
            <div className="class-detail-icon">
              <i className="fa-solid fa-calendar-days"></i>
            </div>
            <div className="class-detail-info">
              <span className="class-detail-label">
                SCHOOL YEAR
              </span>
              <span className="class-detail-value">
                {schedule.schoolYear}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ClassDetailsCard;