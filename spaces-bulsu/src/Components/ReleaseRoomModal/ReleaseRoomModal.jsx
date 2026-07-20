import { useState } from "react";
import "./release-room-modal.css";

const REASONS = ["Class Cancelled", "Moved Online", "Rescheduled"];

const formatRemaining = (mins) => {
  if (mins <= 0) return "0 Minutes";

  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (h > 0) return `${h} hr ${m} min`;

  return `${m} Minutes`;
};

export default function ReleaseRoomModal({
  target,
  onClose,
  onConfirm,
  submitting,
}) {

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  if (!target) return null;

  const statusLabel =
    target.status === "ONGOING"
      ? "IN PROGRESS"
      : target.status === "UPCOMING"
      ? "UPCOMING"
      : "COMPLETED";

  const statusClass =
    target.status === "ONGOING"
      ? "in-progress"
      : target.status === "UPCOMING"
      ? "upcoming"
      : "completed";

  const handleRelease = () => {

    if (!reason) return;

    onConfirm({ reason, details });

  };

  return (
    <div className="rrm-overlay" onClick={onClose}>
      <div className="rrm-panel" onClick={(e) => e.stopPropagation()}>

        <div className="rrm-header">
          <h2>Release Room</h2>
          <button className="rrm-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="rrm-card">

          <span className={`rrm-status-badge ${statusClass}`}>
            {statusLabel}
          </span>

          <div className="rrm-image-wrap">
            <img
              src={
                target.image ||
                "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop"
              }
              alt={target.roomName}
            />
            <div className="rrm-image-overlay">
              <h3>{target.roomName || "-"}</h3>
              <p>
                {target.subject || "-"}
                {target.section ? ` • ${target.section}` : ""}
              </p>
            </div>
          </div>

          <div className="rrm-detail-row">
            <i className="fa-solid fa-door-open"></i>
            <div>
              <span className="rrm-detail-label">ROOM</span>
              <strong className="rrm-detail-value">
                {target.roomName || "-"}
              </strong>
            </div>
          </div>

          <div className="rrm-detail-row">
            <i className="fa-solid fa-bookmark"></i>
            <div>
              <span className="rrm-detail-label">SUBJECT / SECTION</span>
              <strong className="rrm-detail-value">
                {target.subject || "-"}
                {target.section ? ` • ${target.section}` : ""}
              </strong>
            </div>
          </div>

          <div className="rrm-detail-row">
            <i className="fa-regular fa-clock"></i>
            <div>
              <span className="rrm-detail-label">SCHEDULED</span>
              <strong className="rrm-detail-value">
                {target.startTimeLabel} — {target.endTimeLabel}
              </strong>
            </div>
          </div>

          {target.status === "ONGOING" && (
            <div className="rrm-detail-row">
              <i className="fa-solid fa-hourglass-half"></i>
              <div>
                <span className="rrm-detail-label">REMAINING TIME</span>
                <strong className="rrm-detail-value accent">
                  {formatRemaining(target.remainingMinutes)}
                </strong>
              </div>
            </div>
          )}

        </div>

        <div className="rrm-reason-section">
          <h4>Reason for Release</h4>

          <div className="rrm-reason-pills">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`rrm-pill ${reason === r ? "selected" : ""}`}
                onClick={() => setReason(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            className="rrm-textarea"
            placeholder="Provide additional details (optional)..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <button
          className="rrm-release-btn"
          onClick={handleRelease}
          disabled={!reason || submitting}
        >
          {submitting ? "Releasing..." : "Release Room Now"}
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
        </button>

      </div>
    </div>
  );
}