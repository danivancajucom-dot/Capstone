import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import "./clerk-dashboard.css";
import DashboardReleasedRoomCard from "../../Components/ReleasedRoomCard/ReleasedRoomCard";
import UpcomingSchedCard from "../../Components/UpcomingSchedCard/UpcomingSchedCard";
import AvailableRoomCard from "../../Components/AvailableRoomCard/AvailableRoomCard";
import OccupiedRoomCard from "../../Components/OccupiedRoomCard/OccupiedRoomCard";
import MaintenanceRoomCard from "../../Components/MaintenanceRoomCard/MaintenanceRoomCard";
import ReservedRoomCard from "../../Components/ReservedRoomCard/ReservedRoomCard";
import { useNavigate } from "react-router-dom";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const ROOMS_PER_PAGE = 9;

// Local date string (YYYY-MM-DD) – avoids UTC shift
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function ClerkDashboard() {
  const [activeNav, setActiveNav] = useState("all-rooms");
  const [rooms, setRooms] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({}); // { [roomId]: schedule[] }
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [releases, setReleases] = useState([]);       // All releases
  const [reassignments, setReassignments] = useState([]); // All reassignments
  const [visibleCount, setVisibleCount] = useState(ROOMS_PER_PAGE);
  const navigate = useNavigate();

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const today = getToday();
  const todayAbbrev = DAY_ABBR[now.getDay()];

  // ─── Listeners ──────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        setRooms(
          snapshot.docs.map((doc) => ({
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
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );

    // Approved reservations (case‑insensitive)
    const unsubReservations = onSnapshot(
      collection(db, "reservationRequests"),
      (snapshot) => {
        setReservations(
          snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((r) => String(r.status || "").toLowerCase() === "approved")
        );
      }
    );

    // ─── RELEASES ──────────────────────────────────────────────────────────
    const unsubReleases = onSnapshot(
      collection(db, "roomReleases"),
      (snapshot) => {
        setReleases(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );

    // ─── REASSIGNMENTS ─────────────────────────────────────────────────────
    const unsubReassignments = onSnapshot(
      collection(db, "roomReassignments"),
      (snapshot) => {
        setReassignments(
          snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((r) => String(r.status || "").toLowerCase() === "approved")
        );
      }
    );

    return () => {
      unsubRooms();
      unsubEvents();
      unsubReservations();
      unsubReleases();
      unsubReassignments();
    };
  }, []);

  // ─── Per‑room class schedules ──────────────────────────────────────────

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
  }, [rooms.map((r) => r.id).join(",")]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const toMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  // Build lookup maps for releases and reassignments for today
  const releaseKeysToday = new Set(
    releases
      .filter((r) => r.date === today)
      .map((r) => `${r.scheduleId}_${r.date}`)
  );

  const reassignAwayKeysToday = new Set(
    reassignments
      .filter((r) => r.date === today && r.oldRoomId)
      .map((r) => `${r.scheduleId}_${r.date}`)
  );

  // For moved‑in: group by newRoomId
  const reassignIntoByRoom = reassignments
    .filter((r) => r.date === today && r.newRoomId)
    .reduce((acc, r) => {
      if (!acc[r.newRoomId]) acc[r.newRoomId] = [];
      acc[r.newRoomId].push(r);
      return acc;
    }, {});

  // ─── Compute room status ────────────────────────────────────────────────

  const roomStatus = rooms.map((room) => {
    // Maintenance check
    if (isRoomUnderMaintenance(room, today)) {
      return { ...room, displayStatus: "Maintenance" };
    }

    // ── Build busy items for today ──

    // 1. Class schedules (filter out released & reassigned‑away)
    const roomClasses = (roomSchedules[room.id] || [])
      .filter((s) => s.day === todayAbbrev)
      .filter((s) => {
        const key = `${s.id}_${today}`;
        return !releaseKeysToday.has(key) && !reassignAwayKeysToday.has(key);
      })
      .map((s) => ({
        ...s,
        subject: s.subject,
        roomName: room.roomName,
        facultyName: s.facultyName || s.faculty,
        source: "schedule",
      }));

    // 2. Events
    const roomEvents = events
      .filter((e) => e.roomId === room.id && e.date === today)
      .map((e) => ({
        ...e,
        subject: e.title || e.purpose || "Room Activity",
        roomName: e.roomName || room.roomName,
        facultyName: e.faculty || "Department Head",
        source: "event",
      }));

    // 3. Approved reservations
    const roomReservations = reservations
      .filter((r) => r.roomId === room.id && r.date === today)
      .map((r) => ({
        ...r,
        subject: r.customPurpose || r.courseTitle || r.purpose || "Reservation",
        roomName: r.roomName || room.roomName,
        facultyName: r.requesterName || r.facultyName,
        source: "reservation",
      }));

    // 4. Reassigned‑in (from other rooms)
    const roomReassignInto = (reassignIntoByRoom[room.id] || []).map((r) => ({
      ...r,
      subject: `${r.courseTitle || "Class"} (Moved)`,
      roomName: r.newRoomName || room.roomName,
      facultyName: r.facultyName,
      source: "reassignment",
      startTime: r.startTime,
      endTime: r.endTime,
    }));

    const busy = [...roomClasses, ...roomEvents, ...roomReservations, ...roomReassignInto];

    // Occupied?
    const occupied = busy.find(
      (item) =>
        currentMinutes >= toMinutes(item.startTime) &&
        currentMinutes < toMinutes(item.endTime)
    );
    if (occupied) {
      return {
        ...room,
        displayStatus: "Occupied",
        activeBooking: occupied,
      };
    }

    // Reserved (upcoming today)?
    const upcoming = busy
      .filter((item) => toMinutes(item.startTime) > currentMinutes)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))[0];
    if (upcoming) {
      return {
        ...room,
        displayStatus: "Reserved",
        activeBooking: upcoming,
      };
    }

    // Available
    return { ...room, displayStatus: "Available" };
  });

  // ─── Filter by active tab ─────────────────────────────────────────────

  let displayedRooms = [];
  switch (activeNav) {
    case "available":
      displayedRooms = roomStatus.filter((r) => r.displayStatus === "Available");
      break;
    case "occupied":
      displayedRooms = roomStatus.filter((r) => r.displayStatus === "Occupied");
      break;
    case "maintenance":
      displayedRooms = roomStatus.filter((r) => r.displayStatus === "Maintenance");
      break;
    case "reserved":
      displayedRooms = roomStatus.filter((r) => r.displayStatus === "Reserved");
      break;
    default:
      displayedRooms = roomStatus;
  }

  // Reset pagination on tab change
  useEffect(() => {
    setVisibleCount(ROOMS_PER_PAGE);
  }, [activeNav]);

  const visibleRooms = displayedRooms.slice(0, visibleCount);
  const hasMoreRooms = displayedRooms.length > visibleCount;

  // ─── Upcoming Schedule (with releases & reassignments filtered) ──────

  // Build upcoming items from all sources
  const allClassOccurrencesToday = rooms.flatMap((room) =>
    (roomSchedules[room.id] || [])
      .filter((s) => s.day === todayAbbrev)
      .filter((s) => {
        const key = `${s.id}_${today}`;
        return !releaseKeysToday.has(key) && !reassignAwayKeysToday.has(key);
      })
      .map((s) => ({
        id: `${room.id}_${s.id}`,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        roomName: room.roomName,
        facultyName: s.facultyName || s.faculty,
        source: "schedule",
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
      source: "event",
    }));

  const todaysReservations = reservations
    .filter((r) => r.date === today)
    .map((r) => ({
      id: r.id,
      startTime: r.startTime,
      endTime: r.endTime,
      subject: r.customPurpose || r.courseTitle || r.purpose || "Reservation",
      roomName: r.roomName,
      facultyName: r.requesterName || r.facultyName,
      source: "reservation",
    }));

  // Reassigned‑in (global)
  const todaysReassignInto = reassignments
    .filter((r) => r.date === today && r.newRoomId)
    .map((r) => ({
      id: r.id,
      startTime: r.startTime,
      endTime: r.endTime,
      subject: `${r.courseTitle || "Class"} (Moved)`,
      roomName: r.newRoomName,
      facultyName: r.facultyName,
      source: "reassignment",
    }));

  const upcomingSchedules = [
    ...allClassOccurrencesToday,
    ...todaysEvents,
    ...todaysReservations,
    ...todaysReassignInto,
  ]
    .filter((item) => item.startTime && toMinutes(item.startTime) > currentMinutes)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    .slice(0, 5);

  // ─── Released Rooms for side panel ─────────────────────────────────────

  // Get today's releases with room details
  const todaysReleases = releases
    .filter((r) => r.date === today)
    .map((r) => {
      const room = rooms.find((rm) => rm.id === r.roomId);
      return {
        ...r,
        roomName: r.roomName || room?.roomName || "Unknown Room",
        roomImage: room?.image || null,
      };
    });

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="container">
        <h1 className="clerk-dashboard-title">Clerk Dashboard</h1>

        <div className="clerk-dashboard-boxes">
          <div className="clerk-dashboard-main-box">
            <div className="clerk-room-nav">
              <div
                className={`clerk-room-nav-item all-rooms ${
                  activeNav === "all-rooms" ? "active" : ""
                }`}
                onClick={() => setActiveNav("all-rooms")}
              >
                All Rooms
              </div>
              <div
                className={`clerk-room-nav-item available ${
                  activeNav === "available" ? "active" : ""
                }`}
                onClick={() => setActiveNav("available")}
              >
                Available
              </div>
              <div
                className={`clerk-room-nav-item occupied ${
                  activeNav === "occupied" ? "active" : ""
                }`}
                onClick={() => setActiveNav("occupied")}
              >
                Occupied
              </div>
              <div
                className={`clerk-room-nav-item maintenance ${
                  activeNav === "maintenance" ? "active" : ""
                }`}
                onClick={() => setActiveNav("maintenance")}
              >
                Maintenance
              </div>
              <div
                className={`clerk-room-nav-item reserved ${
                  activeNav === "reserved" ? "active" : ""
                }`}
                onClick={() => setActiveNav("reserved")}
              >
                Reserved
              </div>
            </div>

            <div className="status-rooms-grid">
              {visibleRooms.length === 0 ? (
                <div className="clerk-empty-rooms">
                  <i className="fa-regular fa-building"></i>
                  <p>No rooms under this filter.</p>
                </div>
              ) : (
                visibleRooms.map((room) => {
                  switch (room.displayStatus) {
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
                      return <MaintenanceRoomCard key={room.id} room={room} />;
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
                  onClick={() => setVisibleCount((c) => c + ROOMS_PER_PAGE)}
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
              <div className="released-rooms-list">
                {todaysReleases.length === 0 ? (
                  <p className="clerk-upcoming-empty">No rooms released today.</p>
                ) : (
                  todaysReleases.slice(0, 5).map((release) => (
                    <DashboardReleasedRoomCard
                      key={release.id}
                      room={release.roomName}
                      name={release.faculty || "Unknown"}
                      time={`${release.startTime} - ${release.endTime}`}
                      subject={release.subject || "N/A"}
                      ago="Today"
                      image={release.roomImage || "/default-room.png"}
                      onClick={() =>
                        navigate("/clerk/schedule-view-academic-schedule")
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="clerk-upcoming-box">
              <div className="clerk-upcoming-header">
                <div className="clerk-upcoming-title">
                  <i className="fa-regular fa-calendar clerk-upcoming-icon"></i>
                  <span>Upcoming Schedule</span>
                </div>
              </div>

              {upcomingSchedules.length > 0 ? (
                upcomingSchedules.map((schedule) => (
                  <UpcomingSchedCard key={schedule.id} schedule={schedule} />
                ))
              ) : (
                <p className="clerk-upcoming-empty">No upcoming schedule for today.</p>
              )}

              <div className="clerk-upcoming-footer">
                <button
                  className="clerk-view-schedule-btn"
                  onClick={() => navigate("/clerk/schedule-view-academic-schedule")}
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