import "./room-card.css";

function formatTo12Hour(timeStr) {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return timeStr;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

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

  // Object with boolean flags
  if (typeof equipment === "object" && !Array.isArray(equipment)) {
    return Object.entries(equipment)
      .filter(([, v]) => v === true || (typeof v === "number" && v > 0))
      .map(([key]) => ({
        id: key,
        label: EQUIPMENT_LABELS[key] || key,
        icon: EQUIPMENT_ICONS[key] || FALLBACK_ICON,
      }));
  }

  // Array
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

function RoomCard({ room, onViewSchedule, onReserve }) {
  const status = room.status || "Available";
  const isAvailable = status === "Available";
  const isMaintenance = status === "Under Maintenance";
  const statusClass = status.toLowerCase().replace(/\s+/g, "-");

  const equipmentList = normalizeEquipment(room.equipment);
  const MAX_VISIBLE = 4;

  return (
    <div className="room-card">
      <div className={`room-status-badge ${statusClass}`}>
        <span></span>
        {status}
      </div>

      <div className="room-card-image">
        {room.image ? (
          <img src={room.image} alt={room.roomName} />
        ) : (
          <i className="fa-solid fa-door-open"></i>
        )}
      </div>

      <div className="room-card-content">
        <div className="room-card-header">
          <div>
            <h2>{room.roomName}</h2>
            <span>{room.roomType}</span>
          </div>
        </div>

        <div className="room-info">
          <div>
            <i className="fa-solid fa-users"></i>
            {room.capacity} Capacity
          </div>
          <div>
            <i className="fa-solid fa-building"></i>
            {room.floor}
          </div>
        </div>

        {equipmentList.length > 0 && (
          <div className="room-equipment">
            <i className="fa-solid fa-toolbox"></i>
            <div className="room-equipment-tags">
              {equipmentList.slice(0, MAX_VISIBLE).map((item) => (
                <span key={item.id} className="room-equipment-tag">
                  <i className={item.icon}></i>
                  {item.label}
                </span>
              ))}
              {equipmentList.length > MAX_VISIBLE && (
                <span className="room-equipment-tag more">
                  +{equipmentList.length - MAX_VISIBLE} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="room-footer">
          <div className="room-time">
            {isAvailable ? (
              <>
                <i className="fa-solid fa-circle-check"></i>
                Available Now
              </>
            ) : isMaintenance ? (
              <>
                <i className="fa-solid fa-wrench"></i>
                Under Maintenance
              </>
            ) : (
              <>
                <i className="fa-solid fa-clock"></i>
                Occupied until {formatTo12Hour(room.occupiedUntil)}
              </>
            )}
          </div>

          <div className="room-actions">
            <button className="view-btn" onClick={onViewSchedule}>
              View Schedule
            </button>
            {isAvailable ? (
              <button className="reserve-btn" onClick={onReserve}>
                Reserve
              </button>
            ) : (
              <button className="notify-btn">Notify Me</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomCard;