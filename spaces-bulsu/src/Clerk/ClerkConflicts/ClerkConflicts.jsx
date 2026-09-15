// ═══════════════════════════════════════════════════════════════════
// FILE: src/Clerk/ClerkConflicts/ClerkConflicts.jsx
// ═══════════════════════════════════════════════════════════════════
import "./clerk-conflicts.css";
import ConflictCard from "../../Components/ConflictCard/ConflictCard";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, onSnapshot } from "firebase/firestore"; // ⬅️ onSnapshot idinagdag
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import universityLogo from "../../assets/BSU-Logo.png";
import collegeLogo from "../../assets/CICT-Logo.png";

const SCHOOL_HEADER = {
  universityLogoUrl: universityLogo,
  collegeLogoUrl: collegeLogo,
  universityName: "Bulacan State University",
  collegeName: "College of Information and Communications Technology",
  systemName: "SpaceS CICT",
};

const semesterRank = (sem = "") => {
  const s = sem.toLowerCase();
  if (s.includes("2nd")) return 2;
  if (s.includes("1st")) return 1;
  return 0;
};
const schoolYearStart = (sy = "") => {
  const m = sy.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 0;
};
const fmt12 = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${p}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
};

const PENDING_STATUSES = ["pending_admin", "pending_faculty", "needs_reassign", "pending"];

function ClerkConflicts() {
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [unresolved, setUnresolved] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const [chooser, setChooser] = useState(null);

  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") setTimeout(() => setToast((p) => ({ ...p, show: false })), 4000);
  };

  const cvtMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const overlap = (aS, aE, bS, bE) => cvtMin(aS) < cvtMin(bE) && cvtMin(aE) > cvtMin(bS);
  const getOverlapTime = (sS, sE, eS, eE) => {
    const st = Math.max(cvtMin(sS), cvtMin(eS));
    const en = Math.min(cvtMin(sE), cvtMin(eE));
    const toT = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    return { start: toT(st), end: toT(en) };
  };

  const loadConflicts = async () => {
    try {
      const rooms = await getDocs(collection(db, "rooms"));
      const events = await getDocs(collection(db, "events"));
      const reassignSnap = await getDocs(collection(db, "roomReassignments"));

      const pending = reassignSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => PENDING_STATUSES.includes(String(r.status || "").toLowerCase()));

      const pendingKeys = new Set(
        pending
          .filter((r) => r.status !== "needs_reassign")
          .map((r) => `${r.scheduleId}_${r.eventId}`)
      );

      const activeFound = [], unresolvedFound = [], resolvedFound = [];
      const now = new Date();

      for (const roomDoc of rooms.docs) {
        const room = roomDoc.data();
        const scheduleSnap = await getDocs(collection(db, "rooms", roomDoc.id, "schedules"));
        const allSchedules = scheduleSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => !s.initialized && s.faculty && s.day && s.startTime && s.endTime);

        if (allSchedules.length === 0) continue;

        const latest = allSchedules.reduce((best, cur) => {
          const by = schoolYearStart(best.schoolYear), bs = semesterRank(best.semester);
          const cy = schoolYearStart(cur.schoolYear), cs = semesterRank(cur.semester);
          if (cy > by || (cy === by && cs > bs)) return cur;
          return best;
        }, allSchedules[0]);

        const schedules = allSchedules.filter(
          (s) => (s.schoolYear || "") === (latest.schoolYear || "") &&
                 (s.semester || "") === (latest.semester || "")
        );

        const roomEvents = events.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e) => e.roomId === roomDoc.id && e.status !== "Cancelled");

        roomEvents.forEach((event) => {
          const eventDay = ["SUN","MON","TUE","WED","THU","FRI","SAT"][new Date(event.date).getDay()];
          schedules.forEach((schedule) => {
            if (schedule.day !== eventDay) return;
            if (!overlap(schedule.startTime, schedule.endTime, event.startTime, event.endTime)) return;

            const eventEnd = new Date(`${event.date}T${event.endTime}`);
            const ov = getOverlapTime(schedule.startTime, schedule.endTime, event.startTime, event.endTime);

            const conflict = {
              roomId: roomDoc.id, roomName: room.roomName, floor: room.floor, room,
              event, schedule,
              courseTitle: schedule.courseTitle || schedule.subject || "",
              faculty: schedule.faculty || "", section: schedule.section || "",
              day: schedule.day, date: event.date,
              startTime: schedule.startTime, endTime: schedule.endTime,
              activityTitle: event.title, activityReason: event.reason,
              conflictStartTime: ov.start, conflictEndTime: ov.end,
              reassignPending: pendingKeys.has(`${schedule.id}_${event.id}`),
              status: "",
              resolution: event.resolution || null,
              resolutionReason: event.resolutionReason || null,
            };

            if (event.conflictResolved) {
              conflict.status = "resolved";
              conflict.resolution = event.resolution || "resolved";
              conflict.resolutionReason = event.resolutionReason || "";
              resolvedFound.push(conflict);
            } else if (eventEnd < now) {
              conflict.status = "unresolved";
              unresolvedFound.push(conflict);
            } else {
              conflict.status = "active";
              activeFound.push(conflict);
            }
          });
        });
      }

      setConflicts(activeFound);
      setUnresolved(unresolvedFound);
      setResolved(resolvedFound);
      setPendingList(pending);
    } catch (err) {
      console.error(err);
      showToast("error", "Load Failed", "Could not retrieve conflicts.");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // REALTIME: subscribe sa events + roomReassignments + rooms
  // Kapag may nagbago (faculty response, admin approve/cancel, etc.),
  // automatic na magre-recompute ang conflict list.
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    // Debounced refresh — pinipigilan ang maraming simultaneous fetches
    const scheduleRefresh = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isMounted) loadConflicts();
      }, 250);
    };

    // Initial load
    loadConflicts();

    // Subscribe sa mga collection na nakakaapekto sa conflicts
    const unsubEvents = onSnapshot(
      collection(db, "events"),
      scheduleRefresh,
      (err) => console.error("events listener:", err)
    );
    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      scheduleRefresh,
      (err) => console.error("rooms listener:", err)
    );
    const unsubReassign = onSnapshot(
      collection(db, "roomReassignments"),
      scheduleRefresh,
      (err) => console.error("roomReassignments listener:", err)
    );

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      unsubEvents();
      unsubRooms();
      unsubReassign();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolved = () => {
    // Hindi na kailangan i-refresh — realtime na ang listeners
    showToast("success", "Updated", "Conflict list will refresh automatically.");
  };

  const displayConflicts =
    activeTab === "all" ? conflicts :
    activeTab === "pending" ? pendingList :
    activeTab === "unresolved" ? unresolved : resolved;

  const emptyMessage = {
    all: "No active conflicts.",
    pending: "No pending reassignments.",
    unresolved: "No unresolved conflicts.",
    resolved: "No resolved conflicts.",
  }[activeTab];
  const emptyHint = {
    all: "New booking collisions will show up here.",
    pending: "Reassignments awaiting Admin decision or faculty response will appear here.",
    unresolved: "Nothing has slipped through unaddressed.",
    resolved: "Resolved conflicts are logged here for your records.",
  }[activeTab];

  // ── export helpers ──
  const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const handleExportCSV = () => {
    if (!displayConflicts.length) { showToast("error", "Nothing to Export", "No rows in this view."); return; }
    const headers = ["Room","Floor","Course","Faculty","Section","Day","Date","Class Time","Activity","Overlap Time","Status"];
    const rows = displayConflicts.map((c) => [
      c.roomName, c.floor || "", c.courseTitle || c.subject || "", c.faculty || "",
      c.section || "", c.day || "", c.date || "",
      `${c.startTime || ""}-${c.endTime || ""}`,
      c.activityTitle || c.title || "",
      `${c.conflictStartTime || ""}-${c.conflictEndTime || ""}`,
      c.status || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conflict-report-${activeTab}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("success", "Exported", `${displayConflicts.length} row(s) as CSV.`);
    setExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    if (!displayConflicts.length) { showToast("error", "Nothing to Export", "No rows in this view."); return; }
    showToast("loading", "Generating PDF...", "Please wait.");
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const mX = 40, logo = 50, cx = pageW / 2;

      if (SCHOOL_HEADER.universityLogoUrl) pdf.addImage(SCHOOL_HEADER.universityLogoUrl, "PNG", mX, 22, logo, logo);
      if (SCHOOL_HEADER.collegeLogoUrl) pdf.addImage(SCHOOL_HEADER.collegeLogoUrl, "PNG", pageW - mX - logo, 22, logo, logo);

      pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(20,27,45);
      pdf.text(SCHOOL_HEADER.universityName, cx, 36, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(107,114,128);
      pdf.text(SCHOOL_HEADER.collegeName, cx, 50, { align: "center" });
      pdf.text(SCHOOL_HEADER.systemName, cx, 62, { align: "center" });

      pdf.setDrawColor(245,124,0); pdf.setLineWidth(1.5);
      pdf.line(mX, 82, pageW - mX, 82);

      pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.setTextColor(245,124,0);
      pdf.text(`Conflict Report — ${activeTab.toUpperCase()}`, mX, 104);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(107,114,128);
      pdf.text(`Total Rows: ${displayConflicts.length}`, mX, 120);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageW - mX, 120, { align: "right" });

      const rows = displayConflicts.map((c) => [
        c.roomName || "", c.floor || "", c.courseTitle || c.subject || "-",
        c.faculty || "", c.section || "-", c.day || "", c.date || "",
        `${c.startTime || ""} - ${c.endTime || ""}`,
        c.activityTitle || c.title || "",
        `${c.conflictStartTime || ""} - ${c.conflictEndTime || ""}`,
        (c.status || "").toUpperCase(),
      ]);

      autoTable(pdf, {
        startY: 134,
        head: [["Room","Floor","Course","Faculty","Section","Day","Date","Class Time","Activity","Overlap","Status"]],
        body: rows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 7, cellPadding: 4, valign: "middle" },
        headStyles: { fillColor: [245,124,0], textColor: [255,255,255], fontStyle: "bold", fontSize: 7 },
        bodyStyles: { textColor: [26,26,26] },
        alternateRowStyles: { fillColor: [253,246,240] },
        margin: { left: mX, right: mX },
      });

      const total = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(150,150,150);
        pdf.text(`Page ${i} of ${total}`, pageW - mX, pdf.internal.pageSize.getHeight() - 20, { align: "right" });
        pdf.text(`${SCHOOL_HEADER.systemName} — Confidential`, mX, pdf.internal.pageSize.getHeight() - 20);
      }

      pdf.save(`conflict-report-${activeTab}-${new Date().toISOString().slice(0,10)}.pdf`);
      showToast("success", "PDF Exported", `${displayConflicts.length} row(s) downloaded.`);
    } catch (err) {
      console.error(err);
      showToast("error", "Export Failed", "Could not generate PDF.");
    } finally {
      setExportMenuOpen(false);
    }
  };

  const openChooser = (conflict) => setChooser(conflict);

  const handleReassignChoice = (reassignType) => {
    if (!chooser) return;
    const payload = { conflict: chooser, reassignType };
    setChooser(null);
    navigate("/clerk/reassign-room", {
      state: { ...payload, from: "/clerk/conflicts" },
    });
  };

  return (
    <>
      <div className="dept-conflict">
        <div className="dept-page-header">
          <div>
            <h1>Conflict Monitoring</h1>
            <p>Review booking collisions and submit room reassignments for Department Head approval.</p>
          </div>

          <div className="dept-export-dropdown">
            <button className="dept-conflict-export-btn"
              onClick={() => setExportMenuOpen(!exportMenuOpen)} disabled={loading}>
              <i className="fa-solid fa-download"></i> Export Report
              <i className={`fa-solid fa-chevron-down ${exportMenuOpen ? "rotate" : ""}`}></i>
            </button>
            {exportMenuOpen && (
              <div className="dept-export-menu">
                <button onClick={handleExportPDF}><i className="fa-regular fa-file-pdf"></i> Export as PDF</button>
                <button onClick={handleExportCSV}><i className="fa-solid fa-file-csv"></i> Export as CSV</button>
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="dept-stats-row">
          <div className="dept-stat-card">
            <div className="dept-stat-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <div>
              <div className="dept-stat-value">{loading ? "—" : conflicts.length}</div>
              <div className="dept-stat-label">Active Conflicts</div>
            </div>
          </div>
          <div className="dept-stat-card">
            <div className="dept-stat-icon is-warning"><i className="fa-solid fa-hourglass-half"></i></div>
            <div>
              <div className="dept-stat-value">{loading ? "—" : pendingList.length}</div>
              <div className="dept-stat-label">Pending Reassignments</div>
            </div>
          </div>
          <div className="dept-stat-card">
            <div className="dept-stat-icon is-danger"><i className="fa-solid fa-clock-rotate-left"></i></div>
            <div>
              <div className="dept-stat-value">{loading ? "—" : unresolved.length}</div>
              <div className="dept-stat-label">Unresolved</div>
            </div>
          </div>
          <div className="dept-stat-card">
            <div className="dept-stat-icon is-success"><i className="fa-solid fa-circle-check"></i></div>
            <div>
              <div className="dept-stat-value">{loading ? "—" : resolved.length}</div>
              <div className="dept-stat-label">Resolved</div>
            </div>
          </div>
        </div>

        <div className="conflict-main-box">
          <div className="conflict-nav">
            <div className={`conflict-nav-item ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
              Active Conflicts <span className="conflict-nav-count">{conflicts.length}</span>
            </div>
            <div className={`conflict-nav-item ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
              Pending Reassignment <span className="conflict-nav-count">{pendingList.length}</span>
            </div>
            <div className={`conflict-nav-item ${activeTab === "unresolved" ? "active" : ""}`} onClick={() => setActiveTab("unresolved")}>
              Unresolved <span className="conflict-nav-count">{unresolved.length}</span>
            </div>
            <div className={`conflict-nav-item ${activeTab === "resolved" ? "active" : ""}`} onClick={() => setActiveTab("resolved")}>
              Resolved <span className="conflict-nav-count">{resolved.length}</span>
            </div>
          </div>

          <div className="conflict-body">
            {loading ? (
              <div className="room-empty">
                <span className="conflict-spinner"></span>
                <h2>Loading Conflicts</h2>
                <p>Please wait while we retrieve active conflicts.</p>
              </div>
            ) : displayConflicts.length === 0 ? (
              <div className="no-conflicts">
                <i className="fa-solid fa-calendar-check"></i>
                <p>{emptyMessage}</p>
                <span className="no-conflicts-hint">{emptyHint}</span>
              </div>
            ) : activeTab === "pending" ? (
              pendingList.map((p) => (
                <PendingReassignCard key={p.id} item={p} />
              ))
            ) : (
              displayConflicts.map((conflict, i) => (
                <ConflictCard
                  key={`${conflict.schedule?.id}-${conflict.event?.id}-${i}`}
                  conflict={conflict}
                  showReassign={activeTab === "all" && !conflict.reassignPending}
                  onResolved={handleResolved}
                  onReassignClick={() => openChooser(conflict)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {chooser && (
        <div className="rc-modal-overlay" onClick={() => setChooser(null)}>
          <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-icon"><i className="fa-solid fa-right-left"></i></div>
            <h3 className="rc-modal-title">What do you want to reassign?</h3>
            <p className="rc-modal-text">
              Choose which entry to move to a different room. Only one can be reassigned at a time.
            </p>
            <div className="rc-modal-options">
              <button className="rc-option" onClick={() => handleReassignChoice("class")}>
                <div className="rc-option-icon is-class"><i className="fa-solid fa-chalkboard-user"></i></div>
                <div className="rc-option-body">
                  <span className="rc-option-title">Original Class</span>
                  <span className="rc-option-desc">
                    {chooser.courseTitle || "Untitled"} · {chooser.section || "—"}
                  </span>
                </div>
              </button>
              <button className="rc-option" onClick={() => handleReassignChoice("event")}>
                <div className="rc-option-icon is-event"><i className="fa-solid fa-calendar-plus"></i></div>
                <div className="rc-option-body">
                  <span className="rc-option-title">Activity / Event</span>
                  <span className="rc-option-desc">{chooser.activityTitle || "Untitled activity"}</span>
                </div>
              </button>
            </div>
            <div className="rc-modal-actions">
              <button className="rc-modal-cancel" onClick={() => setChooser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Toast show={toast.show} type={toast.type} title={toast.title} message={toast.message}
        onClose={() => setToast((p) => ({ ...p, show: false }))} />
    </>
  );
}

// ─── Pending reassign card ─────────────────────────────────────────
// ─── Pending reassign card — SAME LOOK as ConflictCard ────────────
function PendingReassignCard({ item }) {
  const statusMap = {
    pending_admin:   {
      label: "Needs Review",
      cls: "status-pending",
      note: "Waiting for the Department Head's review.",
      icon: "fa-hourglass-half",
    },
    pending:         {
      label: "Needs Review",
      cls: "status-pending",
      note: "Waiting for the Department Head's review.",
      icon: "fa-hourglass-half",
    },
    pending_faculty: {
      label: "With Faculty",
      cls: "status-info",
      note: "Waiting for the faculty's response.",
      icon: "fa-user-clock",
    },
    needs_reassign:  {
      label: "Returned to You",
      cls: "status-danger",
      note: "Please select a different room and resubmit.",
      icon: "fa-rotate-left",
    },
  };
  const meta = statusMap[item.status] || statusMap.pending_admin;

  const isEvent = item.reassignType === "event";
  const displayTitle = isEvent
    ? (item.eventTitle || "Untitled Activity")
    : (item.courseTitle || item.subject || "Untitled Class");

  const dayLabel = item.day
    ? item.day
    : item.date
      ? new Date(item.date)
          .toLocaleDateString("en-US", { weekday: "short" })
          .toUpperCase()
      : "";

  return (
    <div className={`conflict-card ${meta.cls}`}>
      {/* ── TOP ROW ─────────────────────────────────────────── */}
      <div className="conflict-card-top">
        <div className="conflict-card-header">
          <div className="conflict-card-icon">
            <i className={`fa-solid ${isEvent ? "fa-calendar-plus" : "fa-right-left"}`}></i>
          </div>
          <div className="conflict-card-info">
            <span className="conflict-card-title">{displayTitle}</span>
            <span className="conflict-card-subtitle">
              {item.section ? `${item.section} • ` : ""}
              {isEvent ? "Activity reassignment" : "Class reassignment"}
            </span>
          </div>
        </div>
        <span className={`conflict-status-badge ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      {/* ── DETAIL GRID: From → New ──────────────────────────── */}
      <div className="conflict-detail-grid">
        <div className="conflict-detail-block">
          <div className="conflict-detail-label">
            <i className="fa-solid fa-door-open"></i> From Room
          </div>
          <div className="conflict-detail-main">
            {item.oldRoomName || "—"}
          </div>
          {item.facultyName && (
            <div className="conflict-detail-meta">
              <i className="fa-regular fa-user"></i> {item.facultyName}
            </div>
          )}
          <div className="conflict-detail-meta">
            <i className="fa-regular fa-clock"></i>
            {fmt12(item.startTime)} – {fmt12(item.endTime)}
          </div>
        </div>

        <div className="conflict-detail-divider" aria-hidden="true">
          <i className="fa-solid fa-arrow-right"></i>
        </div>

        <div className="conflict-detail-block is-activity">
          <div className="conflict-detail-label">
            <i className="fa-solid fa-location-dot"></i> New Room
          </div>
          <div className="conflict-detail-main">
            {item.newRoomName || "—"}
          </div>
          <div className="conflict-detail-sub">{formatDate(item.date)}</div>
          {dayLabel && (
            <div className="conflict-detail-meta">
              <i className="fa-regular fa-calendar"></i> {dayLabel}
            </div>
          )}
        </div>
      </div>

      {/* ── ADMIN NOTE ───────────────────────────────────────── */}
      {item.adminNote && (
        <div className="conflict-admin-note">
          <i className="fa-solid fa-comment-dots"></i>
          <span>{item.adminNote}</span>
        </div>
      )}

      {/* ── FOOTER NOTE ──────────────────────────────────────── */}
      <div className={`conflict-footer-note ${meta.cls}`}>
        <i className={`fa-solid ${meta.icon}`}></i>
        {meta.note}
      </div>
    </div>
  );
}

export default ClerkConflicts;