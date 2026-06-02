import "./occupied-room-card.css";

function OccupiedRoomCard() {
  return (
    <div className="occupied-room-card">
      <div className="occupied-room-header">
        <span className="occupied-room-name">Room Name</span>
        <span className="occupied-room-badge">OCCUPIED</span>
      </div>

      <div className="occupied-room-details">
        <i className="fa-solid fa-user occupied-room-icon"></i>
        <div className="occupied-room-info">
          <span>Faculty Name | Course Code</span>
        </div>
      </div>

      <button className="view-schedule-btn">View Schedule</button>
    </div>
  );
}

export default OccupiedRoomCard;