import "./conflict-card.css";
import { useNavigate } from "react-router-dom";

const STATUS_META = {
  active: { label: "Active", className: "status-active" },
  unresolved: { label: "Unresolved", className: "status-unresolved" },
  resolved: { label: "Resolved", className: "status-resolved" },
};

const toMinutes = (time) => {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const formatDuration = (startTime, endTime) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start == null || end == null || end <= start) return "";

  const mins = end - start;
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

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

  const status = STATUS_META[conflict.status] || STATUS_META.active;
  const overlapDuration = formatDuration(conflict.conflictStartTime, conflict.conflictEndTime);
  const dateLabel = formatDate(conflict.date);

  return (
    <div className={`conflict-card ${status.className}`}>
      <div className="conflict-card-top">
        <div className="conflict-card-header">
          <div className="conflict-card-icon">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>

          <div className="conflict-card-info">
            <span className="conflict-card-title">
              {conflict.roomName} — Schedule Conflict
            </span>

            <span className="conflict-card-subtitle">
              {conflict.floor ? `Floor ${conflict.floor}` : ""}
              {conflict.floor && dateLabel ? " • " : ""}
              {dateLabel}
            </span>
          </div>
        </div>

        <span className={`conflict-status-badge ${status.className}`}>{status.label}</span>
      </div>

      <div className="conflict-detail-grid">
        <div className="conflict-detail-block">
          <div className="conflict-detail-label">
            <i className="fa-solid fa-chalkboard-user"></i>
            Original Class
          </div>

          <div className="conflict-detail-main">{conflict.courseTitle || "Untitled Course"}</div>
          {conflict.section && <div className="conflict-detail-sub">{conflict.section}</div>}

          {conflict.faculty && (
            <div className="conflict-detail-meta">
              <i className="fa-regular fa-user"></i>
              {conflict.faculty}
            </div>
          )}

          <div className="conflict-detail-meta">
            <i className="fa-regular fa-clock"></i>
            {conflict.day} • {formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}
          </div>
        </div>

        <div className="conflict-detail-divider" aria-hidden="true">
          <i className="fa-solid fa-arrows-left-right"></i>
        </div>

        <div className="conflict-detail-block is-activity">
          <div className="conflict-detail-label">
            <i className="fa-solid fa-calendar-plus"></i>
            Conflicting Activity
          </div>

          <div className="conflict-detail-main">{conflict.activityTitle || "Untitled Activity"}</div>
          {conflict.activityReason && (
            <div className="conflict-detail-sub">{conflict.activityReason}</div>
          )}

          <div className="conflict-detail-meta">
            <i className="fa-regular fa-clock"></i>
            {formatTime(conflict.conflictStartTime)} - {formatTime(conflict.conflictEndTime)}
          </div>
        </div>
      </div>

      {overlapDuration && (
        <div className="conflict-overlap-chip">
          <i className="fa-solid fa-circle-exclamation"></i>
          Overlaps for {overlapDuration}
        </div>
      )}

      {conflict.status === "active" ? (
        conflict.reassignPending ? (
          <div className="reassign-pending-badge">
            <i className="fa-solid fa-hourglass-half"></i>
            Reassignment Pending
          </div>
        ) : showReassign ? (
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
            <i className="fa-solid fa-right-left"></i>
            Reassign Room
          </button>
        ) : null
      ) : (
        <div className={`conflict-footer-note ${status.className}`}>
          <i className={`fa-solid ${conflict.status === "resolved" ? "fa-circle-check" : "fa-clock-rotate-left"}`}></i>
          {conflict.status === "resolved" ? "This conflict has been resolved." : "This conflict was left unresolved."}
        </div>
      )}
    </div>
  );
}

export default ConflictCard;