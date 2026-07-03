import "./upcoming-sched-card.css";

function UpcomingSchedCard({ schedule }) {

return (

<div className="upcoming-sched-card">

<div className="upcoming-sched-border"></div>

<div className="upcoming-sched-info">

<span className="upcoming-sched-time">

{schedule.startTime} - {schedule.endTime}

</span>

<span className="upcoming-sched-name">

{schedule.subject || schedule.purpose}

</span>

<span className="upcoming-sched-details">

{schedule.roomName} • {schedule.requesterName || schedule.facultyName}

</span>

</div>

</div>

);

}

export default UpcomingSchedCard;