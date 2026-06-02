import "./release-room-popup.css";

function ReleaseRoomPopup() {
  return (
    <div className="popup-overlay">
      <div className="release-room-popup">
        <div className="release-room-popup-header">
          <h3 className="release-room-popup-title">Release Room</h3>
          <i className="fa-solid fa-xmark release-room-close"></i>
        </div>

        <div className="release-room-card">
          <span className="release-room-status">IN PROGRESS</span>
          <div className="release-room-image"></div>
          <div className="release-room-schedule">
            <div className="release-room-schedule-item">
              <i className="fa-regular fa-clock release-room-schedule-icon"></i>
              <div>
                <span className="release-room-schedule-label">SCHEDULED</span>
                <span className="release-room-schedule-value">07:00 AM — 10:00 AM</span>
              </div>
            </div>
            <div className="release-room-schedule-item">
              <i className="fa-regular fa-clock release-room-schedule-icon"></i>
              <div>
                <span className="release-room-schedule-label">REMAINING TIME</span>
                <span className="release-room-remaining">45 Minutes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="release-room-reason">
          <h4 className="release-room-reason-title">Reason for Release</h4>
          <div className="release-room-reason-buttons">
            <button className="release-reason-btn">Class Cancelled</button>
            <button className="release-reason-btn">Moved Online</button>
            <button className="release-reason-btn">Rescheduled</button>
          </div>
          <textarea
            className="release-room-textarea"
            placeholder="Provide additional details (optional)..."
          />
        </div>

        <button className="release-room-now-btn">
          Release Room Now <i className="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    </div>
  );
}

export default ReleaseRoomPopup;