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

function ApprovedAndDeniedCard({ reservation, onClick }) {
  const isApproved = reservation.status === "Approved";
  const reviewedDate = formatReviewedDate(reservation.createdAt);

  return (
    <div
      className={`rsv-ticket ${isApproved ? "is-approved" : "is-denied"}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <div className="rsv-ticket-main">
        <span className="rsv-room-badge">{reservation.roomName}</span>

        <h3 className="rsv-faculty-name">{reservation.facultyName}</h3>

        <div className="rsv-meta-row">
          <span className="rsv-meta-item">
            <i className="fa-regular fa-clock"></i>
            {reservation.startTime} – {reservation.endTime}
          </span>
          <span className="rsv-meta-dot">•</span>
          <span className="rsv-meta-item">
            <i className="fa-regular fa-calendar"></i>
            {reservation.date}
          </span>
        </div>

        <div className="rsv-course-row">
          <i className="fa-solid fa-users"></i>
          <span className="rsv-course-title">{reservation.courseTitle}</span>
        </div>
      </div>

      <div className="rsv-ticket-perforation">
        <span className="rsv-notch rsv-notch-top" />
        <span className="rsv-perforation-line" />
        <span className="rsv-notch rsv-notch-bottom" />
      </div>

      <div className="rsv-ticket-stub">
        <div className="rsv-stub-icon">
          <i className={`fa-solid ${isApproved ? "fa-check" : "fa-xmark"}`}></i>
        </div>
        <span className="rsv-stub-label">{isApproved ? "Approved" : "Denied"}</span>
        {reviewedDate && <span className="rsv-stub-date">{reviewedDate}</span>}
        <i className="fa-solid fa-chevron-right rsv-stub-chevron"></i>
      </div>
    </div>
  );
}

export default ApprovedAndDeniedCard;