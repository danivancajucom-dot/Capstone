import "./room-reassign-card.css";

function RoomReassignCard() {
  return (
    <div className="room-reassign-card">
      <div className="room-reassign-left">
        <div className="room-reassign-icon">
          <i class="fa-solid fa-door-open"></i>
        </div>
        <span className="room-reassign-name">Room Name</span>
      </div>
      <i className="fa-solid fa-chevron-right room-reassign-arrow"></i>
    </div>
  );
}

export default RoomReassignCard;