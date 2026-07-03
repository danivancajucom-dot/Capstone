import "./maintenance-room-card.css";

function MaintenanceRoomCard({ room }){

return(

<div className="maintenance-room-card">

<h3>

{room.roomName}

</h3>

<p>

{room.roomType}

</p>

<span>

Under Maintenance

</span>

</div>

);

}

export default MaintenanceRoomCard;