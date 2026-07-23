import "./schedule-details-modal.css";

// ─── Helper (copy from parent) ──────────────────────────────────────
function fmt12Hour(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getStatusLabel(status) {
  const map = {
    "COMPLETED": { label: "Completed", className: "completed" },
    "ONGOING":   { label: "Ongoing",   className: "ongoing" },
    "UPCOMING":  { label: "Upcoming",  className: "upcoming" },
    "SCHEDULED": { label: "Scheduled", className: "scheduled" },
  };
  return map[status] || { label: "Scheduled", className: "scheduled" };
}

function ScheduleDetailsModal({ target, onClose }) {
  if (!target) return null;

  const statusInfo = target.status ? getStatusLabel(target.status) : { label: "Scheduled", className: "scheduled" };

  return (
    <div className="sdm-overlay" onClick={onClose}>
      <div className="sdm-panel" onClick={(e) => e.stopPropagation()}>

        <div className="sdm-header">
          <h2>Schedule Details</h2>
          <button className="sdm-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="sdm-card">
          <div className="sdm-image-wrap">
            <img
              src={
                target.image ||
                "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop"
              }
              alt={target.roomName}
            />
            <div className="sdm-image-overlay">
              <h3>{target.roomName || "-"}</h3>
              <p>
                {target.title || target.subject || "-"}
                {target.section ? ` • ${target.section}` : ""}
              </p>
            </div>
          </div>

          {/* ─── Type ────────────────────────────────────────────── */}
          <div className="sdm-detail-row">
            <i className="fa-solid fa-tag"></i>
            <div>
              <span className="sdm-detail-label">TYPE</span>
              <strong className="sdm-detail-value">
                {target.kind === "schedule"
                  ? "Academic Class"
                  : target.kind === "reservation"
                  ? "Reservation"
                  : target.kind === "event"
                  ? "Room Activity"
                  : "Reassigned"}
              </strong>
            </div>
          </div>

          {/* ─── Faculty ──────────────────────────────────────────── */}
          <div className="sdm-detail-row">
            <i className="fa-solid fa-user"></i>
            <div>
              <span className="sdm-detail-label">FACULTY</span>
              <strong className="sdm-detail-value">
                {target.faculty || "-"}
              </strong>
            </div>
          </div>

          {/* ─── Room ─────────────────────────────────────────────── */}
          <div className="sdm-detail-row">
            <i className="fa-solid fa-door-open"></i>
            <div>
              <span className="sdm-detail-label">ROOM</span>
              <strong className="sdm-detail-value">{target.roomName || "-"}</strong>
            </div>
          </div>

          {/* ─── Subject / Section ────────────────────────────────── */}
          <div className="sdm-detail-row">
            <i className="fa-solid fa-bookmark"></i>
            <div>
              <span className="sdm-detail-label">SUBJECT / SECTION</span>
              <strong className="sdm-detail-value">
                {target.subject || target.title || "-"}
                {target.section ? ` • ${target.section}` : ""}
              </strong>
            </div>
          </div>

          {/* ─── Date ──────────────────────────────────────────────── */}
          <div className="sdm-detail-row">
            <i className="fa-regular fa-calendar"></i>
            <div>
              <span className="sdm-detail-label">DATE</span>
              <strong className="sdm-detail-value">{target.date || "-"}</strong>
            </div>
          </div>

          {/* ─── Time ──────────────────────────────────────────────── */}
          <div className="sdm-detail-row">
            <i className="fa-regular fa-clock"></i>
            <div>
              <span className="sdm-detail-label">SCHEDULED</span>
              <strong className="sdm-detail-value">
                {target.rawStartTime
                  ? `${fmt12Hour(target.rawStartTime)} — ${fmt12Hour(target.rawEndTime)}`
                  : "-"}
              </strong>
            </div>
          </div>

          {/* ─── Status ─────────────────────────────────────────────── */}
          <div className="sdm-detail-row">
            <i className="fa-solid fa-circle-info"></i>
            <div>
              <span className="sdm-detail-label">STATUS</span>
              <strong className={`sdm-detail-value sdm-status-${statusInfo.className}`}>
                {statusInfo.label}
              </strong>
            </div>
          </div>

          {/* ─── Original Room (only for reassignments) ────────────── */}
          {target.kind === "reassignment" && target.originalRoom && (
            <div className="sdm-detail-row">
              <i className="fa-solid fa-arrows-rotate"></i>
              <div>
                <span className="sdm-detail-label">ORIGINAL ROOM</span>
                <strong className="sdm-detail-value">{target.originalRoom}</strong>
              </div>
            </div>
          )}
        </div>

        <button className="sdm-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default ScheduleDetailsModal;