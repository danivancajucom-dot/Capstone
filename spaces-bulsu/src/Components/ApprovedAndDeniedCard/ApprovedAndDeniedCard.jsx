import "./approved-and-denied-card.css";

function formatReviewedDate(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ApprovedAndDeniedCard({ reservation, onClick, compact = false, readOnly = false }) {
  const status = reservation.status?.toLowerCase().trim() || "";
  const isApproved = status === "approved";
  const isDenied = status === "rejected";
  const isCancelled = status === "cancelled";

  let iconClass = "fa-check";
  let cardClass = "is-approved";
  let statusLabel = "Approved";
  if (isDenied) {
    iconClass = "fa-xmark";
    cardClass = "is-denied";
    statusLabel = "Denied";
  } else if (isCancelled) {
    iconClass = "fa-ban";
    cardClass = "is-cancelled";
    statusLabel = "Cancelled";
  }

  const reviewedDate = formatReviewedDate(reservation.createdAt);

  return (
    <div
      className={`rc-card ${cardClass} ${compact ? "rc-card--compact" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      {/* Left: icon */}
      <div className="rc-status-icon">
        <i className={`fa-solid ${iconClass}`}></i>
      </div>

      {/* Middle: main info */}
      <div className="rc-main">
        <div className="rc-top-row">
          <span className="rc-room-badge">{reservation.roomName}</span>
          {/* Removed status label from here */}
        </div>

        <h3 className="rc-faculty-name">{reservation.facultyName || reservation.requesterName}</h3>

        <div className="rc-meta-row">
          <span className="rc-meta-item">
            <i className="fa-regular fa-clock"></i>
            {reservation.startTime} – {reservation.endTime}
          </span>
          <span className="rc-meta-dot">•</span>
          <span className="rc-meta-item">
            <i className="fa-regular fa-calendar"></i>
            {reservation.date}
          </span>
        </div>

        <div className="rc-course-row">
          <i className="fa-solid fa-users"></i>
          <span className="rc-course-title">{reservation.courseTitle || "N/A"}</span>
        </div>
      </div>

      {/* Right side: status label on top, date+chevron below */}
      <div className="rc-side">
        <div className="rc-side-top">
          <span className={`rc-status-label ${cardClass}`}>{statusLabel}</span>
        </div>
        <div className="rc-side-bottom">
          {reviewedDate && <span className="rc-reviewed-date">Reviewed {reviewedDate}</span>}
          <i className="fa-solid fa-chevron-right rc-chevron"></i>
        </div>
      </div>
    </div>
  );
}

export default ApprovedAndDeniedCard;