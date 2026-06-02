import "./released-room-card.css";

function ReleasedRoomCard({ room, name, time, subject, ago, image, onClick }) {
  return (
    <div className="released-room-card" onClick={onClick}>
      <div className="rrc-info">
        <span className="rrc-room-badge">{room}</span>
        <span className="rrc-name">{name}</span>
        <span className="rrc-time">{time}</span>
        <span className="rrc-subject">
          <i className="fa-solid fa-users"></i> {subject}
        </span>
      </div>
      <div className="rrc-right">
        <span className="rrc-ago">{ago}</span>
        <img className="rrc-image" src={image} alt="room" />
      </div>
    </div>
  );
}

export default ReleasedRoomCard;