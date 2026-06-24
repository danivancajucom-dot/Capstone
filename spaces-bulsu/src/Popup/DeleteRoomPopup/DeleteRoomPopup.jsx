import "./delete-room-popup.css";

function DeleteRoomPopup({ onCancel, onConfirm }) {
  return (
    <div className="popup-overlay">
      <div className="delete-room-popup">
        <div className="delete-room-popup-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 className="delete-room-popup-title">Delete Room?</h3>
        <p className="delete-room-popup-desc">This action cannot be undone. Are you sure you want to delete this room?</p>
        <div className="delete-room-popup-buttons">
          <button className="delete-room-cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="delete-room-confirm-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default DeleteRoomPopup;