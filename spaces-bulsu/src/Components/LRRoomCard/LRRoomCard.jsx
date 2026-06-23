import "./lr-room-card.css";

function LRRoomCard({ onClick }) {
  return (
    <div className="lr-room-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="lr-room-card-image"></div>
      <div className="lr-room-card-info">
        <div className="lr-room-card-top">
          <span className="lr-room-card-name">Room Name</span>
          <span className="lr-room-card-seats">Seats</span>
        </div>
        <span className="lr-room-card-floor">Floor</span>
      </div>
    </div>
  );
}

export default LRRoomCard;