import { useState } from "react";
import "./issue-report-card.css";

const STATUS_META = {
  Pending:       { label: "Pending",      cls: "pending",      icon: "fa-clock" },
  Acknowledged:  { label: "Acknowledged", cls: "acknowledged", icon: "fa-eye" },
  "In Progress": { label: "In Progress",  cls: "progress",     icon: "fa-tools" },
  Resolved:      { label: "Resolved",     cls: "resolved",     icon: "fa-circle-check" },
};

const CATEGORY_ICON = {
  "Electrical":         "fa-bolt",
  "Plumbing / Leak":    "fa-droplet",
  "Network / Internet": "fa-wifi",
  "Equipment":          "fa-video",
  "Air Conditioning":   "fa-snowflake",
  "Furniture":          "fa-chair",
  "Cleanliness":        "fa-broom",
  "Security":           "fa-shield-halved",
  "Other":              "fa-circle-question",
};

const SEVERITY_COLOR = {
  Low: "#16a34a", Medium: "#eab308", High: "#f97316", Urgent: "#dc2626",
};

const formatTime = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};

export default function IssueReportCard({
  issue,
  role = "faculty",
  onMarkMaintenance,
  onRestore,
  onMarkResolved,
  roomIsUnderMaintenance = false,
  busy = false,
}) {
  const [previewPhoto, setPreviewPhoto] = useState(false);
  const status = STATUS_META[issue.status] || STATUS_META.Pending;
  const isClerk = role === "clerk";
  const isAdmin = role === "admin";
  const isFaculty = role === "faculty";
  const isResolved = issue.status === "Resolved";

  const canMarkMaintenance = isClerk && !isResolved && !roomIsUnderMaintenance;
  const canRestore = isClerk && !isResolved && roomIsUnderMaintenance;
  const canResolve = isClerk && !isResolved;

  return (
    <>
      <div className={`irc ${status.cls}`}>
        {/* ── TOP ROW ─────────────────────────────────────── */}
        <div className="irc-top">
          <div className="irc-icon-wrap">
            <i className={`fa-solid ${CATEGORY_ICON[issue.category] || "fa-circle-question"}`} />
          </div>

          <div className="irc-headline">
            <div className="irc-title-row">
              <h4 className="irc-room">{issue.roomName}</h4>
              {issue.floor && <span className="irc-floor">{issue.floor}</span>}
            </div>
            <div className="irc-category">{issue.category}</div>
          </div>

          <div className="irc-badges">
            <span
              className="irc-sev"
              style={{ "--sev": SEVERITY_COLOR[issue.severity] || "#9ca3af" }}
            >
              {issue.severity || "Low"}
            </span>
            <span className={`irc-status ${status.cls}`}>
              <i className={`fa-solid ${status.icon}`} /> {status.label}
            </span>
          </div>
        </div>

        {/* ── MEDIA (always present, fixed ratio) ─────────── */}
        <div className="irc-media">
          {issue.photoUrl ? (
            <button
              type="button"
              className="irc-photo-thumb"
              onClick={() => setPreviewPhoto(true)}
            >
              <img src={issue.photoUrl} alt="Issue" />
              <span className="irc-photo-label">
                <i className="fa-solid fa-expand" /> View photo
              </span>
            </button>
          ) : (
            <div className="irc-photo-placeholder">
              <i className="fa-regular fa-image" />
              <span>No photo attached</span>
            </div>
          )}

          {roomIsUnderMaintenance && !isResolved && (
            <span className="irc-maint-ribbon">
              <i className="fa-solid fa-wrench" /> Under Maintenance
            </span>
          )}
        </div>

        {/* ── DESCRIPTION ─────────────────────────────────── */}
        <p className="irc-description">{issue.description}</p>

        {/* ── META ────────────────────────────────────────── */}
        <div className="irc-meta">
          <span><i className="fa-regular fa-user" /> {issue.reporterName || "Anonymous"}</span>
          <span><i className="fa-regular fa-clock" /> {formatTime(issue.createdAt)}</span>
          {issue.resolvedBy && (
            <span className="irc-meta-ok">
              <i className="fa-solid fa-check" /> Resolved by {issue.resolvedBy}
            </span>
          )}
        </div>

        {/* ── NOTES ───────────────────────────────────────── */}
        {issue.clerkNotes && (
          <div className="irc-notes">
            <i className="fa-solid fa-note-sticky" />
            <span>{issue.clerkNotes}</span>
          </div>
        )}

        {/* ── ACTIONS ─────────────────────────────────────── */}
        <div className="irc-actions">
          {/* FACULTY — view only */}
          {isFaculty && (
            <span className="irc-hint">
              {isResolved
                ? "Issue resolved — thank you for reporting."
                : "Your report is being reviewed by the Clerk."}
            </span>
          )}

          {/* ADMIN — view only (monitoring) */}
          {isAdmin && (
            <span className="irc-hint">
              {isResolved
                ? "This issue has been resolved."
                : "Awaiting action from the Clerk."}
            </span>
          )}

          {/* CLERK — Mark Under Maintenance + Mark as Resolved + Restore */}
          {isClerk && (
            <>
              {canMarkMaintenance && (
                <button
                  className="irc-btn danger"
                  onClick={() => onMarkMaintenance?.(issue)}
                  disabled={busy}
                >
                  <i className="fa-solid fa-wrench" /> Mark Under Maintenance
                </button>
              )}

              {canRestore && (
                <button
                  className="irc-btn outline"
                  onClick={() => onRestore?.(issue)}
                  disabled={busy}
                >
                  <i className="fa-solid fa-rotate-left" /> Restore Room
                </button>
              )}

              {canResolve && (
                <button
                  className="irc-btn success"
                  onClick={() => onMarkResolved?.(issue)}
                  disabled={busy}
                >
                  <i className="fa-solid fa-circle-check" /> Mark as Resolved
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────── */}
      {previewPhoto && issue.photoUrl && (
        <div className="irc-lightbox" onClick={() => setPreviewPhoto(false)}>
          <img
            src={issue.photoUrl}
            alt="Issue preview"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="irc-lightbox-close"
            onClick={() => setPreviewPhoto(false)}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </>
  );
}