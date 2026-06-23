import "./logout-popup.css";

function LogoutPopup({ onCancel, onConfirm }) {
  return (
    <div className="popup-overlay">
      <div className="logout-popup">
        <div className="logout-popup-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 className="logout-popup-title">Are you sure you want to logout?</h3>
        <div className="logout-popup-buttons">
          <button className="logout-cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="logout-btn" onClick={onConfirm}>Logout</button>
        </div>
      </div>
    </div>
  );
}

export default LogoutPopup;