import "./reserved-room-card.css";

function ReservedRoomCard() {
  return (
    <div className="reserved-room-card">
      <div className="reserved-room-header">
        <span className="reserved-room-name">Room Name</span>
        <span className="reserved-room-badge">RESERVED</span>
      </div>

      <div className="reserved-room-details">
        <i className="fa-solid fa-user reserved-room-icon"></i>
        <span>Faculty Name | Course Code</span>
      </div>

      <button className="reserved-view-schedule-btn">View Schedule</button>
    </div>
  );
}

export default ReservedRoomCard;