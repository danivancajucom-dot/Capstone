import { useState } from 'react';
import '../Shared/room-management-topbar.css';
import './room-management-edit-details.css';

function PageTopbar({ roomName = 'A1' }) {
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

const DEFAULT_EQUIPMENT = {
  projector: true,
  tvDisplay: false,
  ac: true,
  computer: false,
  smartBoard: true,
};

function RoomManagementEditDetails({ selectedRoom = 'A1', onBack = () => {}, isEditMode = false }) {
  const [isEditing, setIsEditing] = useState(isEditMode);
  const [confirmModalType, setConfirmModalType] = useState(null);
  const [capacity, setCapacity] = useState(30);
  const [roomType, setRoomType] = useState('Computer Lab');
  const [equipment, setEquipment] = useState(DEFAULT_EQUIPMENT);

  const toggleEquipment = (id) => {
    setEquipment((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const adjustCapacity = (delta) => {
    setCapacity((prev) => Math.min(200, Math.max(1, prev + delta)));
  };

  const closeConfirmModal = () => setConfirmModalType(null);

  const handleSaveClick = () => {
    setConfirmModalType('save');
  };

  const handleCancelClick = () => {
    setConfirmModalType('cancel');
  };

  const exitToRoomManagement = () => {
    closeConfirmModal();
    onBack();
  };

  return (
    <main className="dashboard-main room-details-page">
      <PageTopbar roomName={selectedRoom} />

      <div className="dashboard-header room-details-header">
        <h1>{isEditing ? 'Edit Room Details' : 'Room Details'}</h1>
      </div>

      <div className="form-card">
        <div className="form-row full">
          <label htmlFor="room-name">Room</label>
          <input
            id="room-name"
            className="form-input"
            defaultValue={selectedRoom}
            readOnly={!isEditing}
          />
        </div>

        <div className="form-row two">
          <div>
            <label>Capacity</label>
            {isEditing ? (
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
            ) : (
              <input className="form-input" value={`${capacity}`} readOnly />
            )}
          </div>

          <div>
            <label htmlFor="room-type">Room Type</label>
            {isEditing ? (
              <select
                id="room-type"
                className="form-input form-select"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
              >
                {ROOM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            ) : (
              <input className="form-input" value={roomType} readOnly />
            )}
          </div>
        </div>

        <section className="equipment-section">
          <label>{isEditing ? 'Available Equipment' : 'Equipment'}</label>
          {isEditing ? (
            <div className="equipment-grid">
              {EQUIPMENT_OPTIONS.map(({ id, label }) => (
                <label
                  key={id}
                  className={`equipment-option${equipment[id] ? ' is-checked' : ''}`}
                  htmlFor={`equipment-${id}`}
                >
                  <span className="equipment-option-text">{label}</span>
                  <input
                    id={`equipment-${id}`}
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
          ) : (
            <div className="equipment-list">
              {EQUIPMENT_OPTIONS.filter(({ id }) => equipment[id]).map(({ id, label }) => (
                <div key={id} className="equipment-chip">
                  {label}
                </div>
              ))}
            </div>
          )}
        </section>

        {!isEditing && (
          <div className="room-details-inline-actions">
            <button type="button" className="action-pill secondary" onClick={onBack}>
              Back
            </button>
            <button type="button" className="action-pill primary" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="room-details-footer-actions">
          <button type="button" className="action-pill outline" onClick={handleCancelClick}>
            Cancel
          </button>
          <button type="button" className="action-pill primary" onClick={handleSaveClick}>
            Save
          </button>
        </div>
      )}

      {confirmModalType && (
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
            <h3 id="confirm-dialog-title">Are you sure?</h3>
            <p>
              {confirmModalType === 'save'
                ? 'This action cannot be undone. Do you want to proceed with this operation?'
                : 'Do you want to proceed with this operation?'}
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="action-pill outline confirm-modal-btn"
                onClick={exitToRoomManagement}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-pill primary confirm-modal-btn"
                onClick={exitToRoomManagement}
              >
                {confirmModalType === 'save' ? 'Save' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default RoomManagementEditDetails;
