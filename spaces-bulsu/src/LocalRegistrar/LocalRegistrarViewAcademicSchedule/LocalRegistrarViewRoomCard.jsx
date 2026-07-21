import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import "./local-registrar-view-room-card.css";
import { normalizeScheduleItem } from "../../utils/normalizeScheduleItem";

import ScheduleCard from "../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../Components/ClassDetailsCard/ClassDetailsCard";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Local date string (YYYY-MM-DD) — avoids UTC shift
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
  const room = location.state?.room;

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

    // ─── REGULAR SCHEDULES ──────────────────────────────────────
    const snapshot = await getDocs(
      collection(db, "rooms", room.id, "schedules")
    );

    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setSchedules(list.filter((item) => !item.initialized));

    // ─── ROOM ACTIVITIES (EVENTS) ──────────────────────────────
    const eventSnap = await getDocs(collection(db, "events"));

    const eventList = eventSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((event) => event.roomId === room.id);

    setEvents(eventList);

    // ─── APPROVED RESERVATIONS (case‑insensitive) ──────────────
    const reservationSnap = await getDocs(
      collection(db, "reservationRequests")
    );

    const reservationList = reservationSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (reservation) =>
          reservation.roomId === room.id &&
          String(reservation.status).toLowerCase() === "approved"
      );

    setReservations(reservationList);

    // ─── RELEASED SCHEDULE OCCURRENCES ─────────────────────────
    const releaseSnap = await getDocs(collection(db, "roomReleases"));

    const keys = new Set(
      releaseSnap.docs
        .map((d) => d.data())
        .filter((r) => r.roomId === room.id)
        .map((r) => `${r.scheduleId}_${r.date}`)
    );

    setReleasedKeys(keys);

    // ─── APPROVED ROOM REASSIGNMENTS ───────────────────────────
    const reassignSnap = await getDocs(collection(db, "roomReassignments"));

    const roomReassignments = reassignSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter(
        (r) =>
          String(r.status || "").toLowerCase() === "approved" &&
          (r.oldRoomId === room.id || r.newRoomId === room.id)
      );

    // Moved out of this room
    setReassignedAwayKeys(
      new Set(
        roomReassignments
          .filter((r) => r.oldRoomId === room.id)
          .map((r) => `${r.scheduleId}_${r.date}`)
      )
    );

    // Moved into this room
    setReassignedInto(
      roomReassignments.filter((r) => r.newRoomId === room.id)
    );
  };

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
    return ((startMinutes - calendarStart) / 60) * HOUR_HEIGHT + 30;
  };

  const getCardHeight = (startTime, endTime) => {
    const startMinutes = convertToMinutes(startTime);
    const endMinutes = convertToMinutes(endTime);
    return ((endMinutes - startMinutes) / 60) * 60;
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
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

    const startMonth = start.toLocaleString("default", {
      month: "long",
    });

    const endMonth = end.toLocaleString("default", {
      month: "long",
    });

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

  return (
    <>
      <div className="lr-view-room">
        <i
          className="fa-solid fa-arrow-left lr-back-arrow"
          onClick={() => navigate("/local-registrar/academic-schedule")}
          style={{ cursor: "pointer" }}
        ></i>

        <div className="white-box-view-room">
          <div className="box-header">
            <div className="week-navigation">
              <i
                className="fa-solid fa-chevron-left"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  const prev = new Date(currentWeek);
                  prev.setDate(prev.getDate() - 7);
                  setCurrentWeek(prev);
                }}
              ></i>
              <span>{formatWeekRange()}</span>
              <i
                className="fa-solid fa-chevron-right"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  const next = new Date(currentWeek);
                  next.setDate(next.getDate() + 7);
                  setCurrentWeek(next);
                }}
              ></i>
            </div>
            <span className="room-name">{room?.roomName}</span>
          </div>

          <div className="days-container">
            <div className="time-column" aria-hidden="true"></div>
            {weekDates.map((date, index) => (
              <div
                className={`day ${isToday(date) ? "today" : ""}`}
                key={index}
              >
                <span className="day-name">{DAYS[index]}</span>
                <span className="day-date">{date.getDate()}</span>
              </div>
            ))}
          </div>

          <hr className="days-divider" />

          <div className="schedule-container">
            <div className="time-column">
              <div className="time-slot">07 AM</div>
              <div className="time-slot">08 AM</div>
              <div className="time-slot">09 AM</div>
              <div className="time-slot">10 AM</div>
              <div className="time-slot">11 AM</div>
              <div className="time-slot">12 PM</div>
              <div className="time-slot">01 PM</div>
              <div className="time-slot">02 PM</div>
              <div className="time-slot">03 PM</div>
              <div className="time-slot">04 PM</div>
              <div className="time-slot">05 PM</div>
              <div className="time-slot">06 PM</div>
              <div className="time-slot">07 PM</div>
              <div className="time-slot">08 PM</div>
            </div>

            <div className="calendar-grid">
              {schedules.length === 0 &&
              events.length === 0 &&
              reservations.length === 0 &&
              reassignedInto.length === 0 ? (
                <div className="no-schedule">
                  <i className="fa-regular fa-calendar-xmark"></i>
                  <h3>No schedules available</h3>
                  <p>There are no schedules or room activities.</p>
                </div>
              ) : (
                DAYS.map((day, index) => {
                  const dateEvents = getItemsForDate(weekDates[index]);
                  const occurrenceDateStr = toDateStr(weekDates[index]);

                  return (
                    <div className="calendar-day" key={day}>
                      {/* REGULAR SCHEDULE — hide released & reassigned‑away */}
                      {getSchedulesByDay(day)
                        .filter((schedule) => {
                          if (
                            releasedKeys.has(
                              `${schedule.id}_${occurrenceDateStr}`
                            )
                          ) {
                            return false;
                          }
                          if (
                            reassignedAwayKeys.has(
                              `${schedule.id}_${occurrenceDateStr}`
                            )
                          ) {
                            return false;
                          }

                          const sStart = convertToMinutes(schedule.startTime);
                          const sEnd = convertToMinutes(schedule.endTime);

                          return !dateEvents.some((event) => {
                            const eStart = convertToMinutes(event.startTime);
                            const eEnd = convertToMinutes(event.endTime);
                            return sStart < eEnd && sEnd > eStart;
                          });
                        })
                        .map((schedule) => (
                          <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            top={getTopPosition(schedule.startTime)}
                            height={getCardHeight(
                              schedule.startTime,
                              schedule.endTime
                            )}
                            onClick={() =>
                              setSelectedSchedule(
                                normalizeScheduleItem(schedule, "schedule")
                              )
                            }
                          />
                        ))}

                      {/* ROOM ACTIVITIES, RESERVATIONS, REASSIGNED‑IN */}
                      {dateEvents.map((event) => (
                        <ScheduleCard
                          key={event.id}
                          schedule={{
                            ...event,
                            subject:
                              event.title ||
                              event.purpose ||
                              event.courseTitle ||
                              (event._source === "reassignment"
                                ? `${event.courseTitle || "Class"} (Moved)`
                                : "Walk-in Reservation"),

                            faculty:
                              event.title
                                ? "ROOM ACTIVITY"
                                : event.requesterName ||
                                  event.facultyName ||
                                  "Walk-in",
                          }}
                          top={getTopPosition(event.startTime)}
                          height={getCardHeight(
                            event.startTime,
                            event.endTime
                          )}
                          onClick={() =>
                            setSelectedSchedule(
                              normalizeScheduleItem(event, event._source)
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

          <div className="class-details-container">
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