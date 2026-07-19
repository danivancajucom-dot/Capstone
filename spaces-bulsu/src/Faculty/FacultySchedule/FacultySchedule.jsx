import { useEffect, useMemo, useState } from "react";
import "./faculty-schedule.css";
import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 60;

const CARD_COLORS = [
  { bg: "#EEF2FF", border: "#4F6EF7", text: "#3651D4", timeBg: "#C7D0FA" }, // blue - Academic
  { bg: "#ECFDF5", border: "#34C77B", text: "#1A9E5C", timeBg: "#A7F0CC" }, // green - Institutional
  { bg: "#FFF7ED", border: "#F97316", text: "#C2621A", timeBg: "#FDD9B5" }, // orange - Reservation
];

const LEGEND = [
  { label: "Academic",      color: "#4F6EF7" },
  { label: "Institutional", color: "#34C77B" },
  { label: "Reservation",   color: "#F97316" },
];

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------

const normalizeName = (name = "") =>
  name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

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

// "MON"-based index (1-7) galing sa isang "YYYY-MM-DD" date string
const mondayIndexFromDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  const jsDay = d.getDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
};

const isWithinWeek = (dateStr, start, end) => {
  if (!dateStr) return false;

  const d = new Date(`${dateStr}T00:00:00`);

  return d >= start && d <= end;
};

const parseTimeParts = (time) => {
  const [h, m] = (time || "0:0").split(":").map(Number);

  return [
    Number.isNaN(h) ? 0 : h,
    Number.isNaN(m) ? 0 : m,
  ];
};

function fmtHour(h) {
  if (h < 12) return `${String(h).padStart(2,"0")} AM`;
  if (h === 12) return `12 PM`;
  return `${String(h-12).padStart(2,"0")} PM`;
}

function fmtTime(h, m) {
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

export default function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [noSchedule, setNoSchedule] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null); // { semester, schoolYear }

  const [scheduleEvents, setScheduleEvents] = useState([]);   // Academic (recurring, by day)
  const [overrideEvents, setOverrideEvents] = useState([]);   // Institutional (by date)
  const [reservationEvents, setReservationEvents] = useState([]); // Reservation (by date)

  useEffect(() => {
    loadFacultySchedule();
  }, []);

  const loadFacultySchedule = async () => {

    setLoading(true);

    try {

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

      if (!userSnap.exists()) {
        setLoading(false);
        return;
      }

      const me = userSnap.data();

      const myName = normalizeName(
        `${me.lastName}, ${me.firstName}${me.middleInitial ? ` ${me.middleInitial}` : ""}`
      );

      // ---------------------------------------------------------
      // Hanapin ang lahat ng schedule (sa lahat ng room) na
      // itinugma sa pangalan ng naka-login na faculty
      // ---------------------------------------------------------

      const roomsSnap = await getDocs(collection(db, "rooms"));

      const matchedSchedules = [];

      for (const roomDoc of roomsSnap.docs) {

        const room = { id: roomDoc.id, ...roomDoc.data() };

        const scheduleSnap = await getDocs(
          collection(db, "rooms", roomDoc.id, "schedules")
        );

        scheduleSnap.docs.forEach((d) => {

          const s = d.data();

          if (s.initialized) return;
          if (!s.faculty) return;

          if (normalizeName(s.faculty) === myName) {

            matchedSchedules.push({
              id: d.id,
              ...s,
              roomId: room.id,
              roomName: room.roomName,
              floor: room.floor,
            });

          }

        });

      }

      if (matchedSchedules.length === 0) {

        setScheduleEvents([]);
        setOverrideEvents([]);
        setReservationEvents([]);
        setActiveTerm(null);
        setNoSchedule(true);
        setLoading(false);

        return;

      }

      // ---------------------------------------------------------
      // Piliin lang ang PINAKABAGONG semester + school year
      // ---------------------------------------------------------

      const rank = (s) => [
        schoolYearStart(s.schoolYear),
        semesterRank(s.semester),
      ];

      const latest = matchedSchedules.reduce((best, cur) => {

        const [by, bs] = rank(best);
        const [cy, cs] = rank(cur);

        if (cy > by || (cy === by && cs > bs)) return cur;

        return best;

      }, matchedSchedules[0]);

      const latestSchedules = matchedSchedules.filter(
        (s) =>
          (s.schoolYear || "") === (latest.schoolYear || "") &&
          (s.semester || "") === (latest.semester || "")
      );

      setScheduleEvents(latestSchedules);
      setActiveTerm({
        semester: latest.semester,
        schoolYear: latest.schoolYear,
      });
      setNoSchedule(false);

      const myRoomIds = [...new Set(latestSchedules.map((s) => s.roomId))];

      // ---------------------------------------------------------
      // Room activities (overrides) sa mga room kung saan may
      // klase ang faculty — code-reference: ganito rin ang
      // pagtukoy ng "affected faculty" sa RoomActivity.jsx (dept
      // head side), dito lang ito ipinapakita sa sariling calendar
      // ---------------------------------------------------------

      const eventSnap = await getDocs(collection(db, "events"));

      const myEvents = eventSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => myRoomIds.includes(e.roomId));

      setOverrideEvents(myEvents);

      // ---------------------------------------------------------
      // Sariling approved reservations — ipapakita sa aktwal na
      // petsa na na-reserve (hindi recurring, hindi tulad ng class
      // schedule)
      // ---------------------------------------------------------

      const reservationSnap = await getDocs(
        collection(db, "reservationRequests")
      );

      const myReservations = reservationSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (r) =>
            (r.userId === firebaseUser.uid ||
              r.createdBy === firebaseUser.uid) &&
            String(r.status || "").toLowerCase() === "approved"
        );

      setReservationEvents(myReservations);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  const baseMonday = new Date(2026, 9, 19); 
  const weekStart  = new Date(baseMonday);
  weekStart.setDate(baseMonday.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const weekLabel = `${months[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.getDate();
  });

  const todayIdx = (() => {

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (now < weekStart || now > weekEnd) return -1;

    return mondayIndexFromDate(now.toISOString().split("T")[0]) - 1;

  })();

  const totalH = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  // -----------------------------------------------------------------
  // I-convert ang 3 sources papunta sa iisang shape na kayang i-render
  // ng calendar grid
  // -----------------------------------------------------------------

  const calendarEvents = useMemo(() => {

    const items = [];

    // ACADEMIC — recurring, base sa araw ng linggo, laging ipinapakita
    scheduleEvents.forEach((s) => {

      const dayIdx = DAYS.indexOf(s.day) + 1;

      if (dayIdx < 1) return;

      const [startH, startM] = parseTimeParts(s.startTime);
      const [endH, endM] = parseTimeParts(s.endTime);

      items.push({
        id: `sched-${s.id}`,
        title: s.subject || "Class",
        location: `${s.roomName || "-"}${s.floor ? ` | ${s.floor}` : ""}`,
        day: dayIdx,
        daySpan: 1,
        startH, startM, endH, endM,
        colorIdx: 0,
      });

    });

    // INSTITUTIONAL (override) — base sa aktwal na petsa, lalabas lang
    // kung nasa loob ng kasalukuyang naka-display na linggo
    overrideEvents.forEach((e) => {

      if (!isWithinWeek(e.date, weekStart, weekEnd)) return;

      const dayIdx = mondayIndexFromDate(e.date);

      const [startH, startM] = parseTimeParts(e.startTime);
      const [endH, endM] = parseTimeParts(e.endTime);

      items.push({
        id: `event-${e.id}`,
        title: e.title || e.purpose || "Room Activity",
        location: `${e.roomName || "-"} | Room Activity`,
        day: dayIdx,
        daySpan: 1,
        startH, startM, endH, endM,
        colorIdx: 1,
      });

    });

    // RESERVATION — sariling reservation, sa aktwal na petsa
    reservationEvents.forEach((r) => {

      if (!isWithinWeek(r.date, weekStart, weekEnd)) return;

      const dayIdx = mondayIndexFromDate(r.date);

      const [startH, startM] = parseTimeParts(r.startTime);
      const [endH, endM] = parseTimeParts(r.endTime);

      items.push({
        id: `resv-${r.id}`,
        title:
          r.customPurpose ||
          r.courseTitle ||
          r.purpose ||
          "Reservation",
        location: `${r.roomName || "-"} | Reservation`,
        day: dayIdx,
        daySpan: 1,
        startH, startM, endH, endM,
        colorIdx: 2,
      });

    });

    return items;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scheduleEvents,
    overrideEvents,
    reservationEvents,
    weekStart.getTime(),
    weekEnd.getTime(),
  ]);

  return (
    <>
    <div className="wc-page">

      <div className="wc-legend">
        {LEGEND.map(l => (
          <div className="wc-legend-item" key={l.label}>
            <span className="wc-legend-dot" style={{ background: l.color }} />
            <span className="wc-legend-label">{l.label}</span>
          </div>
        ))}

        {activeTerm && (
          <div className="wc-legend-term">
            {activeTerm.semester} • {activeTerm.schoolYear}
          </div>
        )}
      </div>

      <div className="wc-card">

        <div className="wc-week-nav">
          <i className="fa-solid fa-chevron-left" onClick={() => setWeekOffset(w => w - 1)} />
          <span className="wc-week-label">{weekLabel}</span>
          <i className="fa-solid fa-chevron-right" onClick={() => setWeekOffset(w => w + 1)} />
        </div>

        <div className="wc-days-header">
          <div className="wc-time-offset" />
          {DAYS.map((d, i) => (
            <div className="wc-day-cell" key={d}>
              <span className="wc-day-name">{d}</span>
              <span className={`wc-day-date ${i === todayIdx ? "today" : ""}`}>
                {dayDates[i]}
              </span>
            </div>
          ))}
        </div>

        <div className="wc-divider" />

        {loading ? (

          <div className="wc-empty-state">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Loading your schedule...</p>
          </div>

        ) : noSchedule ? (

          <div className="wc-empty-state">
            <i className="fa-regular fa-calendar-xmark"></i>
            <p>No class schedule found under your name yet.</p>
          </div>

        ) : (

        <div className="wc-scroll-area">
          <div className="wc-grid" style={{ height: totalH }}>

            <div className="wc-time-col">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div className="wc-time-slot" key={i}>
                  <span>{fmtHour(START_HOUR + i)}</span>
                </div>
              ))}
            </div>

            <div className="wc-events-layer">

              {DAYS.map((_, i) => (
                <div className="wc-day-col" key={i}>
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, j) => (
                    <div className="wc-hour-line" key={j} style={{ top: j * HOUR_HEIGHT }} />
                  ))}
                </div>
              ))}

              {calendarEvents.map(ev => {
                const color   = CARD_COLORS[ev.colorIdx];
                const topPx   = ((ev.startH - START_HOUR) + ev.startM / 60) * HOUR_HEIGHT;
                const heightPx = ((ev.endH - ev.startH) + (ev.endM - ev.startM) / 60) * HOUR_HEIGHT - 4;
                const leftPct  = ((ev.day - 1) / 7) * 100;
                const widthPct = (ev.daySpan / 7) * 100;

                return (
                  <div
                    key={ev.id}
                    className="wc-event"
                    style={{
                      top:             topPx,
                      height:          Math.max(heightPx, 24),
                      left:            `${leftPct}%`,
                      width:           `calc(${widthPct}% - 4px)`,
                      backgroundColor: color.bg,
                      borderLeft:      `4px solid ${color.border}`,
                    }}
                  >
                    <div className="wc-event-top">
                      <span className="wc-event-title" style={{ color: color.text }}>{ev.title}</span>
                      <span className="wc-event-time" style={{ background: color.timeBg, color: color.text }}>
                        {fmtTime(ev.startH, ev.startM)}-{fmtTime(ev.endH, ev.endM)}
                      </span>
                    </div>
                    <span className="wc-event-loc" style={{ color: color.text }}>{ev.location}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        )}
      </div>
    </div>
    </>

  );
}