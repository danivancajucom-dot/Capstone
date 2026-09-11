import "./lr-room-card.css";
import defaultRoomImg from "../../assets/Classroom.jpeg";

const EQUIPMENT_LABELS = {
  projector: "Projector",
  tvDisplay: "TV Display",
  ac: "AC",
  computer: "Computer",
  smartBoard: "Smart Board",
};

const EQUIPMENT_ICONS = {
  projector: "fa-solid fa-video",
  tvDisplay: "fa-solid fa-tv",
  ac: "fa-solid fa-snowflake",
  computer: "fa-solid fa-desktop",
  smartBoard: "fa-solid fa-chalkboard",
};

const FALLBACK_ICON = "fa-solid fa-toolbox";

function normalizeEquipment(equipment) {
  if (!equipment) return [];

  // ✅ Object with boolean flags: { projector: true, ac: false }
  if (typeof equipment === "object" && !Array.isArray(equipment)) {
    return Object.entries(equipment)
      .filter(([, v]) => v === true || (typeof v === "number" && v > 0))
      .map(([key]) => ({
        id: key,
        label: EQUIPMENT_LABELS[key] || key,
        icon: EQUIPMENT_ICONS[key] || FALLBACK_ICON,
      }));
  }

  // Array of strings
  if (Array.isArray(equipment)) {
    return equipment
      .filter(Boolean)
      .map((item) => ({
        id: item,
        label: EQUIPMENT_LABELS[item] || item,
        icon: EQUIPMENT_ICONS[item] || FALLBACK_ICON,
      }));
  }

  // Comma-separated string
  if (typeof equipment === "string") {
    return equipment
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map((item) => ({
        id: item,
        label: EQUIPMENT_LABELS[item] || item,
        icon: EQUIPMENT_ICONS[item] || FALLBACK_ICON,
      }));
  }

  return [];
}

function LRRoomCard({
  roomName,
  floor,
  capacity,
  roomType,
  equipment,
  status,
  onClick,
}) {
  const equipmentList = normalizeEquipment(equipment);
  const MAX_VISIBLE = 3;

  return (
    <div
      className="lr-room-card"
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className="lr-room-card-image">
        <img src={defaultRoomImg} alt="Room" />
        {status && (
          <span
            className={`room-status-lr ${status
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {status}
          </span>
        )}
      </div>

      <div className="lr-room-card-info">
        <div className="lr-room-card-top">
          <h3 className="lr-room-card-name">{roomName}</h3>
          <span className="lr-room-card-seats">
            <i className="fa-solid fa-users"></i>
            {capacity}
          </span>
        </div>

        <div className="lr-room-details">
          <div className="detail-row">
            <i className="fa-solid fa-layer-group"></i>
            <span>{floor}</span>
          </div>

          <div className="detail-row">
            <i className="fa-solid fa-door-open"></i>
            <span>{roomType}</span>
          </div>

          {equipmentList.length > 0 && (
            <div className="detail-row equipment-row">
              <i className="fa-solid fa-toolbox"></i>
              <div className="equipment-tags">
                {equipmentList.slice(0, MAX_VISIBLE).map((item) => (
                  <span key={item.id} className="equipment-tag">
                    <i className={item.icon}></i>
                    {item.label}
                  </span>
                ))}
                {equipmentList.length > MAX_VISIBLE && (
                  <span className="equipment-tag more">
                    +{equipmentList.length - MAX_VISIBLE} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LRRoomCard;