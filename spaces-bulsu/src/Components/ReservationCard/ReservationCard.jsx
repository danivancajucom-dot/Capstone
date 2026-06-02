import "./reservation-card.css";

function ReservationCard() {
  return (
    <div className="reservation-card">
      <div className="reservation-card-left">
        <span className="reservation-room-badge">Room Name</span>
        <h3 className="reservation-name">Faculty Name</h3>
        <p className="reservation-time">Time • Date</p>
        <div className="reservation-course">
          <i className="fa-solid fa-users"></i>
          <span className="course-title">Course Title</span>
        </div>
        <div className="reservation-actions">
          <button className="approve-btn">
            <i className="fa-solid fa-circle-check"></i> Approve
          </button>
          <button className="deny-btn">
            <i className="fa-solid fa-circle-xmark"></i> Deny
          </button>
        </div>
      </div>

      <div className="reservation-card-right">
        <span className="reservation-time-ago">2 mins ago</span>
        <div className="reservation-image">
        </div>
      </div>
    </div>
  );
}

export default ReservationCard;