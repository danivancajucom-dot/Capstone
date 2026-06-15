import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import './room-management-add-room.css';
import { useNavigate } from "react-router-dom";

const ROOM_TYPES = ['Computer Lab', 'Lecture Room', 'Conference Room', 'Laboratory'];

const EQUIPMENT_OPTIONS = [
  { id: 'projector', label: 'Projector' },
  { id: 'tvDisplay', label: 'TV Display' },
  { id: 'ac', label: 'AC' },
  { id: 'computer', label: 'Computer' },
  { id: 'smartBoard', label: 'Smart Board' },
];

const INITIAL_EQUIPMENT = {
  projector: false,
  tvDisplay: false,
  ac: false,
  computer: false,
  smartBoard: false,
};

function RoomManagementAddRoom({ onBack = () => {}, onSuccess = () => {} }) {
  const [roomName, setRoomName] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [roomType, setRoomType] = useState('');
  const [equipment, setEquipment] = useState(INITIAL_EQUIPMENT);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // --------------------
  // EQUIPMENT TOGGLE
  // --------------------
  const toggleEquipment = (id) => {
    setEquipment((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // --------------------
  // CAPACITY CONTROL
  // --------------------
const adjustCapacity = (delta) => {
  setCapacity((prev) => {
    const current = Number(prev || 0);

    return Math.min(200, Math.max(1, current + delta));
  });
};

  // --------------------
  // VALIDATION
  // --------------------
  const validateForm = () => {
    const newErrors = {};

    if (!roomName.trim()) {
      newErrors.roomName = 'Room name is required';
    }

    if (!capacity || capacity < 1 || capacity > 200) {
      newErrors.capacity = 'Capacity must be between 1 and 200';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --------------------
  // CANCEL MODAL
  // --------------------
  const handleCancelClick = () => setConfirmModalOpen(true);
  
  const handleConfirmCancel = () => {
  setConfirmModalOpen(false);
  navigate("/department-head/room-management");
};

  const closeConfirmModal = () => setConfirmModalOpen(false);

  // --------------------
  // SUCCESS RESET
  // --------------------
  const handleConfirmSuccess = () => {
    setSuccessModalOpen(false);

    setRoomName('');
    setCapacity(1);
    setRoomType('');
    setEquipment(INITIAL_EQUIPMENT);

    navigate("/department-head/room-management");
  };

  // --------------------
  // SUBMIT TO FIRESTORE
  // --------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      await addDoc(collection(db, "rooms"), {
        roomName: roomName.trim(),
        capacity: Number(capacity),
        roomType,
        equipment,
        status: "available",
        createdAt: serverTimestamp(),
      });

      setSuccessModalOpen(true);
    } catch (error) {
      console.error("Firestore Error:", error);
      setErrors({ submit: "Failed to create room. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // --------------------
  // UI
  // --------------------
  return (
    <main className="add-room-page dashboard-main">

      {/* HEADER */}
      <div className="dashboard-header add-room-header">
        <h1>Add New Room</h1>
      </div>

      {/* FORM */}
      <form className="form-card" onSubmit={handleSubmit}>

        {/* ROOM NAME */}
        <div className="form-row full">
          <label>Room Name</label>
          <input
            className={`form-input ${errors.roomName ? 'has-error' : ''}`}
            type="text"
            placeholder="Enter room name (e.g., B101)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          {errors.roomName && (
            <span className="form-error">{errors.roomName}</span>
          )}
        </div>

        {/* CAPACITY + TYPE */}
        <div className="form-row two">

          {/* Capacity */}
          <div>
            <label>Capacity</label>

            <div className="capacity-stepper">
              <button type="button" className="capacity-btn" onClick={() => adjustCapacity(-1)}>
                −
              </button>

              <input
                type="number"
                className="capacity-value"
                value={capacity}
                min={1}
                max={200}
                onKeyDown={(e) => {
                  if (
                    !/[0-9]/.test(e.key) &&
                    e.key !== 'Backspace' &&
                    e.key !== 'ArrowLeft' &&
                    e.key !== 'ArrowRight'
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;

                  // allow empty input while typing
                  if (value === '') {
                    setCapacity('');
                    return;
                  }

                  // only allow numbers
                  if (/^\d+$/.test(value)) {
                    setCapacity(Number(value));
                  }
                }}
              />

              <button type="button" className="capacity-btn capacity-btn-plus" onClick={() => adjustCapacity(1)}>
                +
              </button>
            </div>

            {errors.capacity && (
              <span className="form-error">{errors.capacity}</span>
            )}
          </div>

          {/* Room Type */}
          <div>
            <label>Room Type</label>

            <select
              className="form-input form-select"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
            >
              <option value="">Select Room Type</option>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* EQUIPMENT */}
        <section className="equipment-section">
          <label>Equipment</label>

          <div className="equipment-grid">
            {EQUIPMENT_OPTIONS.map(({ id, label }) => (
              <label
                key={id}
                className={`equipment-option ${equipment[id] ? 'is-checked' : ''}`}
              >
                <span className="equipment-option-text">{label}</span>

                <input
                  type="checkbox"
                  checked={equipment[id]}
                  onChange={() => toggleEquipment(id)}
                />

                <span className="equipment-check">
                  {equipment[id] ? '✓' : ''}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ACTIONS */}
        <div className="add-room-footer-actions">

          <button
            type="button"
            className="action-pill outline"
            onClick={handleCancelClick}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="action-pill primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
        </div>

        {errors.submit && (
          <div className="form-error" style={{ textAlign: 'center' }}>
            {errors.submit}
          </div>
        )}

      </form>

      {/* CANCEL MODAL */}
      {confirmModalOpen && (
        <div className="confirm-modal-overlay" onClick={closeConfirmModal}>
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-modal-icon">⚠</div>
            <h3>Cancel Addition?</h3>
            <p>All entered information will be lost.</p>

            <div className="confirm-modal-actions">
              <button className="action-pill outline" onClick={closeConfirmModal}>
                Go Back
              </button>

              <button className="action-pill primary" onClick={handleConfirmCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successModalOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <div className="confirm-modal-icon success-icon">✓</div>

            <h3>Room Created!</h3>
            <p>The room "{roomName}" was successfully added.</p>

            <div className="confirm-modal-actions">
              <button
                className="action-pill primary"
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