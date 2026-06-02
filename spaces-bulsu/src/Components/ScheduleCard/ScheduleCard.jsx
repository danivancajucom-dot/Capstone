import "./schedule-card.css";

function ScheduleCard() {
  return (
    <div className="schedule-card">
      <span className="subject-code">Subject Code</span>
      <span className="subject-name">Subject Name</span>
      <span className="subject-time">7:00 AM - 10:00 AM</span>
    </div>
  );
}

export default ScheduleCard;