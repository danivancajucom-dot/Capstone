import "./maintenance-room-card.css";

function MaintenanceRoomCard() {
  return (
    <div className="maintenance-room-card">
      <div className="maintenance-room-header">
        <span className="maintenance-room-name">Room Name</span>
        <span className="maintenance-room-badge">MAINTENANCE</span>
      </div>

      <div className="maintenance-room-details">
        <i className="fa-solid fa-wrench maintenance-room-icon"></i>
        <span>Under Maintenance</span>
      </div>

      <button className="contact-it-btn">Contact IT</button>
    </div>
  );
}

export default MaintenanceRoomCard;