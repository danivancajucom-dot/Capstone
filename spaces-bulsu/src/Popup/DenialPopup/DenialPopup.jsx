import "./denial-popup.css";

function DenialPopup() {
  return (
    <div className="popup-overlay">
      <div className="denial-popup">
        <label className="denial-label">Reason for Denial</label>
        <textarea
          className="denial-input"
          placeholder="Enter reason..."
        />
        <div className="denial-buttons">
          <button className="cancel-btn">Cancel</button>
          <button className="confirm-btn">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default DenialPopup;