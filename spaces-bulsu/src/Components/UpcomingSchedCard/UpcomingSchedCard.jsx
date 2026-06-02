import "./upcoming-sched-card.css";

function UpcomingSchedCard() {
  return (
    <div className="upcoming-sched-card">
      <div className="upcoming-sched-border"></div>
      <div className="upcoming-sched-info">
        <span className="upcoming-sched-time">Time</span>
        <span className="upcoming-sched-name">Course Code</span>
        <span className="upcoming-sched-details">Room Name - Attendees</span>
      </div>
    </div>
  );
}

export default UpcomingSchedCard;