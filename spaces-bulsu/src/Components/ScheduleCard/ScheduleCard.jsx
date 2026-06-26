import "./schedule-card.css";

const COLORS = [
  "#F57C00",
  "#1976D2",
  "#43A047",
  "#8E24AA",
  "#D81B60",
  "#00897B",
  "#6D4C41",
  "#3949AB",
  "#EF6C00",
  "#C2185B",
  "#5E35B1",
  "#2E7D32",
];
const formatTime = (time) => {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
};

function getFacultyColor(name = "") {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return COLORS[Math.abs(hash) % COLORS.length];
}

function ScheduleCard({
  schedule,
  top,
  height,
  onClick,
}) {
  return (
    <div
      className="schedule-card"
      onClick={onClick}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: getFacultyColor(schedule.faculty),
      }}
    >
      <span className="subject-code">
        {schedule.subject}
      </span>

      <span className="subject-name">
        {schedule.section}
      </span>

      <span className="subject-time">
        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
      </span>

      <span className="subject-faculty">
        {schedule.faculty}
      </span>
    </div>
  );
}

export default ScheduleCard;