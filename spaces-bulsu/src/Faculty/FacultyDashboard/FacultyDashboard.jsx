import React, { useEffect, useMemo, useState } from 'react';
import './faculty-dashboard.css';
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_TO_INDEX = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

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

const parseTimeParts = (time) => {
  const [h, m] = (time || "0:0").split(":").map(Number);
  return [
    Number.isNaN(h) ? 0 : h,
    Number.isNaN(m) ? 0 : m,
  ];
};

const formatTime = (time) => {
  const [h, m] = parseTimeParts(time);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
};

const getNextOccurrenceDate = (dayAbbrev, startTime, now) => {
  const targetDow = DAY_TO_INDEX[dayAbbrev];
  if (targetDow === undefined) return null;

  const [h, m] = parseTimeParts(startTime);
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + i);
    candidate.setHours(h, m, 0, 0);
    if (candidate.getDay() === targetDow && candidate >= now) {
      return candidate;
    }
  }
  return null;
};

const greetingForHour = (h) => {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const greetingIconForHour = (h) => {
  if (h < 12) return "fa-solid fa-sun";
  if (h < 18) return "fa-solid fa-cloud-sun";
  return "fa-solid fa-moon";
};

const formatCountdown = (target, now) => {
  const diffMs = target - now;
  if (diffMs <= 0) return "Starting now";

  const totalMin = Math.round(diffMs / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
};

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// -----------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------
export default function FacultyDashboard({ onLogout }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState(null);
  const [latestSchedules, setLatestSchedules] = useState([]);
  const [facultyName, setFacultyName] = useState("");

  const [releasedKeys, setReleasedKeys] = useState(new Set());
  const [reassignedAwayKeys, setReassignedAwayKeys] = useState(new Set());
  const [reassignedInto, setReassignedInto] = useState([]);
  const [approvedReservations, setApprovedReservations] = useState([]);

  const [bannerIndex, setBannerIndex] = useState(0);

  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadMySchedule();
  }, []);

  // ─── MAIN LOAD FUNCTION (reservations always loaded) ────────────
  const loadMySchedule = async () => {
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
      setFacultyName(me.firstName || "");

      const myName = normalizeName(
        `${me.lastName}, ${me.firstName}${me.middleInitial ? ` ${me.middleInitial}` : ""}`
      );

      // ─── 1. LOAD ACADEMIC SCHEDULES ──────────────────────────
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
            });
          }
        });
      }

      // Set schedules & active term (if any)
      if (matchedSchedules.length > 0) {
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

        const filtered = matchedSchedules.filter(
          (s) =>
            (s.schoolYear || "") === (latest.schoolYear || "") &&
            (s.semester || "") === (latest.semester || "")
        );

        setLatestSchedules(filtered);
        setActiveTerm({
          semester: latest.semester,
          schoolYear: latest.schoolYear,
        });
      } else {
        setLatestSchedules([]);
        setActiveTerm(null);
        // No schedules, but we still load reservations below
      }

      // ─── 2. LOAD RELEASES ──────────────────────────────────
      const releaseSnap = await getDocs(collection(db, "roomReleases"));
      const keys = new Set(
        releaseSnap.docs
          .map((d) => d.data())
          .filter((r) => r.releasedBy === firebaseUser.uid)
          .map((r) => `${r.scheduleId}_${r.date}`)
      );
      setReleasedKeys(keys);

      // ─── 3. LOAD REASSIGNMENTS ─────────────────────────────
      const reassignSnap = await getDocs(collection(db, "roomReassignments"));
      const allReassignments = reassignSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (r) =>
            String(r.status || "").toLowerCase() === "approved" &&
            r.facultyId === firebaseUser.uid
        );

      const awayKeys = new Set(
        allReassignments
          .filter((r) => r.oldRoomId)
          .map((r) => `${r.scheduleId}_${r.date}`)
      );
      setReassignedAwayKeys(awayKeys);
      setReassignedInto(allReassignments);

      // ─── 4. LOAD APPROVED RESERVATIONS (ALWAYS) ────────────
      const reservationSnap = await getDocs(
        collection(db, "reservationRequests")
      );

      const myReservations = reservationSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => {
          const isOwnerById =
            r.userId === firebaseUser.uid ||
            r.createdBy === firebaseUser.uid;
          const isOwnerByName =
            normalizeName(r.requesterName || r.facultyName || "") === myName;
          const isApproved =
            String(r.status || "").toLowerCase() === "approved";
          return (isOwnerById || isOwnerByName) && isApproved;
        });

      setApprovedReservations(myReservations);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── rest of component unchanged ──────────────────────────────────
  // (allItems, todaysItems, upcomingItems, render, etc.)
  // ... (same as before)
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayAbbrev = DAY_LABELS[now.getDay()];
  const todayStr = toDateStr(now);

  const allItems = useMemo(() => {
    const items = [];

    latestSchedules.forEach((s) => {
      const occurrenceDate = getNextOccurrenceDate(s.day, s.startTime, now);
      if (!occurrenceDate) return;
      const dateStr = toDateStr(occurrenceDate);
      const key = `${s.id}_${dateStr}`;
      if (releasedKeys.has(key)) return;
      if (reassignedAwayKeys.has(key)) return;

      items.push({
        id: s.id,
        kind: "schedule",
        subject: s.subject,
        roomName: s.roomName,
        section: s.section,
        startTime: s.startTime,
        endTime: s.endTime,
        day: s.day,
        date: dateStr,
        occurrence: occurrenceDate,
        isToday: dateStr === todayStr,
        isRecurring: true,
        faculty: s.faculty,
      });
    });

    reassignedInto.forEach((r) => {
      const occurrence = new Date(`${r.date}T${r.startTime}:00`);
      if (occurrence < now) return;
      items.push({
        id: r.id,
        kind: "reassignment",
        subject: `${r.courseTitle || "Class"} (Moved)`,
        roomName: r.newRoomName,
        startTime: r.startTime,
        endTime: r.endTime,
        date: r.date,
        occurrence,
        isToday: r.date === todayStr,
        isRecurring: false,
        faculty: r.facultyName || "Faculty",
        originalRoom: r.oldRoomName,
      });
    });

    approvedReservations.forEach((r) => {
      const occurrence = new Date(`${r.date}T${r.startTime}:00`);
      if (occurrence < now) return;
      items.push({
        id: r.id,
        kind: "reservation",
        subject: r.courseTitle || r.purpose || "Reservation",
        roomName: r.roomName,
        startTime: r.startTime,
        endTime: r.endTime,
        date: r.date,
        occurrence,
        isToday: r.date === todayStr,
        isRecurring: false,
        faculty: r.facultyName || "Faculty",
      });
    });

    items.sort((a, b) => a.occurrence - b.occurrence);
    return items;
  }, [
    latestSchedules,
    releasedKeys,
    reassignedAwayKeys,
    reassignedInto,
    approvedReservations,
    now,
    todayStr,
  ]);

  const todaysItems = useMemo(() => {
    return allItems
      .filter((item) => item.isToday)
      .map((item) => {
        const [startH, startM] = parseTimeParts(item.startTime);
        const [endH, endM] = parseTimeParts(item.endTime);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        const status =
          currentMinutes >= startMin && currentMinutes < endMin
            ? "ONGOING"
            : currentMinutes < startMin
            ? "UPCOMING"
            : "COMPLETED";
        return { ...item, status, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }, [allItems, currentMinutes]);

  const upcomingItems = useMemo(() => {
    return allItems.filter((item) => item.occurrence > now).slice(0, 5);
  }, [allItems, now]);

  useEffect(() => {
    if (bannerIndex >= todaysItems.length) {
      setBannerIndex(0);
    }
  }, [todaysItems, bannerIndex]);

  const activeBanner = todaysItems[bannerIndex] || null;

  const ongoingProgress =
    activeBanner?.status === "ONGOING"
      ? Math.min(
          100,
          Math.max(
            0,
            ((currentMinutes - activeBanner.startMin) /
              (activeBanner.endMin - activeBanner.startMin)) *
              100
          )
        )
      : null;

  const roomsThisWeek = useMemo(
    () => new Set(allItems.map((item) => item.roomName)).size,
    [allItems]
  );

  const nextClass = upcomingItems[0] || null;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-shell">
      <div className="container">
        <main className="dashboard-main">
          {/* PAGE HEADER */}
          <div className="dash-header">
            <div className="dash-greeting">
              <div className="dash-greeting-icon">
                <i className={greetingIconForHour(now.getHours())}></i>
              </div>
              <div>
                <h1 className="dash-title">
                  {greetingForHour(now.getHours())}{facultyName ? `, ${facultyName}` : ""}!
                </h1>
                <p className="dash-eyebrow">
                  {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  {activeTerm && (
                    <>
                      {" "}
                      <span className="dash-term-dot">•</span>{" "}
                      {activeTerm.semester || ""} Semester, {activeTerm.schoolYear || ""}
                    </>
                  )}
                </p>
              </div>
            </div>

            <button className="reserve-btn" onClick={() => navigate("/faculty/submit-reservation")}>
              <i className="fa-solid fa-plus"></i>
              Reserve Room
            </button>
          </div>

          {/* STAT CHIPS */}
          {!loading && allItems.length > 0 && (
            <div className="dash-stats-row">
              <div className="dash-stat-chip">
                <i className="fa-solid fa-calendar-day"></i>
                <div>
                  <strong>{todaysItems.length}</strong>
                  <span>class{todaysItems.length === 1 ? "" : "es"} today</span>
                </div>
              </div>

              <div className="dash-stat-chip">
                <i className="fa-solid fa-layer-group"></i>
                <div>
                  <strong>{latestSchedules.length}</strong>
                  <span>meetings / week</span>
                </div>
              </div>

              <div className="dash-stat-chip">
                <i className="fa-solid fa-door-open"></i>
                <div>
                  <strong>{roomsThisWeek}</strong>
                  <span>room{roomsThisWeek === 1 ? "" : "s"} used</span>
                </div>
              </div>

              {nextClass && (
                <div className="dash-stat-chip is-accent">
                  <i className="fa-solid fa-hourglass-half"></i>
                  <div>
                    <strong>{formatCountdown(nextClass.occurrence, now)}</strong>
                    <span>next: {nextClass.subject}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TODAY'S SCHEDULE */}
          <section className="today-card">
            <div className="card-header">
              <div>
                <h2>Today's Schedule</h2>
                <span className="card-subtitle">
                  {todayAbbrev} · {now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </span>
              </div>

              <button
                className="see-all-btn"
                onClick={() => navigate("/faculty/schedule")}
              >
                See All
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>

            {loading ? (
              <div className="schedule-skeleton">
                <div className="skeleton-banner"></div>
                <div className="skeleton-row"></div>
                <div className="skeleton-row short"></div>
              </div>
            ) : !activeBanner ? (
              <div className="schedule-empty">
                <i className="fa-regular fa-calendar-check"></i>
                <p>No classes scheduled for today.</p>
                <span className="schedule-empty-hint">Enjoy the free day, or check your upcoming classes below.</span>
              </div>
            ) : (
              <>
                <div className="schedule-slider">
                  <button
                    className="slide-btn left"
                    disabled={todaysItems.length < 2}
                    onClick={() =>
                      setBannerIndex(
                        (i) => (i - 1 + todaysItems.length) % todaysItems.length
                      )
                    }
                    aria-label="Previous class"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>

                  <div className="schedule-banner">
                    <span
                      className={`ongoing-badge ${
                        activeBanner.status === "ONGOING"
                          ? "status-ongoing"
                          : activeBanner.status === "UPCOMING"
                          ? "status-upcoming"
                          : "status-completed"
                      }`}
                    >
                      <span className="ongoing-dot"></span>
                      {activeBanner.status}
                    </span>

                    <span className="schedule-time">
                      <i className="fa-regular fa-clock"></i>
                      {formatTime(activeBanner.startTime)} - {formatTime(activeBanner.endTime)}
                    </span>

                    <div className="banner-art">
                      <i className="fa-solid fa-chalkboard-user"></i>
                    </div>

                    <div className="banner-overlay">
                      <h1>{activeBanner.roomName}</h1>
                      <p>
                        {activeBanner.subject}
                        {activeBanner.section ? ` • ${activeBanner.section}` : ""}
                        {activeBanner.kind === "reassignment" && (
                          <span className="banner-tag"> (Moved)</span>
                        )}
                        {activeBanner.kind === "reservation" && (
                          <span className="banner-tag"> (Reservation)</span>
                        )}
                      </p>

                      {activeBanner.status === "UPCOMING" && (
                        <span className="banner-countdown">
                          Starts {formatCountdown(
                            new Date(
                              now.getFullYear(),
                              now.getMonth(),
                              now.getDate(),
                              ...parseTimeParts(activeBanner.startTime),
                              0
                            ),
                            now
                          )}
                        </span>
                      )}

                      {ongoingProgress !== null && (
                        <div className="banner-progress-track">
                          <div className="banner-progress-fill" style={{ width: `${ongoingProgress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="slide-btn right"
                    disabled={todaysItems.length < 2}
                    onClick={() =>
                      setBannerIndex((i) => (i + 1) % todaysItems.length)
                    }
                    aria-label="Next class"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>

                {todaysItems.length > 1 && (
                  <div className="schedule-dots">
                    {todaysItems.map((_, i) => (
                      <button
                        key={i}
                        className={`schedule-dot ${i === bannerIndex ? "active" : ""}`}
                        onClick={() => setBannerIndex(i)}
                        aria-label={`Go to class ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* UPCOMING */}
            <div className="upcoming-section">
              <h2>Upcoming Classes</h2>

              {loading ? (
                <div className="upcoming-list">
                  <div className="skeleton-card"></div>
                  <div className="skeleton-card"></div>
                </div>
              ) : upcomingItems.length === 0 ? (
                <div className="upcoming-empty">
                  <i className="fa-regular fa-calendar"></i>
                  No upcoming classes found.
                </div>
              ) : (
                <div className="upcoming-list">
                  {upcomingItems.map((item) => (
                    <div className={`upcoming-card ${item.isToday ? "is-today" : ""}`} key={item.id}>
                      <div className="date-box">
                        <span>{DAY_LABELS[item.occurrence.getDay()]}</span>
                        <h3>{item.occurrence.getDate()}</h3>
                      </div>

                      <div className="upcoming-main">
                        <div className="upcoming-heading">
                          <h1>
                            {item.subject}
                            {item.kind === "reassignment" && (
                              <span className="upcoming-tag"> (Moved)</span>
                            )}
                            {item.kind === "reservation" && (
                              <span className="upcoming-tag"> (Reservation)</span>
                            )}
                          </h1>
                          {item.isToday && <span className="today-chip">Today</span>}
                        </div>

                        {item.section && <span className="upcoming-section-label">{item.section}</span>}

                        <div className="class-info">
                          <span>
                            <i className="fa-regular fa-building"></i>
                            {item.roomName}
                          </span>

                          <span>
                            <i className="fa-regular fa-clock"></i>
                            {formatTime(item.startTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}