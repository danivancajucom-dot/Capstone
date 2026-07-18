import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import "./clerk-dashboard.css";
import DashboardReleasedRoomCard from "../../Components/DashboardReleasedRoomCard/DashboardReleasedRoomCard";
import UpcomingSchedCard from "../../Components/UpcomingSchedCard/UpcomingSchedCard";
import AvailableRoomCard from "../../Components/AvailableRoomCard/AvailableRoomCard";
import OccupiedRoomCard from "../../Components/OccupiedRoomCard/OccupiedRoomCard";
import MaintenanceRoomCard from "../../Components/MaintenanceRoomCard/MaintenanceRoomCard";
import ReservedRoomCard from "../../Components/ReservedRoomCard/ReservedRoomCard";
import { useNavigate } from "react-router-dom";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const ROOMS_PER_PAGE = 9;

function ClerkDashboard() {
  const [activeNav, setActiveNav] = useState("all-rooms");
  const [rooms, setRooms] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({}); // { [roomId]: schedule[] }
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [visibleCount, setVisibleCount] = useState(ROOMS_PER_PAGE);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        setRooms(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );

    const unsubEvents = onSnapshot(
      collection(db, "events"),
      (snapshot) => {
        setEvents(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );

    // FIX: dating "reservations" collection ang tinitignan, pero sa
    // buong app, "reservationRequests" talaga ang ginagamit para sa
    // walk-in at faculty reservations. Laging walang laman yung dating
    // "reservations", kaya laging walang Reserved room at walang
    // lumalabas na Upcoming Schedule mula rito.
    const unsubReservations = onSnapshot(
      collection(db, "reservationRequests"),
      (snapshot) => {
        setReservations(
          snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter(
              (r) => String(r.status || "").toLowerCase() === "approved"
            )
        );
      }
    );

    return () => {
      unsubRooms();
      unsubEvents();
      unsubReservations();
    };

  }, []);

  // Per-room class schedule (rooms/{id}/schedules) — kailangan ito
  // para masali ang regular class schedule sa Occupied/Reserved/
  // Upcoming detection. Dati wala talaga nito dito, kaya "Available"
  // pa rin ang lumalabas kahit may klase ngayon.
  useEffect(() => {

    if (rooms.length === 0) return;

    const unsubs = rooms.map((room) =>
      onSnapshot(
        collection(db, "rooms", room.id, "schedules"),
        (snap) => {

          const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => !s.initialized);

          setRoomSchedules((prev) => ({
            ...prev,
            [room.id]: list,
          }));

        }
      )
    );

    return () => unsubs.forEach((u) => u());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.map((r) => r.id).join(",")]);

  const toMinutes = (time) => {
  if (!time) return 0;

  const [h, m] = time.split(":").map(Number);

  return h * 60 + m;
};

const now = new Date();

const currentMinutes =
  now.getHours() * 60 +
  now.getMinutes();

const today =
  new Date().toISOString().split("T")[0];

const todayAbbrev = DAY_ABBR[now.getDay()];

  const roomStatus = rooms.map(room => {

    //-------------------------------------
    // Maintenance
    //-------------------------------------

    if (isRoomUnderMaintenance(room, today)) {

        return {

            ...room,

            displayStatus:"Maintenance"

        };

    }

    //-------------------------------------
    // Today's Schedule — class + room activity + reservation
    //-------------------------------------

    const roomClasses = (roomSchedules[room.id] || [])
      .filter((s) => s.day === todayAbbrev)
      .map((s) => ({
        ...s,
        subject: s.subject,
        roomName: room.roomName,
        facultyName: s.facultyName || s.faculty,
      }));

    const roomEvents = events.filter(e=>

        e.roomId===room.id &&
        e.date===today

    ).map((e) => ({
        ...e,
        subject: e.title || e.purpose || "Room Activity",
        roomName: e.roomName || room.roomName,
        facultyName: e.faculty || "Department Head",
    }));

    //-------------------------------------
    // Approved Reservations
    //-------------------------------------

    const roomReservations = reservations.filter(r=>

        r.roomId===room.id &&
        r.date===today

    ).map((r) => ({
        ...r,
        subject: r.customPurpose || r.courseTitle || r.purpose || "Reservation",
        roomName: r.roomName || room.roomName,
        facultyName: r.requesterName || r.facultyName,
    }));

    const busy=[

        ...roomClasses,

        ...roomEvents,

        ...roomReservations

    ];

    //-------------------------------------
    // Occupied
    //-------------------------------------

    const occupied=busy.find(item=>

        currentMinutes>=toMinutes(item.startTime)&&
        currentMinutes<toMinutes(item.endTime)

    );

    if(occupied){

        return{

            ...room,

            displayStatus:"Occupied",

            activeBooking:occupied

        };

    }

    //-------------------------------------
    // Reserved (may susunod na booking ngayong araw)
    //-------------------------------------

    const upcoming = busy

      .filter(item => toMinutes(item.startTime) > currentMinutes)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))[0];

    if(upcoming){

        return{

            ...room,

            displayStatus:"Reserved",

            activeBooking:upcoming

        };

    }

    //-------------------------------------
    // Available
    //-------------------------------------

    return{

        ...room,

        displayStatus:"Available"

    };

});

  let displayedRooms = [];

  switch(activeNav){

    case "available":

    displayedRooms=

    roomStatus.filter(

    room=>room.displayStatus==="Available"

    );

    break;

    case "occupied":

    displayedRooms=

    roomStatus.filter(

    room=>room.displayStatus==="Occupied"

    );

    break;

    case "maintenance":

    displayedRooms=

    roomStatus.filter(

    room=>room.displayStatus==="Maintenance"

    );

    break;

    case "reserved":

    displayedRooms=

    roomStatus.filter(

    room=>room.displayStatus==="Reserved"

    );

    break;

    default:

    displayedRooms=roomStatus;

    }

  // i-reset ang pagination pag nagpalit ng filter tab
  useEffect(() => {
    setVisibleCount(ROOMS_PER_PAGE);
  }, [activeNav]);

  const visibleRooms = displayedRooms.slice(0, visibleCount);
  const hasMoreRooms = displayedRooms.length > visibleCount;

  // -----------------------------------------------------------------
  // UPCOMING SCHEDULE — kasama na ngayon ang class schedule (base sa
  // araw ng linggo), room activity, at approved reservation. Dati
  // events + yung maling "reservations" collection lang ang
  // pinagmumulan, kaya laging walang laman.
  // -----------------------------------------------------------------

  const allClassOccurrencesToday = rooms.flatMap((room) =>
    (roomSchedules[room.id] || [])
      .filter((s) => s.day === todayAbbrev)
      .map((s) => ({
        id: `${room.id}_${s.id}`,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        roomName: room.roomName,
        facultyName: s.facultyName || s.faculty,
      }))
  );

  const todaysEvents = events
    .filter((e) => e.date === today)
    .map((e) => ({
      id: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
      subject: e.title || e.purpose || "Room Activity",
      roomName: e.roomName,
      facultyName: e.faculty || "Department Head",
    }));

  const todaysReservations = reservations
    .filter((r) => r.date === today)
    .map((r) => ({
      id: r.id,
      startTime: r.startTime,
      endTime: r.endTime,
      subject:
        r.customPurpose ||
        r.courseTitle ||
        r.purpose ||
        "Reservation",
      roomName: r.roomName,
      facultyName: r.requesterName || r.facultyName,
    }));

  const upcomingSchedules = [
    ...allClassOccurrencesToday,
    ...todaysEvents,
    ...todaysReservations,
  ]
    .filter(
      (item) =>
        item.startTime &&
        toMinutes(item.startTime) > currentMinutes
    )
    .sort(
      (a, b) =>
        toMinutes(a.startTime) -
        toMinutes(b.startTime)
    )
    .slice(0, 5);

  return (
    <>
      <div className="container">
      <h1 className="clerk-dashboard-title">Clerk Dashboard</h1>

      <div className="clerk-dashboard-boxes">
        <div className="clerk-dashboard-main-box">
          <div className="clerk-room-nav">
            <div
              className={`clerk-room-nav-item all-rooms ${activeNav === "all-rooms" ? "active" : ""}`}
              onClick={() => setActiveNav("all-rooms")}
            >All Rooms</div>
            <div
              className={`clerk-room-nav-item available ${activeNav === "available" ? "active" : ""}`}
              onClick={() => setActiveNav("available")}
            >Available</div>
            <div
              className={`clerk-room-nav-item occupied ${activeNav === "occupied" ? "active" : ""}`}
              onClick={() => setActiveNav("occupied")}
            >Occupied</div>
            <div
              className={`clerk-room-nav-item maintenance ${activeNav === "maintenance" ? "active" : ""}`}
              onClick={() => setActiveNav("maintenance")}
            >Maintenance</div>
            <div
              className={`clerk-room-nav-item reserved ${activeNav === "reserved" ? "active" : ""}`}
              onClick={() => setActiveNav("reserved")}
            >Reserved</div>
          </div>
           <div className="status-rooms-grid">

              {visibleRooms.length === 0 ? (

                <div className="clerk-empty-rooms">
                  <i className="fa-regular fa-building"></i>
                  <p>No rooms under this filter.</p>
                </div>

              ) : (

              visibleRooms.map(room => {

                switch(room.displayStatus){

                  case "Available":
                    return (
                      <AvailableRoomCard
                        key={room.id}
                        room={room}
                        onReserve={() =>
                          navigate("/clerk/walk-in-reservation")
                        }
                      />
                    );

                  case "Occupied":
                    return (
                      <OccupiedRoomCard
                        key={room.id}
                        room={room}
                        onViewSchedule={() =>
                          navigate("/clerk/schedule-view-academic-schedule")
                        }
                      />
                    );

                  case "Maintenance":
                    return (
                      <MaintenanceRoomCard
                        key={room.id}
                        room={room}
                      />
                    );

                  default:
                    return (
                      <ReservedRoomCard
                        key={room.id}
                        room={room}
                        onViewSchedule={() =>
                          navigate("/clerk/schedule-view-academic-schedule")
                        }
                      />
                    );

                }

              })

              )}

            </div>
            
           {hasMoreRooms && (
            <div className="clerk-load-more">
              <button
                className="clerk-load-more-btn"
                onClick={() =>
                  setVisibleCount((c) => c + ROOMS_PER_PAGE)
                }
              >
                Load More
              </button>
            </div>
           )}
        </div>

        <div className="clerk-dashboard-right">
          <div className="clerk-dashboard-side-box">
            <div className="clerk-side-box-header">
              <div className="clerk-side-box-title">
                <i className="fa-regular fa-circle-check clerk-side-icon"></i>
                <span>Released Rooms</span>
              </div>
              <button className="clerk-view-all-btn">View All</button>
            </div>
            <DashboardReleasedRoomCard/>
          </div>

          <div className="clerk-upcoming-box">
            <div className="clerk-upcoming-header">
              <div className="clerk-upcoming-title">
                <i className="fa-regular fa-calendar clerk-upcoming-icon"></i>
                <span>Upcoming Schedule</span>
              </div>
            </div>

            {upcomingSchedules.length > 0 ? (
              upcomingSchedules.map(schedule => (
                <UpcomingSchedCard
                  key={schedule.id}
                  schedule={schedule}
                />
              ))
            ) : (
              <p className="clerk-upcoming-empty">No upcoming schedule for today.</p>
            )}

            <div className="clerk-upcoming-footer">
              <button
              className="clerk-view-schedule-btn"
              onClick={()=>navigate("/clerk/schedule-view-academic-schedule")}
              >
              View Full Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>

  );
}

export default ClerkDashboard;