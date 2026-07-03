import "./available-room-card.css";

function AvailableRoomCard({ room }) {

return (

<div className="available-room-card">

<div className="available-room-header">

<span className="available-room-name">

{room.roomName}

</span>

<span className="available-room-badge">

AVAILABLE

</span>

</div>

<div className="available-room-details">

<i className="fa-solid fa-users"/>

<span>

Capacity {room.capacity}

</span>

</div>

<div>

{room.roomType}

</div>

<button>

Quick Reserve

</button>

</div>

);

}

export default AvailableRoomCard;