import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./local-registrar-view-room-card.css";
import { normalizeScheduleItem } from "../../utils/normalizeScheduleItem";
import ScheduleCard from "../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../Components/ClassDetailsCard/ClassDetailsCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

    // ─── load events, reservations, releases, reassignments (unchanged) ───
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

  // ─── Helper functions (unchanged) ──────────────────────────────
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
            <span className="lr-vr-room-name">{room?.roomName}</span>
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

                    // For original, show all schedules (no conflict filtering)
                    let filteredSchedules = daySchedules;
                    if (!isOriginal) {
                      // Filter out released, reassigned‑away, and conflicting events/reservations
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
                        {/* Show events/reservations/reassignments only if not original */}
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
    </>
  );
}

export default LocalRegistrarViewRoomCard;