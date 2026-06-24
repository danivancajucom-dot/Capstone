import './room-management-modals.css';

function RoomManagementModals({
  roomName,
  showWarningModal,
  showDeactivationModal,
  showActivationModal,
  showDeleteModal,

  closeWarningModal,
  closeDeactivationModal,
  closeActivationModal,
  closeDeleteModal,

  handleConfirmDeactivation,
  onConfirmDeactivation,
  onActivateConfirm,
  onViewAffectedSchedules,
  onDeleteConfirm
}) {
  return (
    <>
      {showWarningModal && (
        <div className="rm-modal-overlay" onClick={closeWarningModal}>
          <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={closeWarningModal}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <div className="warning-modal-body">
              <div className="warning-modal-icon" aria-hidden="true">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div className="warning-modal-content">
                <h3>Schedule Impact Warning</h3>
                <p>
                  You are attempting to deactivate <strong>Room {roomName}</strong>. There are
                  schedules currently assigned to this room that may be affected. Deactivating it
                  will displace these sessions and notify the instructors.
                </p>
                <div className="warning-modal-actions">
                  <button
                    type="button"
                    className="rm-modal-cancel-btn"
                    onClick={onViewAffectedSchedules}
                  >
                    View Affected Schedules
                  </button>
                  <button
                    type="button"
                    className="rm-modal-confirm-btn"
                    onClick={handleConfirmDeactivation}
                  >
                    Confirm Deactivation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivationModal && (
        <div className="rm-modal-overlay" onClick={closeDeactivationModal}>
          <div className="deactivation-modal" onClick={(e) => e.stopPropagation()}>
            <label className="deactivation-label" htmlFor="deactivation-reason">
              Reason for Deactivation
            </label>
            <textarea
              id="deactivation-reason"
              className="deactivation-textarea"
              placeholder="Enter Reason..."
              rows={5}
            />

            <p className="deactivation-duration-title">Duration</p>
            <div className="deactivation-date-row">
              <div className="deactivation-date-field">
                <span className="deactivation-date-label">From:</span>
                <div className="deactivation-date-input-wrap">
                  <i className="fa-regular fa-calendar" aria-hidden="true" />
                  <input
                    type="date"
                    className="deactivation-date-input"
                    defaultValue="2026-10-21"
                  />
                </div>
              </div>
              <div className="deactivation-date-field">
                <span className="deactivation-date-label">To:</span>
                <div className="deactivation-date-input-wrap">
                  <i className="fa-regular fa-calendar" aria-hidden="true" />
                  <input
                    type="date"
                    className="deactivation-date-input"
                    defaultValue="2026-10-23"
                  />
                </div>
              </div>
            </div>

            <div className="deactivation-modal-actions">
              <button
                type="button"
                className="rm-modal-cancel-btn"
                onClick={closeDeactivationModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rm-modal-confirm-btn"
                onClick={onConfirmDeactivation}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showActivationModal && (
        <div className="rm-modal-overlay" onClick={closeActivationModal}>
          <div
            className="activation-modal"
            role="dialog"
            aria-labelledby="activation-dialog-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="activation-modal-body">
              <div className="activation-icon-wrap" aria-hidden="true">
                <span className="activation-toggle-track">
                  <span className="activation-toggle-thumb" />
                </span>
              </div>
              <div className="activation-modal-content">
                <h3 id="activation-dialog-title">Are you sure you want to activate this room?</h3>
                <p>This room will become available for scheduling again.</p>
              </div>
            </div>
            <div className="activation-modal-actions">
              <button
                type="button"
                className="rm-modal-cancel-btn"
                onClick={closeActivationModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rm-modal-confirm-btn"
                onClick={onActivateConfirm}
              >
                Activate Room
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
      <div className="rm-modal-overlay" onClick={closeDeleteModal}>
        <div className="delete-modal" onClick={(e) => e.stopPropagation()}>

          <div className="delete-modal-icon">
            <i className="fa-solid fa-trash" />
          </div>

          <h3>Delete Room</h3>

          <p>
            Are you sure you want to delete <strong>{roomName}</strong>?
            <br />
            This action cannot be undone.
          </p>

          <div className="delete-modal-actions">
            <button
              type="button"
              className="modal-btn modal-btn--outline"
              onClick={closeDeleteModal}
            >
              Cancel
            </button>

            <button
              type="button"
              className="modal-btn modal-btn--danger"
              onClick={onDeleteConfirm}
            >
              Delete
            </button>
          </div>

        </div>
      </div>
    )}
    </>
  );
}

export default RoomManagementModals;
