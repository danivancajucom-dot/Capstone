import "./room-activity-conflict-card.css";

// ── Professional status labels (no "Awaiting") ──────────────────
const STATUS_META = {
  pending_admin:              { label: "Needs Review",          cls: "pending_admin" },
  pending_reassign:           { label: "Reassigning",           cls: "pending_reassign" },
  pending_reassign_approval:  { label: "Pending Approval",      cls: "pending_reassign" },
  pending_faculty:            { label: "With Faculty",          cls: "pending_faculty" },
  faculty_declined:           { label: "Declined",              cls: "faculty_declined" },
  approved:                   { label: "Approved",              cls: "approved" },
  cancelled:                  { label: "Cancelled",             cls: "cancelled" },
  denied:                     { label: "Denied",                cls: "denied" },
};

const FACULTY_STATUS = {
  pending:  { label: "Pending",   cls: "fs-pending",  icon: "fa-hourglass-half" },
  accepted: { label: "Accepted",  cls: "fs-accepted", icon: "fa-circle-check" },
  declined: { label: "Declined",  cls: "fs-declined", icon: "fa-circle-xmark" },
};

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${p}`;
};

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
};

export default function RoomActivityConflictCard({ request, compact = false, children }) {
  const meta = STATUS_META[request.status] || STATUS_META.pending_admin;
  const conflicts = request.conflicts || [];
  const history = request.reassignHistory || [];
  const facultyResponses = request.facultyResponses || [];

  const responseFor = (scheduleId) =>
    facultyResponses.find((f) => f.scheduleId === scheduleId) || null;

  return (
    <div className={`rac-card rac-${meta.cls} ${compact ? "rac-compact" : ""}`}>
      {/* Type ribbon */}
      <div className="rac-ribbon">
        <i className="fa-solid fa-calendar-plus"></i>
        Room Activity Request
      </div>

      {/* Header */}
      <div className="rac-top">
        <div className="rac-title-block">
          <div className="rac-title">{request.title || "Untitled Activity"}</div>
          <div className="rac-sub">
            <span><i className="fa-solid fa-door-open"></i> {request.roomName}{request.floor ? ` · ${request.floor}` : ""}</span>
            <span><i className="fa-regular fa-calendar"></i> {fmtDate(request.date)}</span>
            <span><i className="fa-regular fa-clock"></i> {fmt12(request.startTime)} – {fmt12(request.endTime)}</span>
          </div>
        </div>
        <span className={`rac-status ${meta.cls}`}>{meta.label}</span>
      </div>

      {/* Requester */}
      <div className="rac-meta-row">
        <span className="rac-requester">
          <i className="fa-regular fa-user"></i> {request.requestedByName}
          <span className="rac-role-pill">{request.requestedByRole}</span>
        </span>
      </div>

      {request.reason && (
        <div className="rac-reason">
          <i className="fa-solid fa-note-sticky"></i>
          <span>{request.reason}</span>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 ? (
        <div className="rac-conflicts">
          <div className="rac-conflicts-header">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{conflicts.length} conflicting schedule{conflicts.length > 1 ? "s" : ""}</span>
          </div>
          <div className="rac-conflict-list">
            {conflicts.map((c, i) => {
              const resp = responseFor(c.scheduleId);
              const fs = resp ? FACULTY_STATUS[resp.status] : null;
              return (
                <div key={i} className="rac-conflict-item">
                  <div className="rac-conflict-main">
                    <span className="rac-conflict-subject">
                      {c.subject || "Untitled"}{c.section ? ` · ${c.section}` : ""}
                    </span>
                    <span className="rac-conflict-meta">
                      <i className="fa-regular fa-user"></i> {c.faculty || "TBA"}
                      <span className="rac-conflict-dot">•</span>
                      {c.day} {fmt12(c.startTime)} – {fmt12(c.endTime)}
                    </span>
                  </div>
                  {fs && (
                    <span className={`rac-fs ${fs.cls}`}>
                      <i className={`fa-solid ${fs.icon}`}></i> {fs.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rac-no-conflict">
          <i className="fa-solid fa-circle-check"></i> No conflicts — clean schedule
        </div>
      )}

      {/* Reassignment history */}
      {history.length > 0 && (
        <div className="rac-history">
          <div className="rac-history-title">
            <i className="fa-solid fa-clock-rotate-left"></i> Reassignment history
          </div>
          <div className="rac-history-list">
            {history.map((h, i) => (
              <div key={i} className="rac-history-item">
                <span className="rac-history-dot"></span>
                <div>
                  <div className="rac-history-line">
                    {h.action === "activity_moved" ? (
                      <>Activity moved from <strong>{h.fromRoomName}</strong> → <strong>{h.toRoomName}</strong></>
                    ) : (
                      <>Schedules moved from <strong>{h.fromRoomName}</strong> → <strong>{h.toRoomName}</strong></>
                    )}
                  </div>
                  <div className="rac-history-by">by {h.byName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status notes */}
      {request.status === "pending_reassign" && request.reassignNote && (
        <div className="rac-note rac-note-warn">
          <i className="fa-solid fa-arrows-rotate"></i>
          Reassignment requested: {request.reassignNote}
        </div>
      )}
      {request.status === "cancelled" && request.cancelledReason && (
        <div className="rac-note rac-note-muted">
          <i className="fa-solid fa-ban"></i> Cancelled: {request.cancelledReason}
        </div>
      )}
      {request.status === "pending_faculty" && (
        <div className="rac-note rac-note-info">
          <i className="fa-solid fa-hourglass-half"></i> Waiting for faculty responses…
        </div>
      )}
      {request.status === "approved" && (
        <div className="rac-note rac-note-success">
          <i className="fa-solid fa-circle-check"></i> Approved — activity confirmed
        </div>
      )}

      {children && <div className="rac-actions">{children}</div>}
    </div>
  );
}