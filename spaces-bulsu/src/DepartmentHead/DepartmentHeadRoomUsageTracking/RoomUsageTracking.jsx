import "./room-usage-tracking.css";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import universityLogo from "../../assets/BSU-Logo.png";
import collegeLogo from "../../assets/CICT-Logo.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// NEW: import Toast
import Toast from "../../Popup/Toast/Toast";

const SCHOOL_HEADER = {
  universityLogoUrl: universityLogo,
  collegeLogoUrl: collegeLogo,
  universityName: "Bulacan State University",
  collegeName: "College of Information and Communications Technology",
  systemName: "SpaceS CICT",
};

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const todayString = () =>
  new Date().toISOString().split("T")[0];

const getDayAbbrev = (dateStr) => {
  const d = dateStr
    ? new Date(`${dateStr}T00:00:00`)
    : new Date();
  return DAY_ABBR[d.getDay()];
};

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [clock, period] = time.trim().split(" ");
  let [hour, minute] = clock.split(":").map(Number);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
};

const format12Hour = (time) => {
  if (!time) return "-";
  const [hour, minute] = time.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const getStatus = (dateStr, start, end) => {
  const today = todayString();
  if (dateStr && dateStr < today) return "COMPLETED";
  if (dateStr && dateStr > today) return "UPCOMING";
  const current = getCurrentMinutes();
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (current >= startMin && current <= endMin) return "ONGOING";
  if (current < startMin) return "UPCOMING";
  return "COMPLETED";
};

const normalizeRoomKey = (value = "") => String(value).trim().toLowerCase();

const matchesRoom = (item, selectedRoom, selectedRoomId) => {
  if (selectedRoomId && item.roomId) {
    return item.roomId === selectedRoomId;
  }
  return normalizeRoomKey(item.roomName) === normalizeRoomKey(selectedRoom);
};

const normalizeSchedule = (s) => ({
  id: s.id,
  kind: "schedule",
  sourceLabel: "Class Schedule",
  roomId: s.roomId || null,
  roomName: s.roomName,
  day: s.day,
  date: s.date || null,
  startTime: s.startTime,
  endTime: s.endTime,
  subject: s.subject || "Class",
  facultyName: s.facultyName || s.faculty || "-",
  faculty: s.facultyName || s.faculty || "-",
  section: s.section || "",
  semester: s.semester || "",
  schoolYear: s.schoolYear || "",
  organization: null,
});

const normalizeEvent = (e) => ({
  id: e.id,
  kind: "event",
  sourceLabel: "Room Activity",
  roomId: e.roomId || null,
  roomName: e.roomName,
  day: null,
  date: e.date,
  startTime: e.startTime,
  endTime: e.endTime,
  subject: e.title || e.purpose || "Room Activity",
  facultyName: e.faculty || "Department Head",
  section: "",
  organization: null,
});

const normalizeReservation = (r) => ({
  id: r.id,
  kind: "reservation",
  sourceLabel:
    r.reservationType === "walk-in"
      ? "Walk-in Reservation"
      : "Faculty Reservation",
  roomId: r.roomId || null,
  roomName: r.roomName,
  day: null,
  date: r.date,
  startTime: r.startTime,
  endTime: r.endTime,
  subject: r.customPurpose || r.courseTitle || r.purpose || "Reservation",
  facultyName: r.requesterName || r.facultyName || "-",
  section: r.yearSectionGroup || r.attendees?.yearSectionGroup || "",
  organization: r.organizationName || r.attendees?.organization || null,
});

const HISTORY_PAGE_SIZE = 10;

export default function RoomUsageTracking() {
  const [activeTab, setActiveTab] = useState("current");
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [nextSchedule, setNextSchedule] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastUser, setLastUser] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalSchedules: 0,
    completed: 0,
    ongoing: 0,
    upcoming: 0,
    utilization: 0,
  });

const [selectedRecord, setSelectedRecord] = useState(null);  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "loading",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    if (type !== "loading") {
      setTimeout(() => {
        setToast({ show: false, message: "", type: "loading" });
      }, 2500);
    }
  };

  const isToday = (date || todayString()) === todayString();

  const selectedRoomId = useMemo(() => {
    const match = rooms.find((r) => (r.roomName || r.name) === room);
    return match ? match.id : null;
  }, [rooms, room]);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(() => { loadRooms(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!room) return;
    trackRoom();
    buildHistory();
    buildAnalytics();
  }, [room, date, allSchedules, allEvents, allReservations]);

  useEffect(() => { setHistoryPage(1); }, [room]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const roomSnap = await getDocs(collection(db, "rooms"));
      const roomList = [];
      const scheduleList = [];

      for (const roomDoc of roomSnap.docs) {
        const roomData = { id: roomDoc.id, ...roomDoc.data() };
        roomList.push(roomData);

        const scheduleSnap = await getDocs(collection(db, "rooms", roomDoc.id, "schedules"));
        scheduleSnap.forEach(doc => {
          const data = doc.data();
          if (data.initialized) return;
          scheduleList.push(normalizeSchedule({
            id: doc.id,
            roomId: roomDoc.id,
            roomName: roomData.roomName || roomData.name,
            ...data,
          }));
        });
      }

      const eventSnap = await getDocs(collection(db, "events"));
      const eventList = eventSnap.docs.map((d) => normalizeEvent({ id: d.id, ...d.data() }));

      const reservationSnap = await getDocs(collection(db, "reservationRequests"));
      const reservationList = reservationSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => String(r.status || "").toLowerCase() === "approved")
        .map((r) => normalizeReservation(r));

      setRooms(roomList);
      setAllSchedules(scheduleList);
      setAllEvents(eventList);
      setAllReservations(reservationList);
      setRoom(prev => {
        if (prev) return prev;
        return roomList.length ? roomList[0].roomName || roomList[0].name : "";
      });
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const getOccurrencesForDate = (targetDate) => {
    const dayAbbrev = getDayAbbrev(targetDate);
    const scheduleOccurrences = allSchedules
      .filter((s) => matchesRoom(s, room, selectedRoomId) && s.day === dayAbbrev)
      .map((s) => ({ ...s, date: targetDate }));
    const eventOccurrences = allEvents.filter(
      (e) => matchesRoom(e, room, selectedRoomId) && e.date === targetDate
    );
    const reservationOccurrences = allReservations.filter(
      (r) => matchesRoom(r, room, selectedRoomId) && r.date === targetDate
    );
    return [...scheduleOccurrences, ...eventOccurrences, ...reservationOccurrences]
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  };

  const trackRoom = () => {
    const currentDate = date || todayString();
    const combined = getOccurrencesForDate(currentDate);
    let current = null;
    let next = null;
    const upcoming = [];

    if (isToday) {
      const now = getCurrentMinutes();
      combined.forEach((item, i) => {
        const start = timeToMinutes(item.startTime);
        const end = timeToMinutes(item.endTime);
        if (now >= start && now <= end) {
          current = item;
          next = combined[i + 1] || null;
        }
        if (start > now) { upcoming.push(item); }
      });
    } else {
      upcoming.push(...combined);
    }

    setCurrentSchedule(current);
    setNextSchedule(next);
    setUpcomingSchedules(upcoming);
  };

  const calculateProgress = (schedule) => {
    if (!schedule) return 0;
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const start = timeToMinutes(schedule.startTime);
    const end = timeToMinutes(schedule.endTime);
    if (current <= start) return 0;
    if (current >= end) return 100;
    return ((current - start) / (end - start)) * 100;
  };

  const parseDateTime = (date, time) => {
    if (!date || !time) return new Date(0);
    const [clock, period] = time.split(" ");
    let [h, m] = clock.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  };

  const buildHistory = () => {
    const currentDate = date || todayString();
    const scheduleHistory = getOccurrencesForDate(currentDate).filter((item) => item.kind === "schedule");
    const otherHistory = [
      ...allEvents.filter((e) => matchesRoom(e, room, selectedRoomId)),
      ...allReservations.filter((r) => matchesRoom(r, room, selectedRoomId)),
    ];
    const historyData = [...scheduleHistory, ...otherHistory].sort((a, b) => {
      const aEnd = new Date(`${a.date}T${a.endTime}`);
      const bEnd = new Date(`${b.date}T${b.endTime}`);
      return bEnd - aEnd;
    });

    setHistory(historyData);

    const ongoing = historyData.find(item => getStatus(item.date, item.startTime, item.endTime) === "ONGOING");
    if (ongoing) {
      setLastUser(ongoing);
    } else {
      const completed = historyData
        .filter(item => getStatus(item.date, item.startTime, item.endTime) === "COMPLETED")
        .sort((a, b) => parseDateTime(b.date, b.endTime) - parseDateTime(a.date, a.endTime));
      setLastUser(completed[0] || null);
    }
  };

  const buildAnalytics = () => {
    const currentDate = date || todayString();
    const combined = getOccurrencesForDate(currentDate);
    let completed = 0, ongoing = 0, upcoming = 0, occupiedMinutes = 0;

    combined.forEach(item => {
      const status = getStatus(currentDate, item.startTime, item.endTime);
      if (status === "COMPLETED") completed++;
      if (status === "ONGOING") ongoing++;
      if (status === "UPCOMING") upcoming++;
      occupiedMinutes += Math.max(0, timeToMinutes(item.endTime) - timeToMinutes(item.startTime));
    });

    const utilization = Math.min(100, Math.round((occupiedMinutes / (12 * 60)) * 100));
    setAnalytics({ totalSchedules: combined.length, completed, ongoing, upcoming, utilization });
  };

  // ─── PDF Export ─────────────────────────────────────────────────
  const handleExport = () => {
    if (history.length === 0) {
      showToast("No history to export for this room yet.", "error");
      return;
    }

    setExporting(true);
    showToast("Generating PDF...", "loading");

    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 40;

      // ---- Formal document header ----
      const logoSize = 50;
      const centerX = pageWidth / 2;

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

      // ---- Report title + filters ----
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(245, 124, 0);
      pdf.text("Room Usage History Log", marginX, 104);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Room: ${room}`, marginX, 120);
      pdf.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - marginX,
        120,
        { align: "right" }
      );

      // ---- Table ----
      const rows = history.map((item) => [
        `${item.date || "-"}\n${format12Hour(item.startTime)} - ${format12Hour(item.endTime)}`,
        item.subject,
        item.facultyName,
        item.sourceLabel,
        getStatus(item.date, item.startTime, item.endTime),
      ]);

      autoTable(pdf, {
        startY: 134,
        head: [["Date & Time", "Subject / Event", "Requested By", "Type", "Status"]],
        body: rows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, cellPadding: 6, valign: "middle" },
        headStyles: {
          fillColor: [245, 124, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { textColor: [26, 26, 26] },
        alternateRowStyles: { fillColor: [253, 246, 240] },
        margin: { left: marginX, right: marginX },
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

      const safeRoomName = (room || "room").replace(/\s+/g, "-");
      pdf.save(`room-usage-${safeRoomName}-${todayString()}.pdf`);

      showToast("PDF exported successfully!", "success");
    } catch (err) {
      console.error("Export failed:", err);
      showToast("Failed to generate the PDF. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  };

  // Pagination
  const totalHistoryPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const paginatedHistory = history.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  const renderHistoryPages = () => {
    const pages = [];
    const startPage = Math.max(1, historyPage - 1);
    const endPage = Math.min(totalHistoryPages, startPage + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <>
      <div className="rut-page">

        <div className="rut-header">
          <h1 className="rut-title">Room Usage Tracking</h1>
          <p className="rut-subtitle">Investigate real-time occupancy and historical usage patterns for any campus facility.</p>
        </div>

        <div className="rut-filter-bar">
          <div className="rut-filter-row">
            <div className="rut-filter-group">
              <span className="rut-filter-label">SELECT ROOM</span>
              <div className="rut-filter-input">
                <i className="fa-regular fa-building" />
                <select value={room} onChange={e => setRoom(e.target.value)} className="rut-select">
                  {rooms.map(r => (
                    <option key={r.id} value={r.roomName || r.name}>
                      {r.roomName || r.name}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down rut-chevron" />
              </div>
            </div>

            <div className="rut-filter-group">
              <span className="rut-filter-label">SELECT DATE</span>
              <div className="rut-filter-input">
                <i className="fa-regular fa-calendar" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="rut-date-input"
                />
              </div>
            </div>
          </div>

          <div className="rut-analytics">
            <div className="rut-analytics-card">
              <h3>Total Schedule</h3>
              <h1>{analytics.totalSchedules}</h1>
            </div>
            <div className="rut-analytics-card">
              <h3>Completed</h3>
              <h1>{analytics.completed}</h1>
            </div>
            <div className="rut-analytics-card">
              <h3>Ongoing</h3>
              <h1>{analytics.ongoing}</h1>
            </div>
            <div className="rut-analytics-card">
              <h3>Upcoming</h3>
              <h1>{analytics.upcoming}</h1>
            </div>
            <div className="rut-analytics-card utilization">
              <h3>Utilization</h3>
              <h1>{analytics.utilization}%</h1>
            </div>
          </div>
        </div>

        <div className="rut-content-card">
          <div className="rut-tabs">
            <button
              className={`rut-tab ${activeTab === "current" ? "active" : ""}`}
              onClick={() => setActiveTab("current")}
            >
              Current/Upcoming Usage
            </button>
            <button
              className={`rut-tab ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              Historical Log
            </button>
          </div>

          {activeTab === "current" && (
            <div className="rut-current-layout">
              <div className="rut-live-card">
                <div className="rut-live-header">
                  <div className="rut-live-indicator">
                    {isToday && <span className="rut-live-dot"></span>}
                    <span className="rut-live-label">
                      {isToday ? `Live Status : ${room}` : `Schedule for ${date} : ${room}`}
                    </span>
                  </div>
                  <span className={`rut-status-badge ${currentSchedule ? "occupied" : "vacant"}`}>
                    {currentSchedule ? "OCCUPIED" : "VACANT"}
                  </span>
                </div>

                {currentSchedule ? (
                  <>
                    <span className="rut-type-badge">{currentSchedule.sourceLabel}</span>
                    <div className="rut-live-grid">
                      <div className="rut-live-item">
                        <div className="rut-live-item-header">
                          <div className="rut-icon-circle"><i className="fa-solid fa-book" /></div>
                          <span className="rut-item-label">SUBJECT / PURPOSE</span>
                        </div>
                        <span className="rut-item-value large">{currentSchedule.subject}</span>
                      </div>
                      <div className="rut-live-item">
                        <div className="rut-live-item-header">
                          <div className="rut-icon-circle"><i className="fa-solid fa-building" /></div>
                          <span className="rut-item-label">ORGANIZATION</span>
                        </div>
                        <span className="rut-item-value">{currentSchedule.organization || "N/A"}</span>
                      </div>
                      <div className="rut-live-item">
                        <div className="rut-live-item-header">
                          <div className="rut-icon-circle"><i className="fa-solid fa-user" /></div>
                          <span className="rut-item-label">FACULTY / REQUESTED BY</span>
                        </div>
                        <span className="rut-item-value">{currentSchedule.facultyName}</span>
                      </div>
                      <div className="rut-live-item">
                        <div className="rut-live-item-header">
                          <div className="rut-icon-circle"><i className="fa-solid fa-clock" /></div>
                          <span className="rut-item-label">TIME</span>
                        </div>
                        <span className="rut-item-value">
                          {format12Hour(currentSchedule.startTime)} - {format12Hour(currentSchedule.endTime)}
                        </span>
                      </div>
                    </div>
                    <div className="rut-progress-bar">
                      <div className="rut-progress-fill" style={{ width: `${calculateProgress(currentSchedule)}%` }} />
                    </div>
                  </>
                ) : (
                  <div className="rut-empty-live">
                    <i className="fa-regular fa-circle-check"></i>
                    <h2>{isToday ? "Room is currently available." : "No ongoing activity to show for this date."}</h2>
                  </div>
                )}
              </div>

              <div className="rut-right-col">
                <div className="rut-specs-card">
                  <div className="rut-specs-header">
                    <i className="fa-solid fa-circle-info" />
                    <span>Room Information</span>
                  </div>
                  {rooms.filter(r => (r.roomName || r.name) === room).map(r => (
                    <div key={r.id}>
                      <div className="rut-specs-row">
                        <span className="rut-specs-key">Capacity</span>
                        <span className="rut-specs-val">{r.capacity || "-"}</span>
                      </div>
                      <div className="rut-specs-row">
                        <span className="rut-specs-key">Type</span>
                        <span className="rut-specs-val">{r.roomType || "-"}</span>
                      </div>
                      <div className="rut-specs-row">
                        <span className="rut-specs-key">Floor</span>
                        <span className="rut-specs-val">{r.floor || "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rut-next-card">
                  <span className="rut-next-label">
                    {isToday ? "TODAY'S UPCOMING" : `SCHEDULE FOR ${date}`}
                  </span>
                  {upcomingSchedules.length === 0 ? (
                    <div className="rut-no-upcoming">No schedules found for this day.</div>
                  ) : (
                    upcomingSchedules.map(schedule => (
                      <div key={`${schedule.kind}-${schedule.id}`} className="rut-upcoming-item">
                        <div className="rut-upcoming-subject">{schedule.subject}</div>
                        <div className="rut-upcoming-info">
                          {format12Hour(schedule.startTime)} - {format12Hour(schedule.endTime)}
                        </div>
                        <div className="rut-upcoming-info">{schedule.facultyName}</div>
                        <div className="rut-upcoming-info rut-upcoming-tag">{schedule.sourceLabel}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="rut-live-card">
              <h2 className="rut-history-last-title">Historical Room Usage</h2>
              <div className="rut-last-user">
                <strong className="rut-last-user-title">Last User</strong>
                {lastUser ? (
                  <div className="rut-last-user-details">
                    <span>{lastUser.facultyName}</span>
                    <span>{lastUser.subject}</span>
                    <span>{lastUser.date}</span>
                    <span>{format12Hour(lastUser.startTime)} - {format12Hour(lastUser.endTime)}</span>
                    <span className="rut-type-badge">{lastUser.sourceLabel}</span>
                  </div>
                ) : (
                  <p className="rut-last-user-empty">No previous usage.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── History table + pagination — own card ── */}
        <div className="rut-history-section">
          <div className="rut-history-header">
            <h2 className="rut-history-title">Recent History Log</h2>
            <button
              className="rut-export-btn"
              onClick={handleExport}
              disabled={exporting || history.length === 0}
            >
              <i className={`fa-solid ${exporting ? "fa-spinner fa-spin" : "fa-file-pdf"}`} />
              {exporting ? "Generating..." : "Export PDF"}
            </button>
          </div>

          <div className="rut-table-wrap">
            <table className="rut-table">
              <thead>
                <tr>
                  <th>DATE &amp; TIME</th>
                  <th>SUBJECT/EVENT</th>
                  <th>REQUESTED BY</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="rut-history-placeholder">
                      No history yet for this room.
                    </td>
                  </tr>
                )}
                {paginatedHistory.map(schedule => (
                  <tr key={`${schedule.kind}-${schedule.id}`}>
                    <td>
                      <div className="rut-date-cell">
                        <span className="rut-date">{schedule.date}</span>
                        <span className="rut-time">
                          {format12Hour(schedule.startTime)} - {format12Hour(schedule.endTime)}
                        </span>
                      </div>
                    </td>
                    <td className="rut-subject">{schedule.subject}</td>
                    <td>{schedule.facultyName}</td>
                    <td><span className="rut-type-badge">{schedule.sourceLabel}</span></td>
                    <td>
                      <span className={`rut-badge ${getStatus(schedule.date, schedule.startTime, schedule.endTime).toLowerCase()}`}>
                        {getStatus(schedule.date, schedule.startTime, schedule.endTime)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="rut-action-btn"
                        onClick={() => setSelectedRecord(schedule)}
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="rut-pagination-row">
            <span className="rut-pagination-info">
              Showing {history.length === 0 ? 0 : (historyPage - 1) * HISTORY_PAGE_SIZE + 1} to{" "}
              {Math.min(historyPage * HISTORY_PAGE_SIZE, history.length)} of {history.length} records
            </span>
            <div className="rut-pagination-buttons">
              <button
                className="rut-pagination-nav"
                disabled={historyPage === 1}
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left" />
              </button>

              {renderHistoryPages()[0] > 1 && (
                <>
                  <button className="rut-pagination-page" onClick={() => setHistoryPage(1)}>1</button>
                  {renderHistoryPages()[0] > 2 && <span className="rut-pagination-ellipsis">...</span>}
                </>
              )}

              {renderHistoryPages().map(page => (
                <button
                  key={page}
                  className={`rut-pagination-page ${historyPage === page ? "is-active" : ""}`}
                  onClick={() => setHistoryPage(page)}
                >
                  {page}
                </button>
              ))}

              {renderHistoryPages()[renderHistoryPages().length - 1] < totalHistoryPages && (
                <>
                  {renderHistoryPages()[renderHistoryPages().length - 1] < totalHistoryPages - 1 && (
                    <span className="rut-pagination-ellipsis">...</span>
                  )}
                  <button className="rut-pagination-page" onClick={() => setHistoryPage(totalHistoryPages)}>
                    {totalHistoryPages}
                  </button>
                </>
              )}

              <button
                className="rut-pagination-nav"
                disabled={historyPage >= totalHistoryPages}
                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedRecord && (
        <div className="rut-modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="rut-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rut-modal-header">
              <span className="rut-type-badge">{selectedRecord.sourceLabel}</span>
              <button className="rut-modal-close" onClick={() => setSelectedRecord(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <h2 className="rut-modal-subject">{selectedRecord.subject}</h2>

            <div className="rut-modal-grid">
              <div className="rut-modal-field">
                <span className="rut-modal-label">REQUESTED BY</span>
                <span className="rut-modal-value">{selectedRecord.facultyName}</span>
              </div>
              <div className="rut-modal-field">
                <span className="rut-modal-label">SECTION</span>
                <span className="rut-modal-value">{selectedRecord.section || "-"}</span>
              </div>
              <div className="rut-modal-field">
                <span className="rut-modal-label">DATE</span>
                <span className="rut-modal-value">{selectedRecord.date}</span>
              </div>
              <div className="rut-modal-field">
                <span className="rut-modal-label">TIME</span>
                <span className="rut-modal-value">
                  {format12Hour(selectedRecord.startTime)} - {format12Hour(selectedRecord.endTime)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() =>
          setToast({ show: false, type: "", message: "" })
        }
      />
    </>
  );
}