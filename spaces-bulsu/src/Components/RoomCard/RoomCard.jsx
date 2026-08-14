import "./room-card.css";

// Helper: convert 24-hour time string (e.g., "14:30") to 12-hour format with AM/PM
function formatTo12Hour(timeStr) {
  if (!timeStr) return "";

  // Try parsing as "HH:MM" or "HH:MM:SS"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return timeStr; // fallback: return as-is

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

function RoomCard({ room, onViewSchedule, onReserve }) {
  return (
    <div className="room-card">

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

          <div
            className={`room-status ${
              room.status === "Available"
                ? "available"
                : "occupied"
            }`}
          >
            <span></span>
            {room.status}
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

        <div className="room-footer">

          <div className="room-time">

            {room.status === "Available" ? (
              <>
                <i className="fa-solid fa-circle-check"></i>
                Available Now
              </>
            ) : (
              <>
                <i className="fa-solid fa-clock"></i>
                Occupied until {formatTo12Hour(room.occupiedUntil)}
              </>
            )}

          </div>

          <div className="room-actions">

            <button
              className="view-btn"
              onClick={onViewSchedule}
            >
              View Schedule
            </button>

            {room.status === "Available" ? (
              <button
                className="reserve-btn"
                onClick={onReserve}
              >
                Reserve
              </button>
            ) : (
              <button className="notify-btn">
                Notify Me
              </button>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default RoomCard;