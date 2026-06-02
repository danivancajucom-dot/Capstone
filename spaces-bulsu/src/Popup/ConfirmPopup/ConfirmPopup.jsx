import "./confirm-popup.css";

function ConfirmPopup() {
  return (
    <div className="popup-overlay">
      <div className="confirm-popup">
        <div className="confirm-popup-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 className="confirm-popup-title">Are you sure?</h3>
        <p className="confirm-popup-desc">Do you want to proceed with this operation?</p>
        <div className="confirm-popup-buttons">
          <button className="confirm-cancel-btn">Cancel</button>
          <button className="confirm-confirm-btn">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmPopup;