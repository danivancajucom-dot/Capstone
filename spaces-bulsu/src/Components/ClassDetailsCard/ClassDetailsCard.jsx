import "./class-details-card.css";

function ClassDetailsCard({
  schedule,
  roomName,
  onClose,
}) {
  if (!schedule) return null;

  return (
    <div className="class-details-card">

      <div className="class-details-header">

        <span className="class-details-title">
          Class Details
        </span>

        <span className="class-details-date">
          {schedule.day}
        </span>

        <span
          className="class-details-close"
          onClick={onClose}
          style={{ cursor: "pointer" }}
        >
          ✕
        </span>

      </div>

      <div className="class-details-body">

        {/* FACULTY */}

        <div className="class-detail-item">

          <div className="class-detail-icon">
            <i className="fa-regular fa-user"></i>
          </div>

          <div className="class-detail-info">

            <span className="class-detail-label">
              FACULTY
            </span>

            <span className="class-detail-value">
              {schedule.faculty || "-"}
            </span>

          </div>

        </div>

        {/* SUBJECT */}

        <div className="class-detail-item">

          <div className="class-detail-icon">
            <i className="fa-regular fa-bookmark"></i>
          </div>

          <div className="class-detail-info">

            <span className="class-detail-label">
              SUBJECT
            </span>

            <span className="class-detail-value">
              {schedule.subject || "-"}
            </span>

          </div>

        </div>

        {/* SECTION */}

        <div className="class-detail-item">

          <div className="class-detail-icon">
            <i className="fa-solid fa-users"></i>
          </div>

          <div className="class-detail-info">

            <span className="class-detail-label">
              SECTION
            </span>

            <span className="class-detail-value">
              {schedule.section || "-"}
            </span>

          </div>

        </div>

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
              {schedule.startTime} - {schedule.endTime}
            </span>

          </div>

        </div>

        {/* SEMESTER */}

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

        {/* SCHOOL YEAR */}

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

      </div>

    </div>
  );
}

export default ClassDetailsCard;