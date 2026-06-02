import "./approved-and-denied-card.css";

function ApprovedAndDeniedCard() {
  return (
    <div className="approved-and-denied-card">
      <div className="status-card-left">
        <span className="status-room-badge">Room Name</span>
        <h3 className="status-name">Faculty Name</h3>
        <p className="status-time">Time • Date</p>
        <div className="status-course">
          <i className="fa-solid fa-users"></i>
          <span className="course-title">Course Title</span>
        </div>
      </div>

      <div className="status-card-right">
        <span className="status-time-ago">2 mins ago</span>
        <div className="status-image">
        </div>
      </div>
    </div>
  );
}

export default ApprovedAndDeniedCard;