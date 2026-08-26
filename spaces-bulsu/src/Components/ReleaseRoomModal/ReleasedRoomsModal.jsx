import { useEffect, useState } from "react";
import "./released-rooms-modal.css";

const formatTime12 = (time) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatReleasedAt = (ts) => {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * ReleasedRoomsModal
 *
 * Overlay modal that shows ALL room-release records. Clicking a record
 * switches the same modal into a "detail" view. Can also be opened
 * directly into the detail view via `initialSelected`.
 *
 * Props:
 *  - show: boolean
 *  - onClose: () => void
 *  - releases: array of release records (already merged with roomName/roomImage)
 *  - initialSelected: optional release record to open straight into detail view
 */
export default function ReleasedRoomsModal({ show, onClose, releases = [], initialSelected = null }) {
  const [selected, setSelected] = useState(initialSelected);

  useEffect(() => {
    if (show) setSelected(initialSelected || null);
  }, [show, initialSelected]);

  if (!show) return null;

  return (
    <div className="rr-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rr-modal" onClick={(e) => e.stopPropagation()}>
        {selected ? (
          <>
            <div className="rr-modal-header">
              <button className="rr-back-btn" onClick={() => setSelected(null)}>
                <i className="fa-solid fa-arrow-left"></i>
                Back
              </button>
              <button className="rr-close-btn" onClick={onClose} aria-label="Close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="rr-detail">
              <div className="rr-detail-icon">
                <i className="fa-solid fa-door-open"></i>
              </div>
              <h3 className="rr-detail-room">{selected.roomName || "Unknown Room"}</h3>
              <p className="rr-detail-subject">{selected.subject || "N/A"}</p>

              <div className="rr-detail-rows">
                <div className="rr-detail-row">
                  <span className="rr-detail-label">Section</span>
                  <span className="rr-detail-value">{selected.section || "—"}</span>
                </div>
                <div className="rr-detail-row">
                  <span className="rr-detail-label">Faculty</span>
                  <span className="rr-detail-value">{selected.faculty || "Unknown"}</span>
                </div>
                <div className="rr-detail-row">
                  <span className="rr-detail-label">Date</span>
                  <span className="rr-detail-value">{formatDateLong(selected.date)}</span>
                </div>
                <div className="rr-detail-row">
                  <span className="rr-detail-label">Time</span>
                  <span className="rr-detail-value">
                    {formatTime12(selected.startTime)} – {formatTime12(selected.endTime)}
                  </span>
                </div>
                <div className="rr-detail-row">
                  <span className="rr-detail-label">Reason</span>
                  <span className="rr-detail-value">{selected.reason || "—"}</span>
                </div>
                {selected.details && (
                  <div className="rr-detail-row">
                    <span className="rr-detail-label">Notes</span>
                    <span className="rr-detail-value">{selected.details}</span>
                  </div>
                )}
                <div className="rr-detail-row">
                  <span className="rr-detail-label">Released At</span>
                  <span className="rr-detail-value">{formatReleasedAt(selected.releasedAt)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rr-modal-header">
              <h3 className="rr-modal-title">All Released Rooms</h3>
              <button className="rr-close-btn" onClick={onClose} aria-label="Close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="rr-modal-list">
              {releases.length === 0 ? (
                <div className="rr-empty">
                  <i className="fa-regular fa-circle-check"></i>
                  <p>No released rooms yet.</p>
                </div>
              ) : (
                releases.map((r) => (
                  <button key={r.id} className="rr-list-item" onClick={() => setSelected(r)}>
                    <div className="rr-list-item-main">
                      <span className="rr-list-room">{r.roomName || "Unknown Room"}</span>
                      <span className="rr-list-subject">{r.subject || "N/A"}</span>
                    </div>
                    <div className="rr-list-item-meta">
                      <span>{formatDateLong(r.date)}</span>
                      <span>
                        {formatTime12(r.startTime)} – {formatTime12(r.endTime)}
                      </span>
                      <span>{r.faculty || "Unknown"}</span>
                    </div>
                    <i className="fa-solid fa-chevron-right rr-list-arrow"></i>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}