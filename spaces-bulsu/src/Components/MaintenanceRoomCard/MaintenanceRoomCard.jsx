import "./maintenance-room-card.css";

function MaintenanceRoomCard({ room }){

return(

<div className="maintenance-room-card">

  <div className="maintenance-room-header">

    <span className="maintenance-room-name">
      {room.roomName}
    </span>

    <span className="maintenance-room-badge">
      <i className="fa-solid fa-screwdriver-wrench"></i>
      MAINTENANCE
    </span>

  </div>

  <p className="maintenance-room-type">
    {room.roomType}
  </p>

  {room.capacity && (
    <div className="maintenance-room-details">
      <i className="fa-solid fa-users"></i>
      <span>Capacity {room.capacity}</span>
    </div>
  )}

  {(room.maintenanceStartDate || room.maintenanceEndDate) && (
    <div className="maintenance-room-window">
      <i className="fa-regular fa-calendar"></i>
      <span>
        {room.maintenanceStartDate || "—"}
        {" "}to{" "}
        {room.maintenanceEndDate || "—"}
      </span>
    </div>
  )}

  <div className="maintenance-room-notice">
    Room is currently unavailable for reservation.
  </div>

</div>

);

}

export default MaintenanceRoomCard;