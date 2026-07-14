import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import "./public-room-schedule.css";

import ScheduleCard from "../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../Components/ClassDetailsCard/ClassDetailsCard";

import {
  doc,
  getDoc,
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

function PublicRoomSchedule() {

  const { roomId } = useParams();

  const [room, setRoom] = useState(null);

  const [currentWeek, setCurrentWeek] = useState(new Date());

  const [schedules, setSchedules] = useState([]);

  const [events, setEvents] = useState([]);

  const [reservations, setReservations] = useState([]);

  const [selectedSchedule, setSelectedSchedule] =
    useState(null);

  const [status, setStatus] =
    useState("Available");

      const convertToMinutes = (time) => {

    if (!time) return 0;

    if (time.includes("AM") || time.includes("PM")) {

      const [clock, period] = time.split(" ");

      let [hour, minute] =
        clock.split(":").map(Number);

      if (period === "PM" && hour !== 12)
        hour += 12;

      if (period === "AM" && hour === 12)
        hour = 0;

      return hour * 60 + minute;
    }

    const [hour, minute] =
      time.split(":").map(Number);

    return hour * 60 + minute;
  };

  const HOUR_HEIGHT = 60;

  const getTopPosition = (startTime) => {

    const startMinutes =
      convertToMinutes(startTime);

    const calendarStart = 7 * 60;

    return (
      ((startMinutes - calendarStart) / 60) *
        HOUR_HEIGHT +
      30
    );

  };

  const getCardHeight = (
    startTime,
    endTime
  ) => {

    const startMinutes =
      convertToMinutes(startTime);

    const endMinutes =
      convertToMinutes(endTime);

    return (
      ((endMinutes - startMinutes) / 60) *
      HOUR_HEIGHT
    );

  };

  const getStartOfWeek = (date) => {

    const d = new Date(date);

    const day = d.getDay();

    const diff =
      day === 0
        ? -6
        : 1 - day;

    d.setDate(
      d.getDate() + diff
    );

    d.setHours(
      0,
      0,
      0,
      0
    );

    return d;

  };

  const startOfWeek =
    getStartOfWeek(currentWeek);

  const weekDates =
    Array.from(
      { length: 7 },
      (_, i) => {

        const date =
          new Date(startOfWeek);

        date.setDate(
          startOfWeek.getDate() + i
        );

        return date;

      }
    );

  const isToday = (date) => {

    const today = new Date();

    return (

      today.getDate() ===
        date.getDate() &&

      today.getMonth() ===
        date.getMonth() &&

      today.getFullYear() ===
        date.getFullYear()

    );

  };

  const formatWeekRange = () => {

    const start = weekDates[0];

    const end = weekDates[6];

    const startMonth =
      start.toLocaleString(
        "default",
        {
          month: "long",
        }
      );

    const endMonth =
      end.toLocaleString(
        "default",
        {
          month: "long",
        }
      );

    if (
      start.getMonth() ===
      end.getMonth()
    ) {

      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;

    }

    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;

  };

  useEffect(() => {

  loadRoom();

  const interval = setInterval(() => {

    loadRoom();

  }, 60000);

  return () => clearInterval(interval);

}, [roomId]);

const getCurrentDay = () => {

  const days = [
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
  ];

  return days[new Date().getDay()];

};

const loadRoom = async () => {

  if (!roomId) return;

  //----------------------------------
  // ROOM
  //----------------------------------

  const roomSnap = await getDoc(
    doc(db, "rooms", roomId)
  );

  if (!roomSnap.exists()) return;

  const roomData = {
    id: roomSnap.id,
    ...roomSnap.data(),
  };

  setRoom(roomData);

  //----------------------------------
  // REGULAR SCHEDULE
  //----------------------------------

  const scheduleSnap = await getDocs(
    collection(
      db,
      "rooms",
      roomId,
      "schedules"
    )
  );

  const scheduleList =
    scheduleSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

  setSchedules(
    scheduleList.filter(
      item => !item.initialized
    )
  );

  //----------------------------------
  // EVENTS
  //----------------------------------

  const eventSnap = await getDocs(
    collection(db, "events")
  );

  const eventList =
    eventSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        event =>
          event.roomId === roomId
      );

  setEvents(eventList);

  //----------------------------------
  // RESERVATIONS
  //----------------------------------

  const reservationSnap =
    await getDocs(
      collection(
        db,
        "reservationRequests"
      )
    );

  const reservationList =
    reservationSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        reservation =>
          reservation.roomId === roomId &&
          reservation.status ===
            "approved"
      );

  setReservations(
    reservationList
  );

  //----------------------------------
  // STATUS
  //----------------------------------

  const currentMinutes =
    new Date().getHours() * 60 +
    new Date().getMinutes();

  const todayDay =
    getCurrentDay();

  const todayDate =
    new Date()
      .toISOString()
      .split("T")[0];

  let occupied = false;

  scheduleList.forEach(schedule => {

    if (
      schedule.initialized
    ) return;

    if (
      schedule.day
        ?.toUpperCase() !==
      todayDay
    ) return;

    const start =
      convertToMinutes(
        schedule.startTime
      );

    const end =
      convertToMinutes(
        schedule.endTime
      );

    if (
      currentMinutes >= start &&
      currentMinutes < end
    ) {

      occupied = true;

    }

  });

  eventList.forEach(event => {

    if (
      event.date !== todayDate
    ) return;

    const start =
      convertToMinutes(
        event.startTime
      );

    const end =
      convertToMinutes(
        event.endTime
      );

    if (
      currentMinutes >= start &&
      currentMinutes < end
    ) {

      occupied = true;

    }

  });

  reservationList.forEach(
    reservation => {

      if (
        reservation.date !==
        todayDate
      ) return;

      const start =
        convertToMinutes(
          reservation.startTime
        );

      const end =
        convertToMinutes(
          reservation.endTime
        );

      if (
        currentMinutes >= start &&
        currentMinutes < end
      ) {

        occupied = true;

      }

    }
  );

  setStatus(
    occupied
      ? "Occupied"
      : "Available"
  );

};

const getSchedulesByDay = (day) => {

  return schedules.filter(
    schedule =>
      schedule.day
        ?.trim()
        .toUpperCase() === day
  );

};

const getItemsForDate = (date) => {

  const yyyy =
    date.getFullYear();

  const mm =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const dd =
    String(
      date.getDate()
    ).padStart(2, "0");

  const dateString =
    `${yyyy}-${mm}-${dd}`;

  return [

    ...events.filter(
      e => e.date === dateString
    ),

    ...reservations.filter(
      r => r.date === dateString
    ),

  ];

};

return (
  <div className="public-room-page">

    <div className="public-room-header">

      <div>

        <h1>{room?.roomName}</h1>

        <p>
          Scan to instantly view today's room schedule
        </p>

      </div>

      <span
        className={
          status === "Occupied"
            ? "room-status occupied"
            : "room-status available"
        }
      >
        {status}
      </span>

    </div>

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

          <span>

            {formatWeekRange()}

          </span>

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

      </div>

      <div className="days-container">

        {weekDates.map((date, index) => (

          <div
            key={index}
            className={`day ${
              isToday(date) ? "today" : ""
            }`}
          >

            <span className="day-name">

              {DAYS[index]}

            </span>

            <span className="day-date">

              {date.getDate()}

            </span>

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

              <p>

                There are no schedules for this room.

              </p>

            </div>

          ) : (

            DAYS.map((day, index) => {

              const dateItems =
                getItemsForDate(
                  weekDates[index]
                );

              return (

                <div
                  className="calendar-day"
                  key={day}
                >

                  {getSchedulesByDay(day)

                    .filter(schedule => {

                      const sStart =
                        convertToMinutes(
                          schedule.startTime
                        );

                      const sEnd =
                        convertToMinutes(
                          schedule.endTime
                        );

                      return !dateItems.some(item => {

                        const eStart =
                          convertToMinutes(
                            item.startTime
                          );

                        const eEnd =
                          convertToMinutes(
                            item.endTime
                          );

                        return (
                          sStart < eEnd &&
                          sEnd > eStart
                        );

                      });

                    })

                    .map(schedule => (

                      <ScheduleCard

                        key={schedule.id}

                        schedule={schedule}

                        top={getTopPosition(
                          schedule.startTime
                        )}

                        height={getCardHeight(
                          schedule.startTime,
                          schedule.endTime
                        )}

                        onClick={() =>
                          setSelectedSchedule(
                            schedule
                          )
                        }

                      />

                    ))}

                  {dateItems.map(item => (

                    <ScheduleCard

                      key={item.id}

                      schedule={{
                        ...item,

                        subject:
                          item.title ||
                          item.purpose ||
                          "Reservation",

                        faculty:
                          item.title
                            ? "ROOM ACTIVITY"
                            : item.requesterName ||
                              "Reservation",
                      }}

                      top={getTopPosition(
                        item.startTime
                      )}

                      height={getCardHeight(
                        item.startTime,
                        item.endTime
                      )}

                      onClick={() =>
                        setSelectedSchedule(item)
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

          onClose={() =>
            setSelectedSchedule(null)
          }

        />

      </div>

    </div>

  </div>
);

}

export default PublicRoomSchedule;