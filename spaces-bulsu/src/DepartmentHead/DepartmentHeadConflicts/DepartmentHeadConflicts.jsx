import "./department-head-conflicts.css";
import ConflictCard from "../../Components/ConflictCard/ConflictCard";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";

// ─── PDF Libraries & Logos ──────────────────────────────────────────
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import universityLogo from "../../assets/BSU-Logo.png";
import collegeLogo from "../../assets/CICT-Logo.png";

// ─── School Header (same as other modules) ─────────────────────────
const SCHOOL_HEADER = {
  universityLogoUrl: universityLogo,
  collegeLogoUrl: collegeLogo,
  universityName: "Bulacan State University",
  collegeName: "College of Information and Communications Technology",
  systemName: "SpaceS CICT",
};

// ─── Helpers (matching WeeklyCalendar) ──────────────────────────────
const semesterRank = (sem = "") => {
  const s = sem.toLowerCase();
  if (s.includes("2nd")) return 2;
  if (s.includes("1st")) return 1;
  return 0;
};

const schoolYearStart = (sy = "") => {
  const match = sy.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
};

// ───────────────────────────────────────────────────────────────────────

function DepartmentHeadConflicts() {
  const [conflicts, setConflicts] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [unresolved, setUnresolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
    }
  };

  useEffect(() => {
    loadConflicts();
  }, []);

  const convertToMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const overlap = (aStart, aEnd, bStart, bEnd) => {
    const s1 = convertToMinutes(aStart);
    const e1 = convertToMinutes(aEnd);
    const s2 = convertToMinutes(bStart);
    const e2 = convertToMinutes(bEnd);
    return s1 < e2 && e1 > s2;
  };

  const getOverlapTime = (schedStart, schedEnd, eventStart, eventEnd) => {
    const start = Math.max(
      convertToMinutes(schedStart),
      convertToMinutes(eventStart),
    );
    const end = Math.min(
      convertToMinutes(schedEnd),
      convertToMinutes(eventEnd),
    );
    const toTime = (mins) => {
      const h = String(Math.floor(mins / 60)).padStart(2, "0");
      const m = String(mins % 60).padStart(2, "0");
      return `${h}:${m}`;
    };
    return { start: toTime(start), end: toTime(end) };
  };

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const rooms = await getDocs(collection(db, "rooms"));
      const events = await getDocs(collection(db, "events"));
      const reassignSnap = await getDocs(collection(db, "roomReassignments"));

      const pendingKeys = new Set(
        reassignSnap.docs
          .map((d) => d.data())
          .filter((r) => String(r.status || "").toLowerCase() === "pending")
          .map((r) => `${r.scheduleId}_${r.eventId}`),
      );

      const activeFound = [];
      const unresolvedFound = [];
      const resolvedFound = [];
      const now = new Date();

      for (const roomDoc of rooms.docs) {
        const room = roomDoc.data();

        const scheduleSnap = await getDocs(
          collection(db, "rooms", roomDoc.id, "schedules"),
        );

        const allSchedules = scheduleSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (s) =>
              !s.initialized && s.faculty && s.day && s.startTime && s.endTime,
          );

        if (allSchedules.length === 0) continue;

        const latest = allSchedules.reduce((best, cur) => {
          const by = schoolYearStart(best.schoolYear);
          const bs = semesterRank(best.semester);
          const cy = schoolYearStart(cur.schoolYear);
          const cs = semesterRank(cur.semester);
          if (cy > by || (cy === by && cs > bs)) return cur;
          return best;
        }, allSchedules[0]);

        const schedules = allSchedules.filter(
          (s) =>
            (s.schoolYear || "") === (latest.schoolYear || "") &&
            (s.semester || "") === (latest.semester || ""),
        );

        const roomEvents = events.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((e) => e.roomId === roomDoc.id && e.status !== "Cancelled");

        roomEvents.forEach((event) => {
          const eventDay = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
            new Date(event.date).getDay()
          ];

          schedules.forEach((schedule) => {
            if (schedule.day !== eventDay) return;
            if (
              !overlap(
                schedule.startTime,
                schedule.endTime,
                event.startTime,
                event.endTime,
              )
            )
              return;

            const eventEnd = new Date(`${event.date}T${event.endTime}`);
            const overlapTime = getOverlapTime(
              schedule.startTime,
              schedule.endTime,
              event.startTime,
              event.endTime,
            );

            const conflict = {
              roomId: roomDoc.id,
              roomName: room.roomName,
              floor: room.floor,
              room,
              event,
              schedule,
              courseTitle: schedule.courseTitle || "",
              faculty: schedule.faculty || "",
              section: schedule.section || "",
              day: schedule.day,
              date: event.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              activityTitle: event.title,
              activityReason: event.reason,
              conflictStartTime: overlapTime.start,
              conflictEndTime: overlapTime.end,
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
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        "Load Failed",
        "Could not retrieve conflicts. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const displayConflicts =
    activeTab === "all"
      ? conflicts
      : activeTab === "unresolved"
        ? unresolved
        : resolved;

  const emptyMessage =
    activeTab === "all"
      ? "No active conflicts."
      : activeTab === "unresolved"
        ? "No unresolved conflicts."
        : "No resolved conflicts.";

  const emptyHint =
    activeTab === "all"
      ? "New booking collisions will show up here as they happen."
      : activeTab === "unresolved"
        ? "Great — nothing has slipped through unaddressed."
        : "Resolved conflicts will be logged here for your records.";

  // ─── CSV Export ──────────────────────────────────────────────────────
  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const handleExportCSV = () => {
    if (displayConflicts.length === 0) {
      showToast(
        "error",
        "Nothing to Export",
        "There are no conflicts in this view.",
      );
      return;
    }

    const headers = [
      "Room",
      "Floor",
      "Course",
      "Faculty",
      "Section",
      "Day",
      "Date",
      "Class Time",
      "Activity",
      "Overlap Time",
      "Status",
    ];

    const rows = displayConflicts.map((c) => [
      c.roomName,
      c.floor,
      c.courseTitle,
      c.faculty,
      c.section,
      c.day,
      c.date,
      `${c.startTime}-${c.endTime}`,
      c.activityTitle,
      `${c.conflictStartTime}-${c.conflictEndTime}`,
      c.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conflict-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      "success",
      "Exported",
      `${displayConflicts.length} conflict${displayConflicts.length === 1 ? "" : "s"} downloaded as CSV.`,
    );
    setExportMenuOpen(false);
  };

  // ─── PDF Export ──────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (displayConflicts.length === 0) {
      showToast(
        "error",
        "Nothing to Export",
        "There are no conflicts in this view.",
      );
      return;
    }

    showToast("loading", "Generating PDF...", "Please wait.");

    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 40;
      const logoSize = 50;
      const centerX = pageWidth / 2;

      // ---- Letterhead ----
      if (SCHOOL_HEADER.universityLogoUrl) {
        pdf.addImage(SCHOOL_HEADER.universityLogoUrl, "PNG", marginX, 22, logoSize, logoSize);
      }
      if (SCHOOL_HEADER.collegeLogoUrl) {
        pdf.addImage(
          SCHOOL_HEADER.collegeLogoUrl,
          "PNG",
          pageWidth - marginX - logoSize,
          22,
          logoSize,
          logoSize
        );
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(20, 27, 45);
      pdf.text(SCHOOL_HEADER.universityName, centerX, 36, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(SCHOOL_HEADER.collegeName, centerX, 50, { align: "center" });
      pdf.text(SCHOOL_HEADER.systemName, centerX, 62, { align: "center" });

      pdf.setDrawColor(245, 124, 0);
      pdf.setLineWidth(1.5);
      pdf.line(marginX, 82, pageWidth - marginX, 82);

      // ---- Title & filters ----
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(245, 124, 0);
      pdf.text(`Conflict Report — ${activeTab.toUpperCase()}`, marginX, 104);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Total Conflicts: ${displayConflicts.length}`, marginX, 120);
      pdf.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - marginX,
        120,
        { align: "right" }
      );

      // ---- Table ----
      const tableRows = displayConflicts.map((c) => [
        c.roomName,
        c.floor,
        c.courseTitle || "-",
        c.faculty,
        c.section || "-",
        c.day,
        c.date,
        `${c.startTime} - ${c.endTime}`,
        c.activityTitle,
        `${c.conflictStartTime} - ${c.conflictEndTime}`,
        c.status.toUpperCase(),
      ]);

      autoTable(pdf, {
        startY: 134,
        head: [
          [
            "Room",
            "Floor",
            "Course",
            "Faculty",
            "Section",
            "Day",
            "Date",
            "Class Time",
            "Activity",
            "Overlap",
            "Status",
          ],
        ],
        body: tableRows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 7, cellPadding: 4, valign: "middle" },
        headStyles: {
          fillColor: [245, 124, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
        },
        bodyStyles: { textColor: [26, 26, 26] },
        alternateRowStyles: { fillColor: [253, 246, 240] },
        margin: { left: marginX, right: marginX },
        // Reduce font size for narrow columns
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 50 },
          3: { cellWidth: 50 },
          4: { cellWidth: 40 },
          5: { cellWidth: 30 },
          6: { cellWidth: 50 },
          7: { cellWidth: 60 },
          8: { cellWidth: 60 },
          9: { cellWidth: 50 },
          10: { cellWidth: 40 },
        },
      });

      // ---- Footer ----
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - marginX,
          pdf.internal.pageSize.getHeight() - 20,
          { align: "right" }
        );
        pdf.text(
          `${SCHOOL_HEADER.systemName} — Confidential`,
          marginX,
          pdf.internal.pageSize.getHeight() - 20
        );
      }

      pdf.save(`conflict-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast(
        "success",
        "PDF Exported",
        `${displayConflicts.length} conflict${displayConflicts.length === 1 ? "" : "s"} downloaded.`
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("error", "Export Failed", "Could not generate PDF. Try again.");
    } finally {
      setExportMenuOpen(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <div className="dept-conflict">
        <div className="dept-page-header">
          <div>
            <h1>Conflict Monitoring</h1>
            <p>
              Resolve booking collisions and schedule overlaps within the CICT
              department.
            </p>
          </div>

          {/* ── Export Dropdown ── */}
          <div className="dept-export-dropdown">
            <button
              className="dept-conflict-export-btn"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={loading}
            >
              <i className="fa-solid fa-download"></i> Export Report
              <i className={`fa-solid fa-chevron-down ${exportMenuOpen ? "rotate" : ""}`}></i>
            </button>
            {exportMenuOpen && (
              <div className="dept-export-menu">
                <button onClick={handleExportPDF}>
                  <i className="fa-regular fa-file-pdf"></i> Export as PDF
                </button>
                <button onClick={handleExportCSV}>
                  <i className="fa-solid fa-file-csv"></i> Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="dept-stats-row">
          <div className="dept-stat-card">
            <div className="dept-stat-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="dept-stat-value">
                {loading ? "—" : conflicts.length}
              </div>
              <div className="dept-stat-label">Active Conflicts</div>
            </div>
          </div>

          <div className="dept-stat-card">
            <div className="dept-stat-icon is-danger">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <div className="dept-stat-value">
                {loading ? "—" : unresolved.length}
              </div>
              <div className="dept-stat-label">Unresolved</div>
            </div>
          </div>

          <div className="dept-stat-card">
            <div className="dept-stat-icon is-success">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <div className="dept-stat-value">
                {loading ? "—" : resolved.length}
              </div>
              <div className="dept-stat-label">Resolved</div>
            </div>
          </div>
        </div>

        <div className="conflict-main-box">
          <div className="conflict-nav">
            <div
              className={`conflict-nav-item ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Conflicts
              <span className="conflict-nav-count">{conflicts.length}</span>
            </div>
            <div
              className={`conflict-nav-item ${activeTab === "unresolved" ? "active" : ""}`}
              onClick={() => setActiveTab("unresolved")}
            >
              Unresolved
              <span className="conflict-nav-count">{unresolved.length}</span>
            </div>
            <div
              className={`conflict-nav-item ${activeTab === "resolved" ? "active" : ""}`}
              onClick={() => setActiveTab("resolved")}
            >
              Resolved
              <span className="conflict-nav-count">{resolved.length}</span>
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
            ) : (
              displayConflicts.map((conflict, index) => (
                <ConflictCard
                  key={`${conflict.schedule.id}-${conflict.event.id}-${index}`}
                  conflict={conflict}
                  showReassign={
                    activeTab === "all" && !conflict.reassignPending
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </>
  );
}

export default DepartmentHeadConflicts;