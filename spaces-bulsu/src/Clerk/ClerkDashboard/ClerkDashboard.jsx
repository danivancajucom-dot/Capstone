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



function ClerkDashboard() {
  const [activeNav, setActiveNav] = useState("all-rooms");
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
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

    const unsubReservations = onSnapshot(
      collection(db, "reservations"),
      (snapshot) => {
        setReservations(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );

    return () => {
      unsubRooms();
      unsubEvents();
      unsubReservations();
    };

  }, []);

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

  const roomStatus = rooms.map(room => {

    //-------------------------------------
    // Maintenance
    //-------------------------------------

    if(room.status === "Maintenance"){

        return {

            ...room,

            displayStatus:"Maintenance"

        };

    }

    //-------------------------------------
    // Today's Schedule
    //-------------------------------------

    const roomEvents = events.filter(e=>

        e.roomId===room.id &&
        e.date===today

    );

    //-------------------------------------
    // Approved Reservations
    //-------------------------------------

    const roomReservations = reservations.filter(r=>

        r.roomId===room.id &&
        r.date===today &&
        r.status.toLowerCase()==="approved"

    );

    const busy=[

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
    // Reserved
    //-------------------------------------

    const upcoming=busy.find(item=>

        toMinutes(item.startTime)>currentMinutes

    );

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

  const upcomingSchedules = [...events, ...reservations]
    .filter(item =>
      item.date === today &&
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

              {displayedRooms.map(room => {

                switch(room.displayStatus){

                  case "Available":
                    return (
                      <AvailableRoomCard
                        key={room.id}
                        room={room}
                      />
                    );

                  case "Occupied":
                    return (
                      <OccupiedRoomCard
                        key={room.id}
                        room={room}
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
                      />
                    );

                }

              })}

            </div>
            
           <div className="clerk-load-more">
    <button className="clerk-load-more-btn">Load More</button>
  </div>
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
              <p>No upcoming schedule.</p>
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