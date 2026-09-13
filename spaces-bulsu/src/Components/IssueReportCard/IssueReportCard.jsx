import { useState } from "react";
import "./issue-report-card.css";

const STATUS_META = {
  Pending:      { label: "Pending",      cls: "pending",      icon: "fa-clock" },
  Acknowledged: { label: "Acknowledged", cls: "acknowledged", icon: "fa-eye" },
  "In Progress":{ label: "In Progress",  cls: "progress",     icon: "fa-tools" },
  Resolved:     { label: "Resolved",     cls: "resolved",     icon: "fa-circle-check" },
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
  onAcknowledge,
  onSetStatus,
  onMarkMaintenance,
  onRestore,
  roomIsUnderMaintenance = false,
  busy = false,
}) {
  const [previewPhoto, setPreviewPhoto] = useState(false);
  const status = STATUS_META[issue.status] || STATUS_META.Pending;
  const canManage = role === "clerk";

  return (
    <>
      <div className={`irc ${status.cls}`}>
        <div className="irc-top">
          <div className="irc-icon-wrap">
            <i className={`fa-solid ${CATEGORY_ICON[issue.category] || "fa-circle-question"}`} />
          </div>

          <div className="irc-headline">
            <div className="irc-title-row">
              <h4 className="irc-room">{issue.roomName}</h4>
              <span className="irc-floor">{issue.floor}</span>
            </div>
            <div className="irc-category">{issue.category}</div>
          </div>

          <div className="irc-badges">
            <span
              className="irc-sev"
              style={{ "--sev": SEVERITY_COLOR[issue.severity] || "#9ca3af" }}
            >
              {issue.severity}
            </span>
            <span className={`irc-status ${status.cls}`}>
              <i className={`fa-solid ${status.icon}`} /> {status.label}
            </span>
          </div>
        </div>

        <p className="irc-description">{issue.description}</p>

        {issue.photoUrl && (
          <button
            type="button"
            className="irc-photo-thumb"
            onClick={() => setPreviewPhoto(true)}
          >
            <img src={issue.photoUrl} alt="Issue" />
            <span className="irc-photo-label"><i className="fa-solid fa-expand" /> View photo</span>
          </button>
        )}

        <div className="irc-meta">
          <span><i className="fa-regular fa-user" /> {issue.reporterName}</span>
          <span><i className="fa-regular fa-clock" /> {formatTime(issue.createdAt)}</span>
          {issue.acknowledgedBy && (
            <span><i className="fa-solid fa-eye" /> Ack by {issue.acknowledgedBy}</span>
          )}
          {issue.resolvedBy && (
            <span className="irc-meta-ok"><i className="fa-solid fa-check" /> Resolved by {issue.resolvedBy}</span>
          )}
        </div>

        {issue.clerkNotes && (
          <div className="irc-notes">
            <i className="fa-solid fa-note-sticky" />
            <span>{issue.clerkNotes}</span>
          </div>
        )}

        {/* Actions */}
        <div className="irc-actions">
          {/* Faculty — view only */}
          {role === "faculty" && (
            <span className="irc-hint">
              {issue.status === "Resolved"
                ? "Issue resolved — thank you for reporting."
                : "Your report is being reviewed by the Clerk."}
            </span>
          )}

          {/* Admin — acknowledge only */}
          {role === "admin" && issue.status === "Pending" && (
            <button
              className="irc-btn primary"
              onClick={() => onAcknowledge?.(issue)}
              disabled={busy}
            >
              <i className="fa-solid fa-check" /> Acknowledge
            </button>
          )}

          {/* Clerk — full management */}
          {canManage && (
            <>
              {issue.status === "Pending" && (
                <button
                  className="irc-btn primary"
                  onClick={() => onAcknowledge?.(issue)}
                  disabled={busy}
                >
                  <i className="fa-solid fa-eye" /> Acknowledge
                </button>
              )}

              {issue.status !== "Resolved" && issue.status !== "In Progress" && (
                <button
                  className="irc-btn outline"
                  onClick={() => onSetStatus?.(issue, "In Progress")}
                  disabled={busy}
                >
                  <i className="fa-solid fa-tools" /> Mark In Progress
                </button>
              )}

              {issue.status !== "Resolved" && (
                <button
                  className="irc-btn success"
                  onClick={() => onSetStatus?.(issue, "Resolved")}
                  disabled={busy}
                >
                  <i className="fa-solid fa-circle-check" /> Resolve
                </button>
              )}

              {issue.status !== "Resolved" && !roomIsUnderMaintenance && (
                <button
                  className="irc-btn danger"
                  onClick={() => onMarkMaintenance?.(issue)}
                  disabled={busy}
                >
                  <i className="fa-solid fa-triangle-exclamation" /> Mark Under Maintenance
                </button>
              )}

              {roomIsUnderMaintenance && issue.status !== "Resolved" && (
                <button
                  className="irc-btn outline"
                  onClick={() => onRestore?.(issue)}
                  disabled={busy}
                >
                  <i className="fa-solid fa-rotate-left" /> Restore Room
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Photo preview */}
      {previewPhoto && issue.photoUrl && (
        <div className="irc-lightbox" onClick={() => setPreviewPhoto(false)}>
          <img src={issue.photoUrl} alt="Issue preview" onClick={e => e.stopPropagation()} />
          <button className="irc-lightbox-close" onClick={() => setPreviewPhoto(false)}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </>
  );
}