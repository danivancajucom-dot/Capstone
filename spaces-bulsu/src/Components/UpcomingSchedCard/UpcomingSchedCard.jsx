import "./upcoming-sched-card.css";

const formatTime = (time) => {
  if (!time) return "-";

  const [hour, minute] = time.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;

  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

function UpcomingSchedCard({ schedule }) {

return (

<div className="upcoming-sched-card">

<div className="upcoming-sched-border"></div>

<div className="upcoming-sched-info">

<span className="upcoming-sched-time">

  <i className="fa-regular fa-clock"></i>
  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}

</span>

<span className="upcoming-sched-name">

{schedule.subject || schedule.purpose || "Untitled"}

</span>

<span className="upcoming-sched-details">

{schedule.roomName || "-"} • {schedule.facultyName || schedule.requesterName || "-"}

</span>

</div>

</div>

);

}

export default UpcomingSchedCard;