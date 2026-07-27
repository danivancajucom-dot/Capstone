import "./lr-room-card.css";
import defaultRoomImg from "../../assets/Classroom.jpeg";

function LRRoomCard({
  roomName,
  floor,
  capacity,
  roomType,
  status,
  onClick,
}) {
  return (
    <div
      className="lr-room-card"
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className="lr-room-card-image">
        <img src={defaultRoomImg} alt="Room" />
        {status && (
          <span className={`room-status-lr ${status.toLowerCase()}`}>
            {status}
          </span>
        )}
      </div>

      <div className="lr-room-card-info">
        <div className="lr-room-card-top">
          <h3 className="lr-room-card-name">{roomName}</h3>

          <span className="lr-room-card-seats">
            <i className="fa-solid fa-users"></i>
            {capacity}
          </span>
        </div>

        <div className="lr-room-details">
          <div className="detail-row">
            <i className="fa-solid fa-layer-group"></i>
            <span>{floor}</span>
          </div>

          <div className="detail-row">
            <i className="fa-solid fa-door-open"></i>
            <span>{roomType}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LRRoomCard;