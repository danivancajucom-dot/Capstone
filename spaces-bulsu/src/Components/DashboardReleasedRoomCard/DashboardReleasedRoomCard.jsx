import "./dashboard-released-room-card.css";

function DashboardReleasedRoomCard({
  room,
  name,
  time,
  subject,
  ago,
  image,
  onClick,
}) {
  return (
    <div className="dashboard-released-room-card" onClick={onClick}>
      <div className="released-room-info">
        <span className="released-room-name">{room} - {subject}</span>
        <span className="released-room-time">{time} • {ago}</span>
        <span className="released-room-faculty">{name}</span>
      </div>
      <i className="fa-solid fa-chevron-right released-room-arrow"></i>
    </div>
  );
}

export default DashboardReleasedRoomCard;