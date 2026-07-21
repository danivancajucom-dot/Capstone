import "./schedule-details-modal.css";

function ScheduleDetailsModal({ target, onClose }) {
  if (!target) return null;

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

          <div className="sdm-detail-row">
            <i className="fa-solid fa-tag"></i>
            <div>
              <span className="sdm-detail-label">TYPE</span>
              <strong className="sdm-detail-value">
                {target.kind === "schedule"
                  ? "Academic Class"
                  : target.kind === "reservation"
                  ? "Reservation"
                  : "Reassigned"}
              </strong>
            </div>
          </div>

          <div className="sdm-detail-row">
            <i className="fa-solid fa-door-open"></i>
            <div>
              <span className="sdm-detail-label">ROOM</span>
              <strong className="sdm-detail-value">{target.roomName || "-"}</strong>
            </div>
          </div>

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

          <div className="sdm-detail-row">
            <i className="fa-regular fa-calendar"></i>
            <div>
              <span className="sdm-detail-label">DATE</span>
              <strong className="sdm-detail-value">{target.date || "-"}</strong>
            </div>
          </div>

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

          {target.kind === "reassignment" && (
            <div className="sdm-detail-row">
              <i className="fa-solid fa-arrows-rotate"></i>
              <div>
                <span className="sdm-detail-label">ORIGINAL ROOM</span>
                <strong className="sdm-detail-value">{target.originalRoom || "N/A"}</strong>
              </div>
            </div>
          )}

          {target.kind === "schedule" && (
            <div className="sdm-detail-row">
              <i className="fa-solid fa-circle-info"></i>
              <div>
                <span className="sdm-detail-label">STATUS</span>
                <strong className="sdm-detail-value completed">Completed</strong>
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

// Helper (copy from parent)
function fmt12Hour(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default ScheduleDetailsModal;