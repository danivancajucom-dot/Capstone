import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";
import "./room-management-edit-details.css";

const ROOM_TYPES = [
  "Computer Lab",
  "Lecture Room",
  "Conference Room",
  "Laboratory",
];

const EQUIPMENT_OPTIONS = [
  { id: "projector", label: "Projector" },
  { id: "tvDisplay", label: "TV Display" },
  { id: "ac", label: "AC" },
  { id: "computer", label: "Computer" },
  { id: "smartBoard", label: "Smart Board" },
];

function RoomManagementEditDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);

  const [roomName, setRoomName] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [roomType, setRoomType] = useState("Computer Lab");

  const [equipment, setEquipment] = useState({
    projector: false,
    tvDisplay: false,
    ac: false,
    computer: false,
    smartBoard: false,
  });

  const [confirmModalType, setConfirmModalType] = useState(null);

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const roomRef = doc(db, "rooms", id);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
          alert("Room not found.");
          navigate("/department-head/room-management");
          return;
        }

        const data = roomSnap.data();

        setRoomName(data.roomName || "");
        setCapacity(data.capacity || 0);
        setRoomType(data.roomType || "Computer Lab");

        setEquipment({
          projector: data.equipment?.projector || false,
          tvDisplay: data.equipment?.tvDisplay || false,
          ac: data.equipment?.ac || false,
          computer: data.equipment?.computer || false,
          smartBoard: data.equipment?.smartBoard || false,
        });

        setLoading(false);
      } catch (error) {
        console.error(error);
        alert("Failed to load room.");
      }
    };

    loadRoom();
  }, [id, navigate]);

  const toggleEquipment = (equipmentId) => {
    setEquipment((prev) => ({
      ...prev,
      [equipmentId]: !prev[equipmentId],
    }));
  };

  const adjustCapacity = (delta) => {
    setCapacity((prev) =>
      Math.min(200, Math.max(1, prev + delta))
    );
  };

  const closeConfirmModal = () => {
    setConfirmModalType(null);
  };

  const handleSaveClick = () => {
    setConfirmModalType("save");
  };

  const handleCancelClick = () => {
    setConfirmModalType("cancel");
  };

  const handleSaveRoom = async () => {
    try {
      await updateDoc(
        doc(db, "rooms", id),
        {
          roomName,
          capacity,
          roomType,
          equipment,
        }
      );

      navigate("/department-head/room-management");
    } catch (error) {
      console.error(error);
      alert("Failed to update room.");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          fontSize: "18px",
        }}
      >
        Loading room details...
      </div>
    );
  }

  return (
    <main className="dashboard-main room-details-page">

      <div className="dashboard-header room-details-header">
        <h1>Edit Room Details</h1>
      </div>

      <div className="form-card">

        <div className="form-row full">
          <label htmlFor="room-name">
            Room Name
          </label>

          <input
            id="room-name"
            className="form-input"
            value={roomName}
            onChange={(e) =>
              setRoomName(e.target.value)
            }
          />
        </div>

        <div className="form-row two">

          <div>
            <label>
              Capacity
            </label>

            <div className="capacity-stepper">
              <button
                type="button"
                className="capacity-btn"
                onClick={() =>
                  adjustCapacity(-1)
                }
              >
                −
              </button>

              <span className="capacity-value">
                {capacity}
              </span>

              <button
                type="button"
                className="capacity-btn capacity-btn-plus"
                onClick={() =>
                  adjustCapacity(1)
                }
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="room-type">
              Room Type
            </label>

            <select
              id="room-type"
              className="form-input form-select"
              value={roomType}
              onChange={(e) =>
                setRoomType(e.target.value)
              }
            >
              {ROOM_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>
          </div>

        </div>

        <section className="equipment-section">
          <label>
            Available Equipment
          </label>

          <div className="equipment-grid">
            {EQUIPMENT_OPTIONS.map(
              ({ id, label }) => (
                <label
                  key={id}
                  className={`equipment-option ${
                    equipment[id]
                      ? "is-checked"
                      : ""
                  }`}
                >
                  <span className="equipment-option-text">
                    {label}
                  </span>

                  <input
                    type="checkbox"
                    checked={equipment[id]}
                    onChange={() =>
                      toggleEquipment(id)
                    }
                  />

                  <span className="equipment-check">
                    {equipment[id]
                      ? "✓"
                      : ""}
                  </span>
                </label>
              )
            )}
          </div>
        </section>

      </div>

      <div className="room-details-footer-actions">

        <button
          type="button"
          className="action-pill outline"
          onClick={handleCancelClick}
        >
          Cancel
        </button>

        <button
          type="button"
          className="action-pill primary"
          onClick={handleSaveClick}
        >
          Save
        </button>

      </div>

      {confirmModalType && (
        <div
          className="confirm-modal-overlay"
          onClick={closeConfirmModal}
        >
          <div
            className="confirm-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="confirm-modal-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>

            <h3>
              Are you sure?
            </h3>

            <p>
              {confirmModalType === "save"
                ? "Save all changes to this room?"
                : "Discard all changes?"}
            </p>

            <div className="confirm-modal-actions">

              <button
                type="button"
                className="action-pill outline confirm-modal-btn"
                onClick={closeConfirmModal}
              >
                No
              </button>

              <button
                type="button"
                className="action-pill primary confirm-modal-btn"
                onClick={() => {
                  if (
                    confirmModalType ===
                    "save"
                  ) {
                    handleSaveRoom();
                  } else {
                    navigate(
                      "/department-head/room-management"
                    );
                  }
                }}
              >
                Yes
              </button>

            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default RoomManagementEditDetails;