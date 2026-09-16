import { useState, useEffect } from "react";
import "./issue-report-card.css";

const STATUS_META = {
  Pending:       { label: "Pending",      cls: "pending",      icon: "fa-clock" },
  Acknowledged:  { label: "Acknowledged", cls: "acknowledged", icon: "fa-eye" },
  "In Progress": { label: "In Progress",  cls: "progress",     icon: "fa-tools" },
  Resolved:      { label: "Resolved",     cls: "resolved",     icon: "fa-circle-check" },
};

// ═══════════════════════════════════════════════════════════════
// ROBUST STATUS NORMALIZATION
// Handles: undefined, null, empty, lowercase, extra spaces,
// and different spellings — para hindi mag-fallback ng mali.
// ═══════════════════════════════════════════════════════════════
const normalizeStatus = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "pending";                       // default
  if (v === "pending") return "pending";
  if (v === "acknowledged" || v === "ack") return "acknowledged";
  if (v === "in progress" || v === "in-progress" || v === "inprogress" || v === "progress")
    return "progress";
  if (v === "resolved") return "resolved";
  return "pending";                               // unknown → treat as pending
};

const STATUS_KEY_TO_META = {
  pending:      STATUS_META.Pending,
  acknowledged: STATUS_META.Acknowledged,
  progress:     STATUS_META["In Progress"],
  resolved:     STATUS_META.Resolved,
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
  onMarkMaintenance,
  onRestore,
  onMarkResolved,
  roomIsUnderMaintenance = false,
  busy = false,
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // ── Normalize status (single source of truth) ──────────────
  const statusKey = normalizeStatus(issue.status);
  const status = STATUS_KEY_TO_META[statusKey];

  const isPending      = statusKey === "pending";
  const isAcknowledged = statusKey === "acknowledged";
  const isInProgress   = statusKey === "progress";
  const isResolved     = statusKey === "resolved";

  const isClerk   = role === "clerk";
  const isAdmin   = role === "admin";
  const isFaculty = role === "faculty";

  // ── Role gating ───────────────────────────────────────────────
  const canAcknowledge = isAdmin && isPending;
  const clerkCanAct    = isClerk && (isAcknowledged || isInProgress) && !isResolved;

  const canMarkMaintenance = clerkCanAct && !roomIsUnderMaintenance;
  const canRestore         = clerkCanAct && roomIsUnderMaintenance;
  const canResolve         = clerkCanAct;

  // ── Photos ────────────────────────────────────────────────────
  const photos = Array.isArray(issue.photoUrls) && issue.photoUrls.length > 0
    ? issue.photoUrls
    : (issue.photoUrl ? [issue.photoUrl] : []);

  const visiblePhotos = photos.slice(0, 4);
  const extraCount = Math.max(0, photos.length - 4);
  const photoCount = photos.length;

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextPhoto = () => setLightboxIndex(i => (i + 1) % photos.length);
  const prevPhoto = () => setLightboxIndex(i => (i - 1 + photos.length) % photos.length);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, photos.length]);

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

        {/* ── MEDIA ─────────────────────────────────────────── */}
        <div className="irc-media">
          {photos.length === 0 ? (
            <div className="irc-photo-placeholder">
              <i className="fa-regular fa-image" />
              <span>No photo attached</span>
            </div>
          ) : (
            <div className={`irc-photo-grid count-${Math.min(photoCount, 4)}`}>
              {visiblePhotos.map((url, i) => {
                const isLast = i === visiblePhotos.length - 1;
                const showOverlay = isLast && extraCount > 0;
                return (
                  <button
                    type="button"
                    key={i}
                    className="irc-photo-cell"
                    onClick={() => openLightbox(i)}
                    aria-label={`View photo ${i + 1}`}
                  >
                    <img src={url} alt={`Issue ${i + 1}`} />
                    {showOverlay && (
                      <span className="irc-photo-more-overlay">+{extraCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {photoCount > 1 && (
            <span className="irc-photo-count">
              <i className="fa-regular fa-images" /> {photoCount}
            </span>
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
          {issue.acknowledgedBy && (
            <span className="irc-meta-info">
              <i className="fa-solid fa-eye" /> Ack by {issue.acknowledgedBy}
            </span>
          )}
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
                : isPending
                ? "Waiting for the Admin to acknowledge your report."
                : isAcknowledged
                ? "Your report has been acknowledged and forwarded to the Clerk."
                : "The Clerk is currently handling your report."}
            </span>
          )}

          {/* ADMIN — status-aware actions/hints */}
          {isAdmin && (
            <>
              {canAcknowledge && (
                <button
                  className="irc-btn primary"
                  onClick={() => onAcknowledge?.(issue)}
                  disabled={busy}
                >
                  <i className="fa-solid fa-eye" /> Acknowledge Issue
                </button>
              )}

              {!canAcknowledge && isResolved && (
                <span className="irc-hint">
                  <i className="fa-solid fa-circle-check" style={{ color: "#16a34a" }} />
                  This issue has been resolved.
                </span>
              )}

              {!canAcknowledge && isInProgress && (
                <span className="irc-hint">
                  <i className="fa-solid fa-tools" style={{ color: "#f97316" }} />
                  The Clerk is currently addressing this issue.
                </span>
              )}

              {!canAcknowledge && isAcknowledged && (
                <span className="irc-hint">
                  <i className="fa-solid fa-check-double" style={{ color: "#2563eb" }} />
                  Acknowledged — forwarded to the Clerk for action.
                </span>
              )}
            </>
          )}

          {/* CLERK — actions only after Admin acknowledges */}
          {isClerk && (
            <>
              {isPending && (
                <span className="irc-hint">
                  <i className="fa-solid fa-hourglass-half" style={{ color: "#eab308" }} />
                  Waiting for the Admin to acknowledge this issue first.
                </span>
              )}

              {isResolved && (
                <span className="irc-hint">
                  <i className="fa-solid fa-circle-check" style={{ color: "#16a34a" }} />
                  This issue has been resolved.
                </span>
              )}

              {clerkCanAct && (
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
            </>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX ─────────────────────────────────────── */}
      {lightboxIndex !== null && photos.length > 0 && (
        <div className="irc-lightbox" onClick={closeLightbox}>
          <button
            className="irc-lightbox-close"
            onClick={closeLightbox}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                className="irc-lightbox-nav prev"
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                aria-label="Previous photo"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button
                className="irc-lightbox-nav next"
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                aria-label="Next photo"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </>
          )}

          <img
            src={photos[lightboxIndex]}
            alt={`Issue photo ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
          />

          {photos.length > 1 && (
            <div className="irc-lightbox-counter">
              {lightboxIndex + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}