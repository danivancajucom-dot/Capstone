import { useEffect, useMemo, useState } from "react";
import "./faculty-schedule.css";
import ReleaseRoomModal from "../../Components/ReleaseRoomModal/ReleaseRoomModal";
import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";
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

// Gumagamit ng LOCAL na date parts (hindi toISOString/UTC) — dahil
// kung UTC ang gagamitin, sa mga timezone na nasa unahan ng UTC
// (gaya ng Philippines, UTC+8), maaaring lumipat pababa ng isang
// araw ang resulta (hal. local midnight ng July 19 ay July 18,
// 4PM pa lang sa UTC).
const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const todayStr = () => toDateStr(new Date());

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

function fmt12Hour(time) {
  const [h, m] = parseTimeParts(time);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Status + natitirang oras ng isang schedule occurrence, base sa
// specific na petsa nito (hindi lang sa "day")
const computeStatus = (dateStr, startTime, endTime) => {

  const today = todayStr();

  if (dateStr < today) return { status: "COMPLETED", remainingMinutes: 0 };
  if (dateStr > today) return { status: "UPCOMING", remainingMinutes: 0 };

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = parseTimeParts(startTime);
  const [eh, em] = parseTimeParts(endTime);

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (nowMin >= startMin && nowMin < endMin) {
    return { status: "ONGOING", remainingMinutes: endMin - nowMin };
  }

  if (nowMin < startMin) return { status: "UPCOMING", remainingMinutes: 0 };

  return { status: "COMPLETED", remainingMinutes: 0 };

};

const notifyReleaseRoom = async ({
  facultyId,
  facultyName,
  roomName,
  subject,
  date,
  startTime,
  endTime,
}) => {
  try {
    const usersSnap = await getDocs(collection(db, "users"));

    const notifications = [];

    usersSnap.forEach((userDoc) => {
      const user = userDoc.data();

      const role = String(user.role || "").toLowerCase();

      // Notify Department Head and Clerk
      if (role === "department head" || role === "clerk") {
        notifications.push(
          addDoc(collection(db, "notifications"), {
            userId: userDoc.id,
            ownerType: role,
            title: "Room Released",
            message: `${facultyName} released ${roomName} for ${subject}.`,
            type: "room-release",
            roomName,
            subject,
            date,
            startTime,
            endTime,
            isRead: false,
            createdAt: serverTimestamp(),
          })
        );
      }
    });

    // Notify the faculty himself
    notifications.push(
      addDoc(collection(db, "notifications"), {
        userId: facultyId,
        ownerType: "faculty",
        title: "Room Released",
        message: `You successfully released ${roomName} (${subject}).`,
        type: "room-release",
        roomName,
        subject,
        date,
        startTime,
        endTime,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    );

    await Promise.all(notifications);
  } catch (err) {
    console.error("Notification Error:", err);
  }
};

export default function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [noSchedule, setNoSchedule] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null); // { semester, schoolYear }

  const [scheduleEvents, setScheduleEvents] = useState([]);   // Academic (recurring, by day)
  const [overrideEvents, setOverrideEvents] = useState([]);   // Institutional (by date)
  const [reservationEvents, setReservationEvents] = useState([]); // Reservation (by date)

  const [releasedKeys, setReleasedKeys] = useState(new Set()); // `${scheduleId}_${date}`

  const [releaseTarget, setReleaseTarget] = useState(null);
  const [submittingRelease, setSubmittingRelease] = useState(false);

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
              image: room.image || null,
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
      // klase ang faculty
      // ---------------------------------------------------------

      const eventSnap = await getDocs(collection(db, "events"));

      const myEvents = eventSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => myRoomIds.includes(e.roomId));

      setOverrideEvents(myEvents);

      // ---------------------------------------------------------
      // Sariling approved reservations
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

      // ---------------------------------------------------------
      // Mga na-release na schedule occurrences (para itago sila sa
      // kanilang specific na petsa)
      // ---------------------------------------------------------

      const releaseQ = query(
        collection(db, "roomReleases"),
        where("releasedBy", "==", firebaseUser.uid)
      );

      const releaseSnap = await getDocs(releaseQ);

      const keys = new Set(
        releaseSnap.docs.map((d) => {
          const r = d.data();
          return `${r.scheduleId}_${r.date}`;
        })
      );

      setReleasedKeys(keys);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  // Kinukuha ang Monday ng KASALUKUYANG linggo base sa totoong petsa
  // ngayon.
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const diff = day === 0 ? -6 : 1 - day; // Monday ang simula
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const baseMonday = getStartOfWeek(new Date());
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

    return mondayIndexFromDate(toDateStr(now)) - 1;

  })();

  const totalH = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  // -----------------------------------------------------------------
  // I-convert ang 3 sources papunta sa iisang shape na kayang i-render
  // ng calendar grid — itinatago rin dito ang mga na-release na
  // schedule occurrence (base sa specific na petsa lang, hindi sa
  // buong recurring schedule)
  // -----------------------------------------------------------------

  const calendarEvents = useMemo(() => {

    const items = [];

    // ACADEMIC — recurring, base sa araw ng linggo
    scheduleEvents.forEach((s) => {

      const dayIdx = DAYS.indexOf(s.day) + 1;

      if (dayIdx < 1) return;

      const occurrenceDate = new Date(weekStart);
      occurrenceDate.setDate(weekStart.getDate() + (dayIdx - 1));
      const occurrenceDateStr = toDateStr(occurrenceDate);

      // itago kung na-release na ang occurrence na ito sa petsang ito
      if (releasedKeys.has(`${s.id}_${occurrenceDateStr}`)) return;

      const [startH, startM] = parseTimeParts(s.startTime);
      const [endH, endM] = parseTimeParts(s.endTime);

      items.push({
        id: `sched-${s.id}-${occurrenceDateStr}`,
        kind: "schedule",
        scheduleId: s.id,
        roomId: s.roomId,
        roomName: s.roomName,
        image: s.image,
        subject: s.subject,
        section: s.section,
        day: s.day,
        date: occurrenceDateStr,
        rawStartTime: s.startTime,
        rawEndTime: s.endTime,
        title: s.subject || "Class",
        location: `${s.roomName || "-"}${s.floor ? ` | ${s.floor}` : ""}`,
        dayIdx,
        daySpan: 1,
        startH, startM, endH, endM,
        colorIdx: 0,
      });

    });

    // INSTITUTIONAL (override) — base sa aktwal na petsa
    overrideEvents.forEach((e) => {

      if (!isWithinWeek(e.date, weekStart, weekEnd)) return;

      const dayIdx = mondayIndexFromDate(e.date);

      const [startH, startM] = parseTimeParts(e.startTime);
      const [endH, endM] = parseTimeParts(e.endTime);

      items.push({
        id: `event-${e.id}`,
        kind: "event",
        title: e.title || e.purpose || "Room Activity",
        location: `${e.roomName || "-"} | Room Activity`,
        dayIdx,
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
        kind: "reservation",
        title:
          r.customPurpose ||
          r.courseTitle ||
          r.purpose ||
          "Reservation",
        location: `${r.roomName || "-"} | Reservation`,
        dayIdx,
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
    releasedKeys,
    weekStart.getTime(),
    weekEnd.getTime(),
  ]);

  // -----------------------------------------------------------------
  // RELEASE ROOM
  // -----------------------------------------------------------------

  const openReleaseModal = (ev) => {

    if (ev.kind !== "schedule") return;

    const { status, remainingMinutes } = computeStatus(
      ev.date,
      ev.rawStartTime,
      ev.rawEndTime
    );

    setReleaseTarget({
      scheduleId: ev.scheduleId,
      roomId: ev.roomId,
      roomName: ev.roomName,
      image: ev.image,
      subject: ev.subject,
      section: ev.section,
      day: ev.day,
      date: ev.date,
      startTime: ev.rawStartTime,
      endTime: ev.rawEndTime,
      startTimeLabel: fmt12Hour(ev.rawStartTime),
      endTimeLabel: fmt12Hour(ev.rawEndTime),
      status,
      remainingMinutes,
    });

  };

  const handleConfirmRelease = async ({ reason, details }) => {

    if (!releaseTarget) return;

    setSubmittingRelease(true);

    try {

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) return;

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      const me = userSnap.exists() ? userSnap.data() : {};

      const fullName = `${me.firstName || ""} ${me.lastName || ""}`.trim();

      await addDoc(collection(db, "roomReleases"), {

        scheduleId: releaseTarget.scheduleId,
        roomId: releaseTarget.roomId,
        roomName: releaseTarget.roomName,

        date: releaseTarget.date,
        day: releaseTarget.day,

        subject: releaseTarget.subject || "",
        section: releaseTarget.section || "",

        startTime: releaseTarget.startTime,
        endTime: releaseTarget.endTime,

        faculty: fullName,
        releasedBy: firebaseUser.uid,
        releasedByName: fullName,

        reason,
        details: details || "",

        status: "released",
        releasedAt: serverTimestamp(),

      });

      await notifyReleaseRoom({
        facultyId: firebaseUser.uid,
        facultyName: fullName,
        roomName: releaseTarget.roomName,
        subject: releaseTarget.subject,
        date: releaseTarget.date,
        startTime: releaseTarget.startTime,
        endTime: releaseTarget.endTime,
      });

      // NOTE: gumagamit ng "releaseTarget" (hindi "target" — wala
      // talagang variable na ganon, ito yung dating bug na
      // nagdudulot ng ReferenceError pagkatapos ng successful na
      // addDoc, kaya hindi na-reach yung setReleasedKeys sa ibaba)
      try {

        await logActivity({
            user: fullName || auth.currentUser.displayName || "Faculty",
            userId: firebaseUser.uid,
            role: "Faculty",

            action: "Released Room",
            actionType: "UPDATE",

            target: `${releaseTarget.roomName} | ${releaseTarget.subject || ""}`,

            status: "SUCCESS",
        });

      } catch (logErr) {

        // hindi dapat ma-block ang buong release kung mag-fail lang
        // ang activity log
        console.error("logActivity failed:", logErr);

      }

      // itago agad sa calendar nang hindi na kailangan mag full-reload
      setReleasedKeys((prev) => {
        const next = new Set(prev);
        next.add(`${releaseTarget.scheduleId}_${releaseTarget.date}`);
        return next;
      });

      setReleaseTarget(null);

    } catch (err) {

      console.error(err);
      alert("Failed to release room. Please try again.");

    } finally {

      setSubmittingRelease(false);

    }

  };

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
                const leftPct  = ((ev.dayIdx - 1) / 7) * 100;
                const widthPct = (ev.daySpan / 7) * 100;
                const clickable = ev.kind === "schedule";

                return (
                  <div
                    key={ev.id}
                    className={`wc-event ${clickable ? "wc-event--clickable" : ""}`}
                    onClick={clickable ? () => openReleaseModal(ev) : undefined}
                    style={{
                      top:             topPx,
                      height:          Math.max(heightPx, 24),
                      left:            `${leftPct}%`,
                      width:           `calc(${widthPct}% - 4px)`,
                      backgroundColor: color.bg,
                      borderLeft:      `4px solid ${color.border}`,
                      cursor:          clickable ? "pointer" : "default",
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

    <ReleaseRoomModal
      target={releaseTarget}
      onClose={() => setReleaseTarget(null)}
      onConfirm={handleConfirmRelease}
      submitting={submittingRelease}
    />
    </>

  );
}