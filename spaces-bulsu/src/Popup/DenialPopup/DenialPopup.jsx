import "./denial-popup.css";
import { useState } from "react";

function DenialPopup({ onCancel, onConfirm }) {
  const [reason, setReason] = useState("");

  return (
    <div className="popup-overlay">
      <div className="denial-popup">
        <label className="denial-label">Reason for Denial</label>
        <textarea
          className="denial-input"
          placeholder="Enter reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="denial-buttons">
          <button className="denial-cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="denial-confirm-btn" onClick={() => onConfirm(reason)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default DenialPopup;