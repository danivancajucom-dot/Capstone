import "./available-room-card.css";

function AvailableRoomCard({ room, onReserve }) {

return (

<div className="available-room-card">

  <div className="available-room-header">

    <span className="available-room-name">

      {room.roomName}

    </span>

    <span className="available-room-badge">

      <span className="available-room-dot"></span>
      AVAILABLE

    </span>

  </div>

  <p className="available-room-type">
    {room.roomType}
  </p>

  <div className="available-room-details">

    <i className="fa-solid fa-users"/>

    <span>

      Capacity {room.capacity || "-"}

    </span>

  </div>

  {room.floor && (
    <div className="available-room-details">
      <i className="fa-solid fa-building"/>
      <span>{room.floor}</span>
    </div>
  )}

  <button
    className="available-room-btn"
    onClick={onReserve}
  >
    <i className="fa-solid fa-bolt"></i>
    Quick Reserve
  </button>

</div>

);

}

export default AvailableRoomCard;