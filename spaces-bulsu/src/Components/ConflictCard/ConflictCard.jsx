import "./conflict-card.css";
import { useNavigate } from "react-router-dom";

function ConflictCard({
  conflict,
  showReassign = true,
}) {
  const navigate = useNavigate();

  const formatTime = (time) => {
  if (!time) return "";

  const [hour, minute] = time.split(":");

  return new Date(0,0,0,hour,minute).toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
};
  return (
    <div className="conflict-card">
      <div className="conflict-card-header">
        <div className="conflict-card-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>

        <div className="conflict-card-info">
          <span className="conflict-card-title">
            {conflict.roomName} - Schedule Conflict
          </span>

          <span className="conflict-card-floor">
            {conflict.courseTitle}
          </span>

          <span className="conflict-card-floor">
            {conflict.section}
          </span>

          <span className="conflict-card-floor">
            Original Schedule
          </span>

          <span className="conflict-card-floor">
            {conflict.day} • {formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}
          </span>

          <span className="conflict-card-floor">
            Conflicts with: {conflict.activityTitle}
          </span>

          <span className="conflict-card-floor">
            {formatTime(conflict.conflictStartTime)} - {formatTime(conflict.conflictEndTime)}
          </span>
        </div>
      </div>

      {conflict.status === "active" && (
        <button
          className="reassign-btn"
          onClick={() =>
            navigate("/department-head/reassign-room", {
              state: {
                conflict,
                from: "/department-head/conflicts",
              },
            })
          }
        >
          Reassign Room
        </button>
      )}
    </div>
  );
}

export default ConflictCard;