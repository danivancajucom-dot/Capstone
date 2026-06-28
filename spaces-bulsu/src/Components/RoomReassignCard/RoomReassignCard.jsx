import "./room-reassign-card.css";

function RoomReassignCard({
    conflict,
    selected,
    onSelect
}) {
  return (
    <div
      className={`room-reassign-card ${
        selected ? "selected" : ""
      }`}
      onClick={onSelect}
    >
      <div className="room-reassign-left">
        <div className="room-reassign-icon">
          <i className="fa-solid fa-door-open"></i>
        </div>

        <span className="room-reassign-name">
          {conflict.roomName}
        </span>
      </div>

      <i className="fa-solid fa-chevron-right room-reassign-arrow"></i>
    </div>
  );
}

export default RoomReassignCard;