import { useState, useEffect } from "react";
import "./room-management-modals.css";

function RoomManagementModals({
  roomName,
  showWarningModal,
  showActivationModal,
  showDeleteModal,

  closeWarningModal,
  closeActivationModal,
  closeDeleteModal,

  onConfirmDeactivation,
  onActivateConfirm,
  onDeleteConfirm,
}) {
  return (
    <>
      {/* ================= MAINTENANCE WARNING ================= */}
      {showWarningModal && (
        <div className="rm-modal-overlay" onClick={closeWarningModal}>
          <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeWarningModal}>
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="warning-modal-body">
              <div className="warning-modal-icon">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>

              <div className="warning-modal-content">
                <h3>Place Room Under Maintenance?</h3>

                <p>
                  You are about to place <strong>Room {roomName}</strong> under maintenance.
                  Faculty with schedules assigned to this room will be notified.
                </p>

                <div className="warning-modal-actions">
                  <button className="rm-modal-cancel-btn" onClick={closeWarningModal}>
                    Cancel
                  </button>
                  <button className="rm-modal-confirm-btn" onClick={onConfirmDeactivation}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ACTIVATE ================= */}
      {showActivationModal && (
        <div className="rm-modal-overlay" onClick={closeActivationModal}>
          <div className="activation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="activation-modal-body">
              <div className="activation-icon-wrap">
                <span className="activation-toggle-track">
                  <span className="activation-toggle-thumb" />
                </span>
              </div>
              <div className="activation-modal-content">
                <h3>Activate this room?</h3>
                <p>This room will become available again.</p>
              </div>
            </div>

            <div className="activation-modal-actions">
              <button className="rm-modal-cancel-btn" onClick={closeActivationModal}>
                Cancel
              </button>
              <button className="rm-modal-confirm-btn" onClick={onActivateConfirm}>
                Activate Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE ================= */}
      {showDeleteModal && (
        <div className="rm-modal-overlay" onClick={closeDeleteModal}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <i className="fa-solid fa-trash" />
            </div>
            <h3>Delete Room</h3>
            <p>
              Delete <strong>{roomName}</strong>?<br />
              This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button className="modal-btn modal-btn--outline" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button className="modal-btn modal-btn--danger" onClick={onDeleteConfirm}>
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