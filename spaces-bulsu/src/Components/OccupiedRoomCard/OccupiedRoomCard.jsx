import "./occupied-room-card.css";

const formatTime = (time) => {
  if (!time) return "-";

  const [hour, minute] = time.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;

  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

function OccupiedRoomCard({ room, onViewSchedule }) {

const booking = room.activeBooking || {};

return(

<div className="occupied-room-card">

  <div className="occupied-room-header">

    <span className="occupied-room-name">

      {room.roomName}

    </span>

    <span className="occupied-room-badge">
      OCCUPIED
    </span>

  </div>

  <div className="occupied-room-details">

    <i className="fa-solid fa-user"/>

    <div>

      <span className="occupied-room-person">

        {
          booking.facultyName ||
          booking.requesterName ||
          "-"
        }

      </span>

      <small className="occupied-room-sub">

        {
          booking.subject ||
          booking.course ||
          booking.purpose ||
          "-"
        }

      </small>

    </div>

  </div>

  <div className="occupied-room-time">
    <i className="fa-regular fa-clock"></i>
    Until {formatTime(booking.endTime)}
  </div>

  <button
    className="occupied-room-btn"
    onClick={onViewSchedule}
  >
    View Schedule
  </button>

</div>

);

}

export default OccupiedRoomCard;