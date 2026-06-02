import "./conflict-card.css";

function ConflictCard() {
  return (
    <div className="conflict-card">
      <div className="conflict-card-header">
        <div className="conflict-card-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div className="conflict-card-info">
          <span className="conflict-card-title">Room Name - Overlap</span>
          <span className="conflict-card-floor">Floor Number</span>
        </div>
      </div>

      <button className="reassign-btn">Reassign Room</button>
    </div>
  );
}

export default ConflictCard;