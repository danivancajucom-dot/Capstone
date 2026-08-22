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
        (s) => s.semester === semester && s.schoolYear === schoolYear
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

    const reservationSnap = await getDocs(collection(db, "reservationRequests"));
    const reservationList = reservationSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (reservation) =>
          reservation.roomId === room.id &&
          String(reservation.status).toLowerCase() === "approved"
      );
    setReservations(reservationList);

    const releaseSnap = await getDocs(collection(db, "roomReleases"));
    const keys = new Set(
      releaseSnap.docs
        .map((d) => d.data())
        .filter((r) => r.roomId === room.id)
        .map((r) => `${r.scheduleId}_${r.date}`)
    );
    setReleasedKeys(keys);

    const reassignSnap = await getDocs(collection(db, "roomReassignments"));
    const roomReassignments = reassignSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter(
        (r) =>
          String(r.status || "").toLowerCase() === "approved" &&
          (r.oldRoomId === room.id || r.newRoomId === room.id)
      );
    setReassignedAwayKeys(
      new Set(
        roomReassignments
          .filter((r) => r.oldRoomId === room.id)
          .map((r) => `${r.scheduleId}_${r.date}`)
      )
    );
    setReassignedInto(
      roomReassignments.filter((r) => r.newRoomId === room.id)
    );
  };

  // ─── Helper functions ──────────────────────────────────────────────
  const getSchedulesByDay = (day) => {
    return schedules.filter(
      (schedule) => schedule.day?.trim().toUpperCase() === day
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
      showToast("error", "No Schedules", "This room has no schedules to export.");
      return;
    }
    setExporting(true);
    showToast("loading", "Generating PDF...", "Please wait.");

    try {
      // ── Portrait A4 ──
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // ---- Smaller margins ----
      const marginX = 30;
      const marginY = 25;
      const logoSize = 30;

      // ---- Letterhead ----
      if (SCHOOL_HEADER.universityLogoUrl) {
        pdf.addImage(SCHOOL_HEADER.universityLogoUrl, "PNG", marginX, 14, logoSize, logoSize);
      }
      if (SCHOOL_HEADER.collegeLogoUrl) {
        pdf.addImage(
          SCHOOL_HEADER.collegeLogoUrl,
          "PNG",
          pageWidth - marginX - logoSize,
          14,
          logoSize,
          logoSize
        );
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(20, 27, 45);
      pdf.text(SCHOOL_HEADER.universityName, pageWidth / 2, 26, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(SCHOOL_HEADER.collegeName, pageWidth / 2, 38, { align: "center" });
      pdf.text(SCHOOL_HEADER.systemName, pageWidth / 2, 48, { align: "center" });

      pdf.setDrawColor(245, 124, 0);
      pdf.setLineWidth(1.2);
      pdf.line(marginX, 60, pageWidth - marginX, 60);

      // ---- Title & Details ----
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(245, 124, 0);
      pdf.text(`Classroom Schedule — ${room?.roomName || "Room"}`, marginX, 78);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      const details = `${schoolYear || "N/A"} | ${semester || "N/A"} | Generated: ${new Date().toLocaleString()}`;
      pdf.text(details, marginX, 90);

      // ---- Calendar Grid ----
      const timeColWidth = 46;
      const dayWidth = (pageWidth - marginX * 2 - timeColWidth) / 7;

      const topOfCalendar = 108;
      const bottomMargin = 30; // space for footer
      const availableHeight = pageHeight - topOfCalendar - bottomMargin;
      const totalHours = 13; // 7 AM to 8 PM
      const hourHeight = availableHeight / totalHours;

      // ---- Faculty color mapping ----
      const facultyColors = {};
      const colorPalette = [
        [255, 215, 195], [215, 235, 255], [215, 255, 215], [255, 240, 195],
        [235, 215, 255], [255, 215, 225], [195, 240, 240], [255, 230, 205],
        [205, 225, 255], [225, 255, 225]
      ];
      let colorIndex = 0;

      const getFacultyColor = (faculty) => {
        const key = (faculty || "Unknown").trim().toLowerCase();
        if (!facultyColors[key]) {
          facultyColors[key] = colorPalette[colorIndex % colorPalette.length];
          colorIndex++;
        }
        return facultyColors[key];
      };

      // ---- Draw time labels & horizontal grid lines ----
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.4);
      for (let h = 0; h <= totalHours; h++) {
        const y = topOfCalendar + h * hourHeight;
        pdf.line(marginX + timeColWidth, y, pageWidth - marginX, y);
        if (h < totalHours) {
          const hour = 7 + h;
          const label = hour <= 11 ? `${hour} AM` : hour === 12 ? `12 PM` : `${hour - 12} PM`;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.5);
          pdf.setTextColor(100, 100, 100);
          pdf.text(label, marginX + 3, y + 4);
        }
      }

      // ---- Draw vertical day separators ----
      for (let d = 0; d <= 7; d++) {
        const x = marginX + timeColWidth + d * dayWidth;
        pdf.line(x, topOfCalendar, x, topOfCalendar + totalHours * hourHeight);
      }

      // ---- Day headers ----
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(50, 50, 50);
      for (let d = 0; d < 7; d++) {
        const x = marginX + timeColWidth + d * dayWidth + dayWidth / 2;
        pdf.text(DAYS[d], x, topOfCalendar - 5, { align: "center" });
      }

      // ---- Schedule blocks ----
      const calendarStartMinutes = 7 * 60;
      const sortedSchedules = [...schedules].sort((a, b) => {
        const dayOrder = DAYS.indexOf(a.day?.trim().toUpperCase()) - DAYS.indexOf(b.day?.trim().toUpperCase());
        if (dayOrder !== 0) return dayOrder;
        return convertToMinutes(a.startTime) - convertToMinutes(b.startTime);
      });

      for (const schedule of sortedSchedules) {
        const dayIndex = DAYS.indexOf(schedule.day?.trim().toUpperCase());
        if (dayIndex === -1) continue;

        const startMin = convertToMinutes(schedule.startTime);
        const endMin = convertToMinutes(schedule.endTime);
        const duration = endMin - startMin;
        if (duration <= 0) continue;

        const topOffset = ((startMin - calendarStartMinutes) / 60) * hourHeight;
        const blockHeight = (duration / 60) * hourHeight;
        const finalBlockHeight = Math.max(blockHeight, 12);

        const x = marginX + timeColWidth + dayIndex * dayWidth + 2;
        const y = topOfCalendar + topOffset + 2;
        const w = dayWidth - 4;

        // Color per faculty
        const faculty = schedule.faculty || "";
        const [r, g, b] = getFacultyColor(faculty);
        const isDarkText = (r + g + b) / 3 < 180;

        // Rounded rectangle
        const radius = 2;
        pdf.setFillColor(r, g, b);
        pdf.setDrawColor(200, 180, 160);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(x, y, w, finalBlockHeight, radius, radius, "FD");

        // ---- Content ----
        const subject = schedule.courseTitle || schedule.subject || "Class";
        const timeLabel = `${format12Hour(schedule.startTime)} - ${format12Hour(schedule.endTime)}`;
        const section = schedule.section || "";

        // Dynamic font sizes
        let titleSize, detailSize, spacing;
        if (finalBlockHeight > 30) {
          titleSize = 7; detailSize = 5.5; spacing = 8;
        } else if (finalBlockHeight > 20) {
          titleSize = 6; detailSize = 5; spacing = 7;
        } else {
          titleSize = 5.5; detailSize = 4.5; spacing = 6;
        }

        let textY = y + 4;
        const padX = 3;

        // Subject
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(titleSize);
        pdf.setTextColor(isDarkText ? 255 : 26, isDarkText ? 255 : 26, isDarkText ? 255 : 26);
        let displaySubject = subject;
        const maxChars = Math.floor((w - 6) / (titleSize * 0.45));
        if (displaySubject.length > maxChars && maxChars > 3) {
          displaySubject = displaySubject.substring(0, maxChars - 2) + "..";
        }
        pdf.text(displaySubject, x + padX, textY);
        textY += spacing;

        // Faculty
        if (finalBlockHeight > 18 && faculty) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(detailSize);
          pdf.setTextColor(isDarkText ? 230 : 50, isDarkText ? 230 : 50, isDarkText ? 230 : 50);
          let displayFaculty = faculty;
          const maxFacultyChars = Math.floor((w - 6) / (detailSize * 0.45));
          if (displayFaculty.length > maxFacultyChars && maxFacultyChars > 3) {
            displayFaculty = displayFaculty.substring(0, maxFacultyChars - 2) + "..";
          }
          pdf.text(displayFaculty, x + padX, textY);
          textY += spacing;
        }

        // Section
        if (finalBlockHeight > 22 && section) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(detailSize - 0.5);
          pdf.setTextColor(isDarkText ? 210 : 80, isDarkText ? 210 : 80, isDarkText ? 210 : 80);
          let displaySection = section;
          const maxSectionChars = Math.floor((w - 6) / ((detailSize - 0.5) * 0.45));
          if (displaySection.length > maxSectionChars && maxSectionChars > 3) {
            displaySection = displaySection.substring(0, maxSectionChars - 2) + "..";
          }
          pdf.text(`[${displaySection}]`, x + padX, textY);
          textY += spacing;
        }

        // Time
        if (finalBlockHeight > 14) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(detailSize - 0.5);
          pdf.setTextColor(isDarkText ? 210 : 100, isDarkText ? 210 : 100, isDarkText ? 210 : 100);
          pdf.text(timeLabel, x + padX, textY);
        }
      }

      // ---- No legend (removed) ----

      // ---- Footer ----
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - marginX,
          pageHeight - 16,
          { align: "right" }
        );
        pdf.text(
          `${SCHOOL_HEADER.systemName} — Confidential`,
          marginX,
          pageHeight - 16
        );
      }

      pdf.save(`Room-Schedule-${room?.roomName || "Room"}-${new Date().toISOString().slice(0,10)}.pdf`);

      showToast("success", "PDF Downloaded", "Schedule exported successfully.");
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("error", "Export Failed", "Could not generate PDF.");
    }
    setExporting(false);
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
                {["07 AM","08 AM","09 AM","10 AM","11 AM","12 PM","01 PM","02 PM","03 PM","04 PM","05 PM","06 PM","07 PM","08 PM"].map((label) => (
                  <div className="lr-vr-time-slot" key={label}>{label}</div>
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
                        if (releasedKeys.has(`${schedule.id}_${dateStr}`)) return false;
                        if (reassignedAwayKeys.has(`${schedule.id}_${dateStr}`)) return false;
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
                        {filteredSchedules.map((schedule) => (
                          <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            top={getTopPosition(schedule.startTime)}
                            height={getCardHeight(schedule.startTime, schedule.endTime)}
                            onClick={() =>
                              setSelectedSchedule(
                                normalizeScheduleItem(schedule, "schedule")
                              )
                            }
                          />
                        ))}
                        {!isOriginal &&
                          getItemsForDate(dateObj).map((item) => (
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
                                faculty:
                                  item.title
                                    ? "ROOM ACTIVITY"
                                    : item.requesterName ||
                                      item.facultyName ||
                                      "Walk-in",
                              }}
                              top={getTopPosition(item.startTime)}
                              height={getCardHeight(item.startTime, item.endTime)}
                              onClick={() =>
                                setSelectedSchedule(
                                  normalizeScheduleItem(item, item._source)
                                )
                              }
                            />
                          ))}
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