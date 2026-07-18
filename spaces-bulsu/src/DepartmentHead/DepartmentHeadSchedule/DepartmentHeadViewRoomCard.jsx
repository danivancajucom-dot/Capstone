import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import "./dept-head-view-room-card.css";

import ScheduleCard from "../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../Components/ClassDetailsCard/ClassDetailsCard";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

const DAYS = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

function DepartmentHeadViewRoomCard() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const room = location.state?.room;

  useEffect(() => {
    if (!room) {
      navigate("/department-head/schedule-view-academic-schedule");
    }
  }, [room, navigate]);
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {

    if (!room?.id) return;

    // regular schedules
    const snapshot = await getDocs(
        collection(db, "rooms", room.id, "schedules")
    );

    const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    setSchedules(
        list.filter(item => !item.initialized)
    );

    // room activities
    const eventSnap = await getDocs(
      collection(db, "events")
    );

    const eventList = eventSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(event => event.roomId === room.id);


      // roomrequest
      const reservationSnap = await getDocs(
          collection(db, "reservationRequests")
      );

      const reservationList = reservationSnap.docs
          .map(doc => ({
              id: doc.id,
              ...doc.data()
          }))
          .filter(reservation =>
              reservation.roomId === room.id &&
              reservation.status === "approved"
          );

      setReservations(reservationList);

    setEvents(eventList);
  };

    

  const getSchedulesByDay = (day) => {
    return schedules.filter(
      (schedule) =>
        schedule.day?.trim().toUpperCase() === day
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

    // Monday ang start
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
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    const dateString = `${yyyy}-${mm}-${dd}`;

    return [
        ...events.filter(e => e.date === dateString),
        ...reservations.filter(r => r.date === dateString)
    ];
};

  return (
    <>
      <div className="lr-view-room">
        <i
          className="fa-solid fa-arrow-left lr-back-arrow"
          onClick={() => navigate("/department-head/schedule-view-academic-schedule")}
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
            <span className="room-name">
              {room?.roomName}
            </span>
          </div>

          <div className="days-container">
            {/* Spacer na gumagamit mismo ng "time-column" class (walang
                laman) para GUARANTEED na kaparehas ang lapad nito sa
                .time-column sa ibaba — tumapat ang MON...SUN labels sa
                tamang column ng calendar-grid imbes na sumingit sa
                time axis. Walang bagong CSS na kailangan idagdag. */}
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
 reservations.length === 0 ? (

    <div className="no-schedule">
      <i className="fa-regular fa-calendar-xmark"></i>
      <h3>No schedules available</h3>
      <p>There are no schedules or room activities.</p>
    </div>

  ) : (

    DAYS.map((day, index) => {
                const dateEvents = getItemsForDate(weekDates[index]);

                return (
                  <div className="calendar-day" key={day}>

                    {/* REGULAR SCHEDULE */}
                    {getSchedulesByDay(day)
                      .filter(schedule => {

                        const sStart = convertToMinutes(schedule.startTime);
                        const sEnd = convertToMinutes(schedule.endTime);

                        // itago kapag may room activity na nag-ooverlap
                        return !dateEvents.some(event => {

                          const eStart = convertToMinutes(event.startTime);
                          const eEnd = convertToMinutes(event.endTime);

                          return sStart < eEnd && sEnd > eStart;
                        });

                      })
                      .map(schedule => (

                        <ScheduleCard
                          key={schedule.id}
                          schedule={schedule}
                          top={getTopPosition(schedule.startTime)}
                          height={getCardHeight(
                            schedule.startTime,
                            schedule.endTime
                          )}
                          onClick={() => setSelectedSchedule(schedule)}
                        />

                      ))}

                    {/* ROOM ACTIVITIES */}
                    {dateEvents.map(event => (

                      <ScheduleCard
                        key={event.id}
                        schedule={{
                          ...event,
                          subject:
                              event.title ||
                              event.purpose ||
                              "Walk-in Reservation",

                          faculty:
                              event.title
                                  ? "ROOM ACTIVITY"
                                  : event.requesterName || "Walk-in"
                        }}
                        top={getTopPosition(event.startTime)}
                        height={getCardHeight(
                          event.startTime,
                          event.endTime
                        )}
                        onClick={() => setSelectedSchedule(event)}
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

export default DepartmentHeadViewRoomCard;