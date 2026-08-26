import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./local-registrar-view-room-card.css";
import { normalizeScheduleItem } from "../../utils/normalizeScheduleItem";
import ScheduleCard from "../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../Components/ClassDetailsCard/ClassDetailsCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";

// ─── PDF Libraries & Logos ──────────────────────────────────────────
import jsPDF from "jspdf";
import universityLogo from "../../assets/BSU-Logo.png";
import collegeLogo from "../../assets/CICT-Logo.png";

// ─── School Header ──────────────────────────────────────────────────
const SCHOOL_HEADER = {
  universityLogoUrl: universityLogo,
  collegeLogoUrl: collegeLogo,
  universityName: "Bulacan State University",
  collegeName: "College of Information and Communications Technology",
  systemName: "SpaceS CICT",
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ─── 12-hour format helper ──────────────────────────────────────────
const format12Hour = (time) => {
  if (!time) return "-";
  const [hour, minute] = time.split(":").map(Number);
  if (isNaN(hour) || isNaN(minute)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

// ─── COLOR HELPERS (UI) ─────────────────────────────────────────────
// Pastel color per faculty (consistent)
const getFacultyColor = (faculty) => {
  if (!faculty) return "#E0E0E0";
  let hash = 0;
  for (let i = 0; i < faculty.length; i++) {
    hash = faculty.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 80%)`; // pastel, lively
};

// Fixed lively colors for special categories
const getCategoryColor = (source) => {
  switch (source) {
    case "event":
      return "#4DD0E1"; // bright cyan (room activity)
    case "reservation":
      return "#FFB74D"; // soft orange (approved reservation)
    case "reassignment":
      return "#81C784"; // soft green (moved into room)
    case "walkin":
      return "#FFD54F"; // soft yellow (walk‑in)
    default:
      return "#E0E0E0";
  }
};
// ─────────────────────────────────────────────────────────────────────

function LocalRegistrarViewRoomCard() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const { room, semester, schoolYear, isOriginal } = location.state || {};

  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [releasedKeys, setReleasedKeys] = useState(new Set());
  const [reassignedAwayKeys, setReassignedAwayKeys] = useState(new Set());
  const [reassignedInto, setReassignedInto] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    if (!room?.id) return;

    const subCol = isOriginal ? "originalSchedules" : "schedules";
    const snapshot = await getDocs(collection(db, "rooms", room.id, subCol));
    let list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (isOriginal) {
      list = list.filter(
        (s) => s.semester === semester && s.schoolYear === schoolYear,
      );
    }

    setSchedules(list.filter((item) => !item.initialized));

    // For original schedules, skip all other data
    if (isOriginal) {
      setEvents([]);
      setReservations([]);
      setReleasedKeys(new Set());
      setReassignedAwayKeys(new Set());
      setReassignedInto([]);
      return;
    }

    // ─── load events, reservations, releases, reassignments ───
    const eventSnap = await getDocs(collection(db, "events"));
    const eventList = eventSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((event) => event.roomId === room.id);
    setEvents(eventList);

    const reservationSnap = await getDocs(
      collection(db, "reservationRequests"),
    );
    const reservationList = reservationSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (reservation) =>
          reservation.roomId === room.id &&
          String(reservation.status).toLowerCase() === "approved",
      );
    setReservations(reservationList);

    const releaseSnap = await getDocs(collection(db, "roomReleases"));
    const keys = new Set(
      releaseSnap.docs
        .map((d) => d.data())
        .filter((r) => r.roomId === room.id)
        .map((r) => `${r.scheduleId}_${r.date}`),
    );
    setReleasedKeys(keys);

    const reassignSnap = await getDocs(collection(db, "roomReassignments"));
    const roomReassignments = reassignSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter(
        (r) =>
          String(r.status || "").toLowerCase() === "approved" &&
          (r.oldRoomId === room.id || r.newRoomId === room.id),
      );
    setReassignedAwayKeys(
      new Set(
        roomReassignments
          .filter((r) => r.oldRoomId === room.id)
          .map((r) => `${r.scheduleId}_${r.date}`),
      ),
    );
    setReassignedInto(roomReassignments.filter((r) => r.newRoomId === room.id));
  };

  // ─── Helper functions ──────────────────────────────────────────────
  const getSchedulesByDay = (day) => {
    return schedules.filter(
      (schedule) => schedule.day?.trim().toUpperCase() === day,
    );
  };

  const convertToMinutes = (time) => {
    if (!time) return 0;
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };

  const HOUR_HEIGHT = 60;
  const getTopPosition = (startTime) => {
    const startMinutes = convertToMinutes(startTime);
    const calendarStart = 7 * 60;
    return ((startMinutes - calendarStart) / 60) * HOUR_HEIGHT + 10;
  };
  const getCardHeight = (startTime, endTime) => {
    const startMinutes = convertToMinutes(startTime);
    const endMinutes = convertToMinutes(endTime);
    return ((endMinutes - startMinutes) / 60) * 60;
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const startOfWeek = getStartOfWeek(currentWeek);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleString("default", { month: "long" });
    const endMonth = end.toLocaleString("default", { month: "long" });
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      today.getDate() === date.getDate() &&
      today.getMonth() === date.getMonth() &&
      today.getFullYear() === date.getFullYear()
    );
  };

  const getItemsForDate = (date) => {
    if (isOriginal) return [];
    const dateString = toDateStr(date);
    return [
      ...events
        .filter((e) => e.date === dateString)
        .map((e) => ({ ...e, _source: "event" })),
      ...reservations
        .filter((r) => r.date === dateString)
        .map((r) => ({ ...r, _source: "reservation" })),
      ...reassignedInto
        .filter((r) => r.date === dateString)
        .map((r) => ({ ...r, _source: "reassignment" })),
    ];
  };

  // ─── PDF EXPORT (Portrait, No Legend, Full Page) ─────────────────
  const handleExportPDF = async () => {
    if (schedules.length === 0) {
      showToast(
        "error",
        "No Schedules",
        "This room has no schedules to export.",
      );
      return;
    }

    setExporting(true);

    showToast("loading", "Generating PDF...", "Please wait.");

    try {
      // ============================================================
      // PDF SETUP
      // ============================================================

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      const pageHeight = pdf.internal.pageSize.getHeight();

      const marginX = 28;

      const timeColWidth = 45;

      const topHeader = 105;

      const bottomFooter = 30;

      const calendarTop = topHeader;

      const calendarBottom = pageHeight - bottomFooter;

      const calendarHeight = calendarBottom - calendarTop;

      // 7:00 AM - 8:00 PM = 13 hours
      const calendarStartMinutes = 7 * 60;
      const calendarEndMinutes = 20 * 60;

      const totalHours = 13;

      const hourHeight = calendarHeight / totalHours;

      const dayWidth = (pageWidth - marginX * 2 - timeColWidth) / 7;

      // ============================================================
      // HEADER / LOGOS
      // ============================================================

      const logoSize = 30;

      if (SCHOOL_HEADER.universityLogoUrl) {
        pdf.addImage(
          SCHOOL_HEADER.universityLogoUrl,
          "PNG",
          marginX,
          12,
          logoSize,
          logoSize,
        );
      }

      if (SCHOOL_HEADER.collegeLogoUrl) {
        pdf.addImage(
          SCHOOL_HEADER.collegeLogoUrl,
          "PNG",
          pageWidth - marginX - logoSize,
          12,
          logoSize,
          logoSize,
        );
      }

      // ============================================================
      // UNIVERSITY NAME
      // ============================================================

      pdf.setFont("helvetica", "bold");

      pdf.setFontSize(11);

      pdf.setTextColor(20, 27, 45);

      pdf.text(SCHOOL_HEADER.universityName, pageWidth / 2, 24, {
        align: "center",
      });

      // ============================================================
      // COLLEGE NAME
      // ============================================================

      pdf.setFont("helvetica", "normal");

      pdf.setFontSize(7.5);

      pdf.setTextColor(107, 114, 128);

      pdf.text(SCHOOL_HEADER.collegeName, pageWidth / 2, 36, {
        align: "center",
      });

      // ============================================================
      // SYSTEM NAME
      // ============================================================

      pdf.text(SCHOOL_HEADER.systemName, pageWidth / 2, 47, {
        align: "center",
      });

      // ============================================================
      // HEADER DIVIDER
      // ============================================================

      pdf.setDrawColor(245, 124, 0);

      pdf.setLineWidth(1.2);

      pdf.line(marginX, 58, pageWidth - marginX, 58);

      // ============================================================
      // CENTERED ROOM TITLE
      // ============================================================

      pdf.setFont("helvetica", "bold");

      pdf.setFontSize(12);

      pdf.setTextColor(245, 124, 0);

      pdf.text(
        `Classroom Schedule — ${room?.roomName || "Room"}`,
        pageWidth / 2,
        77,
        {
          align: "center",
        },
      );

      // ============================================================
      // CENTERED SCHOOL YEAR + SEMESTER
      // ============================================================

      pdf.setFont("helvetica", "normal");

      pdf.setFontSize(7.5);

      pdf.setTextColor(107, 114, 128);

      pdf.text(
        `${schoolYear || "N/A"} | ${semester || "N/A"}`,
        pageWidth / 2,
        89,
        {
          align: "center",
        },
      );

      // ============================================================
      // FACULTY COLOR MAPPING
      // ============================================================

      const facultyColors = {};

      const colorPalette = [
        [255, 225, 210],
        [220, 235, 255],
        [220, 248, 220],
        [255, 240, 205],
        [235, 220, 255],
        [255, 220, 230],
        [215, 245, 245],
        [255, 230, 205],
        [220, 230, 255],
        [230, 250, 225],
      ];

      let colorIndex = 0;

      const getFacultyColorPDF = (faculty) => {
        const key = (faculty || "Unknown").trim().toLowerCase();

        if (!facultyColors[key]) {
          facultyColors[key] = colorPalette[colorIndex % colorPalette.length];

          colorIndex++;
        }

        return facultyColors[key];
      };

      // ============================================================
      // CALENDAR GRID
      // ============================================================

      pdf.setDrawColor(220, 220, 220);

      pdf.setLineWidth(0.35);

      // ============================================================
      // HORIZONTAL GRID + TIME LABELS
      // ============================================================

      for (let h = 0; h <= totalHours; h++) {
        const y = calendarTop + h * hourHeight;

        // Horizontal line
        pdf.line(marginX + timeColWidth, y, pageWidth - marginX, y);

        // Time label
        const hour = 7 + h;

        let label;

        if (hour < 12) {
          label = `${hour} AM`;
        } else if (hour === 12) {
          label = "12 PM";
        } else {
          label = `${hour - 12} PM`;
        }

        pdf.setFont("helvetica", "normal");

        pdf.setFontSize(6.5);

        pdf.setTextColor(105, 105, 105);

        // Put 8 PM slightly above bottom line
        const labelY = h === totalHours ? y - 2 : y + 4;

        pdf.text(label, marginX + 2, labelY);
      }

      // ============================================================
      // VERTICAL DAY SEPARATORS
      // ============================================================

      for (let d = 0; d <= 7; d++) {
        const x = marginX + timeColWidth + d * dayWidth;

        pdf.line(x, calendarTop, x, calendarBottom);
      }

      // ============================================================
      // DAY HEADERS
      // ============================================================

      pdf.setFont("helvetica", "bold");

      pdf.setFontSize(7.5);

      pdf.setTextColor(50, 50, 50);

      for (let d = 0; d < 7; d++) {
        const x = marginX + timeColWidth + d * dayWidth + dayWidth / 2;

        pdf.text(DAYS[d], x, calendarTop - 5, {
          align: "center",
        });
      }

      // ============================================================
      // SORT SCHEDULES
      // ============================================================

      const sortedSchedules = [...schedules].sort((a, b) => {
        const dayOrder =
          DAYS.indexOf(a.day?.trim().toUpperCase()) -
          DAYS.indexOf(b.day?.trim().toUpperCase());

        if (dayOrder !== 0) {
          return dayOrder;
        }

        return convertToMinutes(a.startTime) - convertToMinutes(b.startTime);
      });

      // ============================================================
      // DRAW SCHEDULE BLOCKS
      // ============================================================

      for (const schedule of sortedSchedules) {
        const dayIndex = DAYS.indexOf(schedule.day?.trim().toUpperCase());

        if (dayIndex === -1) {
          continue;
        }

        const startMin = convertToMinutes(schedule.startTime);

        const endMin = convertToMinutes(schedule.endTime);

        // Ignore invalid schedules
        if (endMin <= startMin) {
          continue;
        }

        // Ignore schedules completely
        // outside 7 AM - 8 PM
        if (endMin <= calendarStartMinutes || startMin >= calendarEndMinutes) {
          continue;
        }

        // ==========================================================
        // CLAMP TO 7 AM - 8 PM
        // ==========================================================

        const visibleStart = Math.max(startMin, calendarStartMinutes);

        const visibleEnd = Math.min(endMin, calendarEndMinutes);

        const duration = visibleEnd - visibleStart;

        if (duration <= 0) {
          continue;
        }

        // ==========================================================
        // BLOCK POSITION
        // ==========================================================

        const topOffset =
          ((visibleStart - calendarStartMinutes) / 60) * hourHeight;

        const rawHeight = (duration / 60) * hourHeight;

        // Small gap between schedules
        const verticalGap = 2.5;

        const x = marginX + timeColWidth + dayIndex * dayWidth + verticalGap;

        const y = calendarTop + topOffset + verticalGap;

        const w = dayWidth - verticalGap * 2;

        const blockHeight = Math.max(rawHeight - verticalGap * 2, 18);

        // ==========================================================
        // BLOCK COLOR
        // ==========================================================

        const faculty = schedule.faculty || "";

        const [r, g, b] = getFacultyColorPDF(faculty);

        const averageColor = (r + g + b) / 3;

        const textColor = averageColor < 180 ? [255, 255, 255] : [35, 35, 35];

        const secondaryTextColor =
          averageColor < 180 ? [235, 235, 235] : [75, 75, 75];

        // ==========================================================
        // DRAW BLOCK
        // ==========================================================

        pdf.setFillColor(r, g, b);

        pdf.setDrawColor(
          Math.max(r - 25, 0),
          Math.max(g - 25, 0),
          Math.max(b - 25, 0),
        );

        pdf.setLineWidth(0.35);

        pdf.roundedRect(x, y, w, blockHeight, 3, 3, "FD");

        // ==========================================================
        // CONTENT AREA
        // ==========================================================

        const innerPaddingX = 5;

        const contentX = x + innerPaddingX;

        const contentWidth = w - innerPaddingX * 2;

        // ==========================================================
        // CONTENT FONT SIZES
        // ==========================================================

        const subject = schedule.courseTitle || schedule.subject || "Class";

        const section = schedule.section || "";

        const timeLabel = `${format12Hour(schedule.startTime)} - ${format12Hour(
          schedule.endTime,
        )}`;

        let titleSize = 7;

        let detailSize = 5.5;

        let lineSpacing = 7;

        if (blockHeight < 32) {
          titleSize = 6.2;
          detailSize = 4.8;
          lineSpacing = 6;
        }

        if (blockHeight < 24) {
          titleSize = 5.7;
          detailSize = 4.4;
          lineSpacing = 5.5;
        }

        // ==========================================================
        // TEXT FIT HELPER
        // ==========================================================

        const fitText = (text, fontSize) => {
          if (!text) {
            return "";
          }

          pdf.setFontSize(fontSize);

          const maxWidth = contentWidth - 2;

          if (pdf.getTextWidth(text) <= maxWidth) {
            return text;
          }

          let result = text;

          while (
            result.length > 3 &&
            pdf.getTextWidth(`${result}...`) > maxWidth
          ) {
            result = result.slice(0, -1);
          }

          return `${result}...`;
        };

        // ==========================================================
        // BUILD CONTENT FIRST
        // ==========================================================

        const contentLines = [];

        // SUBJECT
        contentLines.push({
          text: fitText(subject, titleSize),
          font: "bold",
          size: titleSize,
        });

        // FACULTY
        if (faculty && blockHeight >= 27) {
          contentLines.push({
            text: fitText(faculty, detailSize),
            font: "normal",
            size: detailSize,
          });
        }

        // SECTION
        if (section && blockHeight >= 38) {
          contentLines.push({
            text: fitText(`[${section}]`, detailSize),
            font: "normal",
            size: detailSize,
          });
        }

        // TIME
        if (blockHeight >= 48) {
          contentLines.push({
            text: timeLabel,
            font: "normal",
            size: Math.max(detailSize - 0.3, 4),
          });
        }

        // ==========================================================
        // VERTICAL CENTERING
        // ==========================================================

        const totalContentHeight = contentLines.length * lineSpacing;

        let textY = y + (blockHeight - totalContentHeight) / 2 + 5;

        // Prevent content from going
        // too close to the top
        textY = Math.max(textY, y + 5);

        // ==========================================================
        // DRAW CONTENT
        // ==========================================================

        contentLines.forEach((line, index) => {
          pdf.setFont("helvetica", line.font);

          pdf.setFontSize(line.size);

          // Subject = primary
          // Others = secondary
          pdf.setTextColor(...(index === 0 ? textColor : secondaryTextColor));

          pdf.text(line.text, x + w / 2, textY, {
            align: "center",
          });

          textY += lineSpacing;
        });
      }

      // ============================================================
      // FOOTER
      // ============================================================

      const pageCount = pdf.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        pdf.setFont("helvetica", "normal");

        pdf.setFontSize(7);

        pdf.setTextColor(150, 150, 150);

        // Bottom-left
        pdf.text(
          `${SCHOOL_HEADER.systemName} — Confidential`,
          marginX,
          pageHeight - 12,
        );

        // Bottom-right
        pdf.text(
          `Generated: ${new Date().toLocaleString()}`,
          pageWidth - marginX,
          pageHeight - 12,
          {
            align: "right",
          },
        );
      }

      // ============================================================
      // SAVE PDF
      // ============================================================

      pdf.save(
        `Room-Schedule-${room?.roomName || "Room"}-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`,
      );

      // ============================================================
      // SUCCESS
      // ============================================================

      showToast("success", "PDF Downloaded", "Schedule exported successfully.");
    } catch (err) {
      console.error("PDF export failed:", err);

      showToast("error", "Export Failed", "Could not generate PDF.");
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <>
      <div className="lr-view-room">
        <i
          className="fa-solid fa-arrow-left lr-back-arrow"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/local-registrar/academic-schedule");
            }
          }}
        ></i>

        <div className="lr-vr-white-box">
          <div className="lr-vr-box-header">
            <div className="lr-vr-week-navigation">
              {!isOriginal && (
                <>
                  <i
                    className="fa-solid fa-chevron-left"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const prev = new Date(currentWeek);
                      prev.setDate(prev.getDate() - 7);
                      setCurrentWeek(prev);
                    }}
                  />
                  <span>{formatWeekRange()}</span>
                  <i
                    className="fa-solid fa-chevron-right"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const next = new Date(currentWeek);
                      next.setDate(next.getDate() + 7);
                      setCurrentWeek(next);
                    }}
                  />
                </>
              )}
              {isOriginal && <span>Weekly Schedule (Original)</span>}
            </div>
            <div className="lr-vr-header-right">
              <span className="lr-vr-room-name">{room?.roomName}</span>
              {isOriginal && (
                <button
                  className="lr-vr-export-pdf-btn"
                  onClick={handleExportPDF}
                  disabled={exporting || schedules.length === 0}
                >
                  <i className="fa-solid fa-download"></i>
                  {exporting ? "Generating..." : "Export PDF"}
                </button>
              )}
            </div>
          </div>

          <div className="lr-vr-scroll-x">
            {/* Day headers */}
            <div className="lr-vr-days-container">
              <div className="lr-vr-time-column" aria-hidden="true"></div>
              {weekDates.map((date, index) => (
                <div
                  className={`lr-vr-day ${isToday(date) ? "today" : ""}`}
                  key={index}
                >
                  <span className="lr-vr-day-name">{DAYS[index]}</span>
                  {!isOriginal && (
                    <span className="lr-vr-day-date">{date.getDate()}</span>
                  )}
                </div>
              ))}
            </div>

            <hr className="lr-vr-days-divider" />

            {/* Schedule grid */}
            <div className="lr-vr-schedule-container">
              <div className="lr-vr-time-column">
                {[
                  "07 AM",
                  "08 AM",
                  "09 AM",
                  "10 AM",
                  "11 AM",
                  "12 PM",
                  "01 PM",
                  "02 PM",
                  "03 PM",
                  "04 PM",
                  "05 PM",
                  "06 PM",
                  "07 PM",
                  "08 PM",
                ].map((label) => (
                  <div className="lr-vr-time-slot" key={label}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="lr-vr-calendar-grid">
                {schedules.length === 0 ? (
                  <div className="lr-vr-no-schedule">
                    <i className="fa-regular fa-calendar-xmark"></i>
                    <h3>No schedules available</h3>
                    <p>There are no schedules for this room.</p>
                  </div>
                ) : (
                  DAYS.map((day, index) => {
                    const dateObj = weekDates[index];
                    const dateStr = toDateStr(dateObj);
                    const daySchedules = getSchedulesByDay(day);

                    let filteredSchedules = daySchedules;
                    if (!isOriginal) {
                      filteredSchedules = daySchedules.filter((schedule) => {
                        if (releasedKeys.has(`${schedule.id}_${dateStr}`))
                          return false;
                        if (reassignedAwayKeys.has(`${schedule.id}_${dateStr}`))
                          return false;
                        const sStart = convertToMinutes(schedule.startTime);
                        const sEnd = convertToMinutes(schedule.endTime);
                        const items = getItemsForDate(dateObj);
                        return !items.some((ev) => {
                          const eStart = convertToMinutes(ev.startTime);
                          const eEnd = convertToMinutes(ev.endTime);
                          return sStart < eEnd && sEnd > eStart;
                        });
                      });
                    }

                    return (
                      <div className="lr-vr-calendar-day" key={day}>
                        {/* Regular schedules */}
                        {filteredSchedules.map((schedule) => (
                          <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            top={getTopPosition(schedule.startTime)}
                            height={getCardHeight(
                              schedule.startTime,
                              schedule.endTime,
                            )}
                            onClick={() =>
                              setSelectedSchedule(
                                normalizeScheduleItem(schedule, "schedule"),
                              )
                            }
                            // ── Faculty color (pastel) ──
                            facultyColor={getFacultyColor(schedule.faculty)}
                          />
                        ))}

                        {/* Events, reservations, reassignments */}
                        {!isOriginal &&
                          getItemsForDate(dateObj).map((item) => {
                            // Determine category and faculty name for display
                            let category = item._source;
                            let facultyName;
                            if (category === "event") {
                              facultyName = "ROOM ACTIVITY";
                            } else if (category === "reservation") {
                              facultyName =
                                item.requesterName ||
                                item.facultyName ||
                                "Walk-in";
                              // If no requester/faculty, treat as walk-in for color
                              if (!item.requesterName && !item.facultyName) {
                                category = "walkin";
                              }
                            } else if (category === "reassignment") {
                              facultyName =
                                item.facultyName ||
                                item.courseTitle ||
                                "Moved Class";
                            } else {
                              category = "walkin";
                              facultyName = "Walk-in";
                            }

                            const color = getCategoryColor(category);

                            return (
                              <ScheduleCard
                                key={item.id}
                                schedule={{
                                  ...item,
                                  subject:
                                    item.title ||
                                    item.purpose ||
                                    item.courseTitle ||
                                    (item._source === "reassignment"
                                      ? `${item.courseTitle || "Class"} (Moved)`
                                      : "Walk-in Reservation"),
                                  faculty: facultyName,
                                }}
                                top={getTopPosition(item.startTime)}
                                height={getCardHeight(
                                  item.startTime,
                                  item.endTime,
                                )}
                                onClick={() =>
                                  setSelectedSchedule(
                                    normalizeScheduleItem(item, item._source),
                                  )
                                }
                                // ── Category color ──
                                facultyColor={color}
                              />
                            );
                          })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lr-vr-class-details">
            <ClassDetailsCard
              schedule={selectedSchedule}
              roomName={room?.roomName}
              onClose={() => setSelectedSchedule(null)}
            />
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

export default LocalRegistrarViewRoomCard;
