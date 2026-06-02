import "./save-popup.css";

function SavePopup() {
  return (
    <div className="popup-overlay">
      <div className="save-popup">
        <div className="save-popup-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 className="save-popup-title">Are you sure?</h3>
        <p className="save-popup-desc">This action cannot be undone. Do you want to proceed with this operation?</p>
        <div className="save-popup-buttons">
          <button className="save-cancel-btn">Cancel</button>
          <button className="save-save-btn">Save</button>
        </div>
      </div>
    </div>
  );
}

export default SavePopup;