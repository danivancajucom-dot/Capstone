import "./reserved-room-card.css";

function ReservedRoomCard({ room }) {

const booking=room.activeBooking;

return(

<div className="occupied-room-card">

<div className="occupied-room-header">

<span>

{room.roomName}

</span>

<span>

OCCUPIED

</span>

</div>

<div className="occupied-room-details">

<i className="fa-solid fa-user"/>

<div>

<span>

{

booking.requesterName ||

booking.facultyName ||

booking.subject

}

</span>

<small>

{

booking.course ||

booking.purpose

}

</small>

</div>

</div>

<button>

View Schedule

</button>

</div>

);

}

export default ReservedRoomCard;