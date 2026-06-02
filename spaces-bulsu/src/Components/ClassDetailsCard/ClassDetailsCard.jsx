import "./class-details-card.css";

function ClassDetailsCard() {
  return (
    <div className="class-details-card">
      <div className="class-details-header">
        <span className="class-details-title">Class Details</span>
        <span className="class-details-date">Monday, May 4</span>
        <span className="class-details-close">✕</span>
      </div>

      <div className="class-details-body">
        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-regular fa-user"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">FACULTY</span>
            <span className="class-detail-value">Juan Dela Cruz</span>
          </div>
        </div>

        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-regular fa-bookmark"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">SUBJECT</span>
            <span className="class-detail-value">Subject Code</span>
          </div>
        </div>

        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">ROOM</span>
            <span className="class-detail-value">Room A1</span>
          </div>
        </div>

        <div className="class-detail-item">
          <div className="class-detail-icon">
            <i className="fa-regular fa-clock"></i>
          </div>
          <div className="class-detail-info">
            <span className="class-detail-label">TIME</span>
            <span className="class-detail-value">7:00 AM - 10:00 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClassDetailsCard;