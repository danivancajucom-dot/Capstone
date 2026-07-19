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
// Helpers (parehong pattern gamit na sa WeeklyCalendar.jsx)
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

// Kinukuha ang PINAKAMALAPIT na susunod na petsa (kasama ang ngayong
// araw) kung kailan matatapat ang recurring "day" ng schedule, base sa
// current time. Ginagamit ito dahil ang class schedule ay
// recurring-weekly lang (walang specific date field).
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

export default function FacultyDashboard({ onLogout }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState(null);
  const [latestSchedules, setLatestSchedules] = useState([]);

  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    loadMySchedule();
  }, []);

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

      const myName = normalizeName(
        `${me.lastName}, ${me.firstName}${me.middleInitial ? ` ${me.middleInitial}` : ""}`
      );

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

      if (matchedSchedules.length === 0) {
        setLatestSchedules([]);
        setActiveTerm(null);
        setLoading(false);
        return;
      }

      // piliin lang ang pinakabagong term (schoolYear + semester)
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

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  const now = new Date();

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayAbbrev = DAY_LABELS[now.getDay()];

  // -----------------------------------------------------------------
  // TODAY'S SCHEDULE — mga klase kung saan ang "day" ay tumutugma sa
  // araw ngayon, pinagsunod-sunod base sa oras
  // -----------------------------------------------------------------

  const todaysSchedule = useMemo(() => {

    return latestSchedules
      .filter((s) => s.day === todayAbbrev)
      .sort((a, b) => {
        const [ah, am] = parseTimeParts(a.startTime);
        const [bh, bm] = parseTimeParts(b.startTime);
        return (ah * 60 + am) - (bh * 60 + bm);
      })
      .map((s) => {

        const [startH, startM] = parseTimeParts(s.startTime);
        const [endH, endM] = parseTimeParts(s.endTime);

        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        const status =
          currentMinutes >= startMin && currentMinutes < endMin
            ? "ONGOING"
            : currentMinutes < startMin
            ? "UPCOMING"
            : "COMPLETED";

        return { ...s, status };

      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestSchedules, todayAbbrev, currentMinutes]);

  // i-clamp ang bannerIndex kapag bumaba ang bilang ng todaysSchedule
  useEffect(() => {
    if (bannerIndex >= todaysSchedule.length) {
      setBannerIndex(0);
    }
  }, [todaysSchedule, bannerIndex]);

  const activeBanner = todaysSchedule[bannerIndex] || null;

  // -----------------------------------------------------------------
  // UPCOMING CLASSES — susunod na occurrence ng bawat schedule (base
  // sa recurring na "day"), simula ngayong sandali, top 5
  // -----------------------------------------------------------------

  const upcomingClasses = useMemo(() => {

    return latestSchedules
      .map((s) => {

        const occurrence = getNextOccurrenceDate(s.day, s.startTime, now);

        if (!occurrence) return null;

        return {
          ...s,
          occurrence,
          dayLabel: DAY_LABELS[occurrence.getDay()],
          dateLabel: occurrence.getDate(),
        };

      })
      .filter(Boolean)
      .sort((a, b) => a.occurrence - b.occurrence)
      .slice(0, 5);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestSchedules]);

  return (
    <>

      <div className="dashboard-shell">
  
        <div className="container">

        {/* MAIN */}
        <main className="dashboard-main">

          {/* RESERVE BUTTON */}
          <div className="reserve-wrapper">
              <button className="reserve-btn" onClick={() => navigate("/faculty/submit-reservation")}> 
              <i className="fa-solid fa-plus"></i>
              Reserve Room
            </button>
          </div>

          {/* TODAY'S SCHEDULE */}
          <section className="today-card">
            <div className="card-header">
              <h2>Today's Schedule</h2>

              <button
                className="see-all-btn"
                onClick={() => navigate("/faculty/schedule")}
              >
                See All
              </button>
            </div>

            {loading ? (

              <div className="schedule-empty">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <p>Loading your schedule...</p>
              </div>

            ) : !activeBanner ? (

              <div className="schedule-empty">
                <i className="fa-regular fa-calendar-check"></i>
                <p>No classes scheduled for today.</p>
              </div>

            ) : (

            <div className="schedule-slider">
              <button
                className="slide-btn left"
                disabled={todaysSchedule.length < 2}
                onClick={() =>
                  setBannerIndex(
                    (i) => (i - 1 + todaysSchedule.length) % todaysSchedule.length
                  )
                }
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
                  {activeBanner.status}
                </span>

                <span className="schedule-time">
                  {formatTime(activeBanner.startTime)} - {formatTime(activeBanner.endTime)}
                </span>

                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop"
                  alt="Classroom"
                />

                <div className="banner-overlay">
                  <h1>{activeBanner.roomName}</h1>
                  <p>
                    {activeBanner.subject}
                    {activeBanner.section ? ` • ${activeBanner.section}` : ""}
                  </p>
                </div>
              </div>

              <button
                className="slide-btn right"
                disabled={todaysSchedule.length < 2}
                onClick={() =>
                  setBannerIndex((i) => (i + 1) % todaysSchedule.length)
                }
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            )}

            {/* UPCOMING */}
            <div className="upcoming-section">
              <h2>Upcoming Classes</h2>

              {!loading && upcomingClasses.length === 0 ? (

                <p className="upcoming-empty">No upcoming classes found.</p>

              ) : (

              <div className="upcoming-list">
                {upcomingClasses.map((item) => (
                  <div className="upcoming-card" key={item.id}>
                    <div className="date-box">
                      <span>{item.dayLabel}</span>
                      <h3>{item.dateLabel}</h3>
                    </div>

                    <h1>{item.subject}</h1>

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
                ))}
              </div>

              )}
            </div>
          </section>
        </main>
      </div>
      </div>
    </>
  );
}