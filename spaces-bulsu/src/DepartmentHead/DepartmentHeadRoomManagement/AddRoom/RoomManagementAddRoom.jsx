import { useState } from 'react';
import '../Shared/room-management-topbar.css';
import './room-management-add-room.css';

function PageTopbar({ roomName = 'Add New Room' }) {
  return (
    <div className="dashboard-topbar">
      <div className="search-box">
        <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true" />
        <input type="text" placeholder="Search rooms or users..." />
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-btn icon-btn--notify" aria-label="notifications">
          <i className="fa-regular fa-bell" aria-hidden="true" />
          <span className="notify-badge" aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" aria-label="settings">
          <i className="fa-solid fa-gear" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const ROOM_TYPES = ['Computer Lab', 'Lecture Room', 'Conference Room', 'Laboratory'];

const EQUIPMENT_OPTIONS = [
  { id: 'projector', label: 'Projector' },
  { id: 'tvDisplay', label: 'TV Display' },
  { id: 'ac', label: 'AC' },
  { id: 'computer', label: 'Computer' },
  { id: 'smartBoard', label: 'Smart Board' },
];

const DEFAULT_FORM_STATE = {
  roomName: '',
  capacity: 0,
  roomType: '',
  equipment: {
    projector: false,
    tvDisplay: false,
    ac: false,
    computer: false,
    smartBoard: false,
  },
};

function RoomManagementAddRoom({ onBack = () => {}, onSuccess = () => {} }) {
  const [roomName, setRoomName] = useState('');
  const [capacity, setCapacity] = useState(0);
  const [roomType, setRoomType] = useState('');
  const [equipment, setEquipment] = useState(DEFAULT_FORM_STATE.equipment);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const toggleEquipment = (id) => {
    setEquipment((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const adjustCapacity = (delta) => {
    setCapacity((prev) => Math.min(200, Math.max(1, prev + delta)));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!roomName.trim()) {
      newErrors.roomName = 'Room name is required';
    }
    if (capacity < 1 || capacity > 200) {
      newErrors.capacity = 'Capacity must be between 1 and 200';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancelClick = () => {
    setConfirmModalOpen(true);
  };

  const handleConfirmCancel = () => {
    setConfirmModalOpen(false);
    onBack();
  };

  const closeConfirmModal = () => setConfirmModalOpen(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setConfirmModalOpen(false);
    // Simulate successful creation
    setSuccessModalOpen(true);
  };

  const handleConfirmSuccess = () => {
    setSuccessModalOpen(false);
    onSuccess();
  };

  return (
    <main className="dashboard-main add-room-page">
      <PageTopbar roomName="Add New Room" />

      <div className="dashboard-header add-room-header">
        <h1>Add New Room</h1>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-row full">
          <label htmlFor="room-name">Room Name</label>
          <input
            id="room-name"
            className={`form-input${errors.roomName ? ' has-error' : ''}`}
            type="text"
            placeholder="Enter room name (e.g., B101)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          {errors.roomName && (
            <span className="form-error">{errors.roomName}</span>
          )}
        </div>

        <div className="form-row two">
          <div>
            <label>Capacity</label>
            <div className="capacity-stepper">
              <button
                type="button"
                className="capacity-btn"
                onClick={() => adjustCapacity(-1)}
                aria-label="Decrease capacity"
              >
                −
              </button>
              <span className="capacity-value">{capacity}</span>
              <button
                type="button"
                className="capacity-btn capacity-btn-plus"
                onClick={() => adjustCapacity(1)}
                aria-label="Increase capacity"
              >
                +
              </button>
            </div>
            {errors.capacity && (
              <span className="form-error">{errors.capacity}</span>
            )}
          </div>

          <div>
            <label htmlFor="room-type">Room Type</label>
            <select
              id="room-type"
              className="form-input form-select"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
            >
              <option value="" disabled>
                Select Room Type
              </option>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <section className="equipment-section">
          <label>Equipment</label>
          <div className="equipment-grid">
            {EQUIPMENT_OPTIONS.map(({ id, label }) => (
              <label
                key={id}
                className={`equipment-option${equipment[id] ? ' is-checked' : ''}`}
                htmlFor={`add-equipment-${id}`}
              >
                <span className="equipment-option-text">{label}</span>
                <input
                  id={`add-equipment-${id}`}
                  type="checkbox"
                  checked={equipment[id]}
                  onChange={() => toggleEquipment(id)}
                />
                <span className="equipment-check" aria-hidden="true">
                  {equipment[id] ? '✓' : ''}
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="add-room-footer-actions">
          <button type="button" className="action-pill outline" onClick={handleCancelClick}>
            Cancel
          </button>
          <button type="submit" className="action-pill primary">
            Create Room
          </button>
        </div>
      </form>

      {confirmModalOpen && (
        <div className="confirm-modal-overlay" onClick={closeConfirmModal}>
          <div
            className="confirm-modal"
            role="dialog"
            aria-labelledby="confirm-dialog-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-modal-icon" aria-hidden="true">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3 id="confirm-dialog-title">Cancel Addition?</h3>
            <p>All entered information will be lost. Are you sure you want to cancel?</p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="action-pill outline confirm-modal-btn"
                onClick={closeConfirmModal}
              >
                Go Back
              </button>
              <button
                type="button"
                className="action-pill primary confirm-modal-btn"
                onClick={handleConfirmCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="confirm-modal-overlay">
          <div
            className="confirm-modal"
            role="dialog"
            aria-labelledby="success-dialog-title"
            aria-modal="true"
          >
            <div className="confirm-modal-icon success-icon" aria-hidden="true">
              <i className="fa-solid fa-check" />
            </div>
            <h3 id="success-dialog-title">Room Created!</h3>
            <p>The room "{roomName}" has been successfully added to the system.</p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="action-pill primary confirm-modal-btn"
                onClick={handleConfirmSuccess}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default RoomManagementAddRoom;