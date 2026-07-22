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

function ApprovedAndDeniedCard({ reservation, onClick, compact = false }) {
  const isApproved = reservation.status === "Approved";
  const reviewedDate = formatReviewedDate(reservation.createdAt);

  return (
    <div
      className={`rc-card ${isApproved ? "is-approved" : "is-denied"} ${compact ? "rc-card--compact" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <div className="rc-status-icon">
        <i className={`fa-solid ${isApproved ? "fa-check" : "fa-xmark"}`}></i>
      </div>

      <div className="rc-main">
        <div className="rc-top-row">
          <span className="rc-room-badge">{reservation.roomName}</span>
          <span className="rc-status-pill">{isApproved ? "Approved" : "Denied"}</span>
        </div>

        <h3 className="rc-faculty-name">{reservation.facultyName}</h3>

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
          <span className="rc-course-title">{reservation.courseTitle}</span>
        </div>
      </div>

      <div className="rc-side">
        {reviewedDate && <span className="rc-reviewed-date">Reviewed {reviewedDate}</span>}
        <i className="fa-solid fa-chevron-right rc-chevron"></i>
      </div>
    </div>
  );
}

export default ApprovedAndDeniedCard;