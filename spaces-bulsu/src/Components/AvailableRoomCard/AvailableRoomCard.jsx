import "./available-room-card.css";

function AvailableRoomCard() {
  return (
    <div className="available-room-card">
      <div className="available-room-header">
        <span className="available-room-name">Room Name</span>
        <span className="available-room-badge">AVAILABLE</span>
      </div>

      <div className="available-room-details">
        <i className="fa-solid fa-users available-room-icon"></i>
        <span>Capacity | Room Type</span>
      </div>

      <button className="quick-reserve-btn">Quick Reserve</button>
    </div>
  );
}

export default AvailableRoomCard;