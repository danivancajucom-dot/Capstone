import { useState, useEffect } from "react";
import "./room-management-modals.css";

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
  onDeleteConfirm,
}) {
  const today = new Date();

  const todayDate = today.toISOString().split("T")[0];

  const currentTime = today.toTimeString().slice(0, 5);

  const [startDate, setStartDate] = useState(todayDate);
  const [startTime, setStartTime] = useState(currentTime);

  const [endDate, setEndDate] = useState(todayDate);
  const [endTime, setEndTime] = useState("20:00");

  useEffect(() => {
    if (showDeactivationModal) {
      const now = new Date();

      setStartDate(now.toISOString().split("T")[0]);
      setStartTime(now.toTimeString().slice(0, 5));

      setEndDate(now.toISOString().split("T")[0]);
      setEndTime("20:00");
    }
  }, [showDeactivationModal]);

  const confirmMaintenance = () => {
    if (!startDate || !endDate || !startTime || !endTime) {
      alert("Please complete the maintenance schedule.");
      return;
    }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (start < new Date()) {
      alert("Start date/time cannot be in the past.");
      return;
    }

    if (end <= start) {
      alert("End must be after Start.");
      return;
    }

    onConfirmDeactivation({
      startDate,
      startTime,
      endDate,
      endTime,
    });
  };

  return (
    <>
      {/* ================= WARNING ================= */}

      {showWarningModal && (
        <div className="rm-modal-overlay" onClick={closeWarningModal}>
          <div
            className="warning-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={closeWarningModal}
            >
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="warning-modal-body">
              <div className="warning-modal-icon">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>

              <div className="warning-modal-content">
                <h3>Schedule Impact Warning</h3>

                <p>
                  You are attempting to place
                  <strong> Room {roomName} </strong>
                  under maintenance.
                  Faculty with schedules assigned to this room will be
                  notified automatically.
                </p>

                <div className="warning-modal-actions">
                  <button
                    className="rm-modal-cancel-btn"
                    onClick={onViewAffectedSchedules}
                  >
                    View Affected Schedules
                  </button>

                  <button
                    className="rm-modal-confirm-btn"
                    onClick={handleConfirmDeactivation}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAINTENANCE ================= */}

      {showDeactivationModal && (
        <div className="rm-modal-overlay" onClick={closeDeactivationModal}>
          <div
            className="deactivation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="maintenance-title">
              Maintenance Schedule
            </h3>

            <div className="deactivation-date-row">

              <div className="deactivation-date-field">
                <label>Start Date</label>

                <input
                  type="date"
                  min={todayDate}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="deactivation-date-field">
                <label>Start Time</label>

                <input
                  type="time"
                  value={startTime}
                  min={
                    startDate === todayDate
                      ? currentTime
                      : undefined
                  }
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="deactivation-date-row">

              <div className="deactivation-date-field">
                <label>End Date</label>

                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="deactivation-date-field">
                <label>End Time</label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="deactivation-modal-actions">

              <button
                className="rm-modal-cancel-btn"
                onClick={closeDeactivationModal}
              >
                Cancel
              </button>

              <button
                className="rm-modal-confirm-btn"
                onClick={confirmMaintenance}
              >
                Confirm
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ================= ACTIVATE ================= */}

      {showActivationModal && (
        <div className="rm-modal-overlay" onClick={closeActivationModal}>
          <div
            className="activation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="activation-modal-body">

              <div className="activation-icon-wrap">
                <span className="activation-toggle-track">
                  <span className="activation-toggle-thumb" />
                </span>
              </div>

              <div className="activation-modal-content">
                <h3>
                  Activate this room?
                </h3>

                <p>
                  This room will become available again.
                </p>

              </div>

            </div>

            <div className="activation-modal-actions">

              <button
                className="rm-modal-cancel-btn"
                onClick={closeActivationModal}
              >
                Cancel
              </button>

              <button
                className="rm-modal-confirm-btn"
                onClick={onActivateConfirm}
              >
                Activate Room
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE ================= */}

      {showDeleteModal && (
        <div className="rm-modal-overlay" onClick={closeDeleteModal}>
          <div
            className="delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-modal-icon">
              <i className="fa-solid fa-trash" />
            </div>

            <h3>Delete Room</h3>

            <p>
              Delete <strong>{roomName}</strong>?
              <br />
              This action cannot be undone.
            </p>

            <div className="delete-modal-actions">

              <button
                className="modal-btn modal-btn--outline"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
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