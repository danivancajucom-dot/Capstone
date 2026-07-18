import "./reserved-room-card.css";

const formatTime = (time) => {
  if (!time) return "-";

  const [hour, minute] = time.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;

  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

function ReservedRoomCard({ room, onViewSchedule }) {

const booking = room.activeBooking || {};

return(

<div className="reserved-room-card">

  <div className="reserved-room-header">

    <span className="reserved-room-name">

      {room.roomName}

    </span>

    <span className="reserved-room-badge">
      RESERVED
    </span>

  </div>

  <div className="reserved-room-details">

    <i className="fa-solid fa-user"/>

    <div>

      <span className="reserved-room-person">

        {
          booking.facultyName ||
          booking.requesterName ||
          "-"
        }

      </span>

      <small className="reserved-room-sub">

        {
          booking.subject ||
          booking.course ||
          booking.purpose ||
          "-"
        }

      </small>

    </div>

  </div>

  <div className="reserved-room-time">
    <i className="fa-regular fa-clock"></i>
    Starts at {formatTime(booking.startTime)}
  </div>

  <button
    className="reserved-room-btn"
    onClick={onViewSchedule}
  >
    View Schedule
  </button>

</div>

);

}

export default ReservedRoomCard;