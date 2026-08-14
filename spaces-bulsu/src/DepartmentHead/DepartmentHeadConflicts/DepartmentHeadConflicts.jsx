import "./department-head-conflicts.css";
import ConflictCard from "../../Components/ConflictCard/ConflictCard";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";

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
              // Capture resolution info if available
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

  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const handleExport = () => {
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
      `${displayConflicts.length} conflict${displayConflicts.length === 1 ? "" : "s"} downloaded.`,
    );
  };

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
          <button
            className="dept-conflict-export-btn"
            disabled={loading}
            onClick={handleExport}
          >
            <i className="fa-solid fa-download"></i> Export Report
          </button>
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
