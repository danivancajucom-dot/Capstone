import { useState, useRef, useEffect } from 'react';
import './room-management-add-room.css';
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../../firebase";
import {
  collection, query, where, getDocs, getDoc,
  doc, addDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { logActivity } from "../../../utils/logActivity";

const ROOM_TYPES = ['Computer Lab', 'Lecture Room', 'Conference Room', 'Laboratory'];

const EQUIPMENT_OPTIONS = [
  { id: 'projector',  label: 'Projector',   icon: '📽' },
  { id: 'tvDisplay',  label: 'TV Display',   icon: '📺' },
  { id: 'ac',         label: 'AC',           icon: '❄️' },
  { id: 'computer',   label: 'Computer',     icon: '💻' },
  { id: 'smartBoard', label: 'Smart Board',  icon: '🖊' },
];

const FLOORS = ["1st floor", "2nd floor", "3rd floor", "4th floor"];

const INITIAL_EQUIPMENT = {
  projector: false, tvDisplay: false, ac: false,
  computer: false, smartBoard: false,
};

/* ─── Custom Dropdown ─────────────────────────────────── */
function CustomDropdown({ placeholder, options, value, onChange, hasError }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`custom-select ${open ? "open" : ""} ${hasError ? "has-error" : ""}`} ref={ref}>
      <div className="custom-select-trigger" onClick={() => setOpen(!open)}>
        <span className={value ? "" : "placeholder-text"}>{value || placeholder}</span>
        <svg className={`chevron-icon ${open ? "rotated" : ""}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option}
              className={`custom-select-option ${value === option ? "selected" : ""}`}
              onClick={() => { onChange(option); setOpen(false); }}
            >
              {value === option && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{marginRight: 8, flexShrink: 0}}>
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="#f57c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────── */
function RoomManagementAddRoom({ onBack = () => {}, onSuccess = () => {} }) {
  const [roomName, setRoomName]       = useState('');
  const [capacity, setCapacity]       = useState(1);
  const [roomType, setRoomType]       = useState('');
  const [equipment, setEquipment]     = useState(INITIAL_EQUIPMENT);
  const [floor, setFloor]             = useState('');

  const [cancelModalOpen, setCancelModalOpen]   = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const toggleEquipment = (id) =>
    setEquipment((prev) => ({ ...prev, [id]: !prev[id] }));

  const adjustCapacity = (delta) =>
    setCapacity((prev) => Math.min(200, Math.max(1, Number(prev || 0) + delta)));

  /* validation */
  const validateForm = () => {
    const errs = {};
    if (!floor)            errs.floor    = "Floor is required";
    if (!roomName.trim())  errs.roomName = "Room name is required";
    if (!capacity || capacity < 1 || capacity > 200)
      errs.capacity = "Capacity must be between 1 and 200";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* open preview instead of submitting directly */
  const handleCreateClick = (e) => {
    e.preventDefault();
    if (validateForm()) setPreviewModalOpen(true);
  };

  /* actual Firestore submit — called from preview modal */
  const handleConfirmCreate = async () => {
    setPreviewModalOpen(false);
    setLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) { alert("No authenticated user found."); setLoading(false); return; }

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!userSnap.exists()) throw new Error("User record not found.");
      const currentUser = userSnap.data();
      const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();

      const existingRoom = await getDocs(
        query(collection(db, "rooms"), where("roomName", "==", roomName.trim()))
      );
      if (!existingRoom.empty) {
        setErrors({ roomName: "Room name already exists." });
        setLoading(false);
        return;
      }

      const roomRef = await addDoc(collection(db, "rooms"), {
        roomName: roomName.trim(),
        capacity: Number(capacity),
        roomType,
        equipment,
        floor,

        status: "AVAILABLE",
        roomStatus: "active",
      });

      await setDoc(doc(db, "rooms", roomRef.id, "schedules", "_metadata"), {
        initialized: true, totalSchedules: 0,
        semester: "", schoolYear: "", createdAt: serverTimestamp(),
      });

      await logActivity({
        userId: firebaseUser.uid, user: fullName, role: currentUser.role,
        action: "Created Room", actionType: "success",
        target: roomName.trim(), status: "SUCCESS",
      });

      setSuccessModalOpen(true);
    } catch (err) {
      console.error("Firestore Error:", err);
      setErrors({ submit: "Failed to create room. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSuccess = () => {
    setSuccessModalOpen(false);
    setFloor(''); setRoomName(''); setCapacity(1);
    setRoomType(''); setEquipment(INITIAL_EQUIPMENT);
    navigate("/department-head/room-management");
  };

  const checkedEquipment = EQUIPMENT_OPTIONS.filter(({ id }) => equipment[id]);

  /* ── render ── */
  return (
    <main className="add-room-page dashboard-main">

      {/* PAGE HEADER */}
      <div className="add-room-page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => setCancelModalOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M11 4L6 9L11 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span>Back</span>
        </button>
        <div>
          <p className="page-breadcrumb">Room Management</p>
          <h1 className="page-title">Add New Room</h1>
        </div>
      </div>

      {/* FORM CARD */}
      <form className="form-card" onSubmit={handleCreateClick}>

        {/* SECTION: Basic Info */}
        <div className="form-section">
          <div className="form-section-label">
            <span className="section-badge">1</span>
            Basic Information
          </div>

          <div className="field-group">
            <label className="field-label">
              Room Name <span className="required-dot">*</span>
            </label>
            <input
              className={`field-input ${errors.roomName ? 'has-error' : ''}`}
              type="text"
              placeholder="e.g. B101, Lab-A, Conference Hall"
              value={roomName}
              onChange={(e) => { setRoomName(e.target.value); setErrors(p => ({...p, roomName: ''})); }}
            />
            {errors.roomName && <span className="field-error">{errors.roomName}</span>}
          </div>

          <div className="two-col">
            {/* Capacity */}
            <div className="field-group">
              <label className="field-label">
                Capacity <span className="required-dot">*</span>
              </label>
              <div className={`capacity-stepper ${errors.capacity ? 'has-error' : ''}`}>
                <button type="button" className="step-btn minus" onClick={() => adjustCapacity(-1)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <input
                  type="number"
                  className="step-value"
                  value={capacity}
                  min={1} max={200}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace','ArrowLeft','ArrowRight'].includes(e.key))
                      e.preventDefault();
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') { setCapacity(''); return; }
                    if (/^\d+$/.test(v)) setCapacity(Number(v));
                  }}
                />
                <button type="button" className="step-btn plus" onClick={() => adjustCapacity(1)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <span className="field-hint">Max 200 people</span>
              {errors.capacity && <span className="field-error">{errors.capacity}</span>}
            </div>

            {/* Room Type */}
            <div className="field-group">
              <label className="field-label">Room Type</label>
              <select
                className="field-input field-select"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
              >
                <option value="">Select type...</option>
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Floor */}
          <div className="field-group">
            <label className="field-label">
              Floor <span className="required-dot">*</span>
            </label>
            <CustomDropdown
              placeholder="Select floor..."
              options={FLOORS}
              value={floor}
              onChange={(v) => { setFloor(v); setErrors(p => ({...p, floor: ''})); }}
              hasError={!!errors.floor}
            />
            {errors.floor && <span className="field-error">{errors.floor}</span>}
          </div>
        </div>

        <div className="section-divider" />

        {/* SECTION: Equipment */}
        <div className="form-section">
          <div className="form-section-label">
            <span className="section-badge">2</span>
            Equipment
            {checkedEquipment.length > 0 && (
              <span className="equipment-count">{checkedEquipment.length} selected</span>
            )}
          </div>

          <div className="equipment-grid">
            {EQUIPMENT_OPTIONS.map(({ id, label, icon }) => (
              <label
                key={id}
                className={`equipment-chip ${equipment[id] ? 'checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={equipment[id]}
                  onChange={() => toggleEquipment(id)}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
                <span className="chip-icon">{icon}</span>
                <span className="chip-label">{label}</span>
                <span className="chip-check">
                  {equipment[id]
                    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L4.5 8.5L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : null
                  }
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="form-footer">
          {errors.submit && <span className="field-error" style={{textAlign:'center'}}>{errors.submit}</span>}
          <div className="footer-btns">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCancelModalOpen(true)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" /> Creating...
                </span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Review & Create
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ── CANCEL MODAL ── */}
      {cancelModalOpen && (
        <div className="modal-overlay" onClick={() => setCancelModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-wrap warning">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 9V14M13 17.5V18M3 21.5H23L13 4.5L3 21.5Z" stroke="#f57c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="modal-title">Discard changes?</h3>
            <p className="modal-body">All information you've entered will be lost. This can't be undone.</p>
            <div className="modal-actions two">
              <button className="btn btn-outline" onClick={() => setCancelModalOpen(false)}>Keep editing</button>
              <button className="btn btn-danger" onClick={() => navigate("/department-head/room-management")}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW / CONFIRM MODAL ── */}
      {previewModalOpen && (
        <div className="modal-overlay" onClick={() => setPreviewModalOpen(false)}>
          <div className="modal-box preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <div className="modal-icon-wrap accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12H15M9 16H15M7 4H5C3.9 4 3 4.9 3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4H17M9 4H15C15.6 4 16 4.4 16 5V5C16 5.6 15.6 6 15 6H9C8.4 6 8 5.6 8 5V5C8 4.4 8.4 4 9 4Z" stroke="#f57c00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="modal-title" style={{marginBottom: 2}}>Review room details</h3>
                <p className="modal-sub">Please confirm the information before creating.</p>
              </div>
            </div>

            <div className="preview-card">
              <div className="preview-room-name">
                <span className="room-name-badge">{roomName}</span>
                {roomType && <span className="room-type-badge">{roomType}</span>}
              </div>

              <div className="preview-row">
                <span className="preview-label">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{verticalAlign:-2}}>
                    <path d="M7 1C4.24 1 2 3.24 2 6C2 9.75 7 13 7 13C7 13 12 9.75 12 6C12 3.24 9.76 1 7 1ZM7 7.5C6.17 7.5 5.5 6.83 5.5 6C5.5 5.17 6.17 4.5 7 4.5C7.83 4.5 8.5 5.17 8.5 6C8.5 6.83 7.83 7.5 7 7.5Z" fill="#888"/>
                  </svg>
                  Floor
                </span>
                <span className="preview-value">{floor}</span>
              </div>

              <div className="preview-row">
                <span className="preview-label">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{verticalAlign:-2}}>
                    <path d="M7 1C4 1 2 3.5 2 5.5C2 9 7 13 7 13C7 13 12 9 12 5.5C12 3.5 10 1 7 1Z" stroke="#888" strokeWidth="1.5" fill="none"/>
                    <circle cx="7" cy="5.5" r="1.5" fill="#888"/>
                  </svg>
                  Capacity
                </span>
                <span className="preview-value">{capacity} people</span>
              </div>

              <div className="preview-row" style={{alignItems:'flex-start'}}>
                <span className="preview-label" style={{paddingTop:2}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{verticalAlign:-2}}>
                    <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="#888" strokeWidth="1.5" fill="none"/>
                    <path d="M5 3V2M9 3V2M1 6H13" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Equipment
                </span>
                <div className="preview-equipment">
                  {checkedEquipment.length > 0
                    ? checkedEquipment.map(({ id, label, icon }) => (
                        <span key={id} className="preview-equipment-tag">{icon} {label}</span>
                      ))
                    : <span className="preview-none">None selected</span>
                  }
                </div>
              </div>
            </div>

            <div className="modal-actions two">
              <button className="btn btn-outline" onClick={() => setPreviewModalOpen(false)}>
                Edit details
              </button>
              <button className="btn btn-primary" onClick={handleConfirmCreate}>
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS MODAL ── */}
      {successModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon-wrap success">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M4 14L10.5 20.5L24 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="modal-title">Room created!</h3>
            <p className="modal-body">
              <strong>{roomName}</strong> has been successfully added to the system.
            </p>
            <div className="modal-actions single">
              <button className="btn btn-primary" onClick={handleConfirmSuccess}>Done</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default RoomManagementAddRoom;