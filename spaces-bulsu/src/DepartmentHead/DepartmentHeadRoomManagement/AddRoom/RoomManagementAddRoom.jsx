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
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const toggleEquipment = (id) => {
    setEquipment((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const adjustCapacity = (delta) => {
    setCapacity((prev) => {
      const current = Number(prev || 0);
      return Math.min(200, Math.max(1, current + delta));
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!roomName.trim()) newErrors.roomName = 'Room name is required';
    if (!capacity || capacity < 1 || capacity > 200) newErrors.capacity = 'Capacity must be between 1 and 200';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancelClick = () => {
    navigate("/department-head/room-management");
  };

  const handleConfirmSuccess = () => {
    setSuccessModalOpen(false);
    setRoomName('');
    setCapacity(1);
    setRoomType('');
    setEquipment(INITIAL_EQUIPMENT);
    navigate("/department-head/room-management");
  };

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
    } catch(error) {
      console.error("Firestore Error:", error);
      setErrors({ submit: "Failed to create room. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="add-room-page dashboard-main">

      <div className="dashboard-header add-room-header">
        <h1>Add New Room</h1>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>

        <div className="form-row two">
          <div>
            <label>Room Name</label>
            <input
              className={`form-input ${errors.roomName ? 'has-error' : ''}`}
              type="text"
              placeholder="Enter room name (e.g., B101)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            {errors.roomName && <span className="form-error">{errors.roomName}</span>}
          </div>

          <div>
            <label>Room Type</label>
            <select
              className="form-input form-select"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
            >
              <option value="">Select Room Type</option>
              {ROOM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row full">
          <label>Capacity</label>
          <div className="capacity-stepper">
            <button type="button" className="capacity-btn" onClick={() => adjustCapacity(-1)}>−</button>
            <input
              type="number"
              className="capacity-value"
              value={capacity}
              min={1}
              max={200}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") { setCapacity(''); return; }
                if (/^\d+$/.test(value)) setCapacity(Number(value));
              }}
            />
            <button type="button" className="capacity-btn capacity-btn-plus" onClick={() => adjustCapacity(1)}>+</button>
          </div>
          {errors.capacity && <span className="form-error">{errors.capacity}</span>}
        </div>

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
                <span className="equipment-check">{equipment[id] ? '✓' : ''}</span>
              </label>
            ))}
          </div>
        </section>

        {errors.submit && (
          <div className="form-error" style={{ textAlign: 'center' }}>
            {errors.submit}
          </div>
        )}

      </form>

      <div className="add-room-footer-actions">
        <button
          type="button"
          className="add-room-cancel"
          onClick={handleCancelClick}
        >
          Back
        </button>
        <button
          type="button"
          className="add-room-confirm"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "Creating..." : "Create Room"}
        </button>
      </div>

      {successModalOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <div className="confirm-modal-icon success-icon">✓</div>
            <h3>Room Created!</h3>
            <p>The room "{roomName}" was successfully added.</p>
            <div className="confirm-modal-actions">
              <button className="add-room-done" onClick={handleConfirmSuccess}>
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