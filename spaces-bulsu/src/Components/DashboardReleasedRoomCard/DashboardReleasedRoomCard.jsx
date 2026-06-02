import "./dashboard-released-room-card.css";

function DashboardReleasedRoomCard() {
  return (
    <div className="dashboard-released-room-card">
      <div className="released-room-info">
        <span className="released-room-name">Room Name - Course Title</span>
        <span className="released-room-time">Finished m early</span>
      </div>
      <i className="fa-solid fa-chevron-right released-room-arrow"></i>
    </div>
  );
}

export default DashboardReleasedRoomCard;