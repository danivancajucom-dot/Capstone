import { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import "./clerk-dashboard.css";
import DashboardReleasedRoomCard from "../../Components/DashboardReleasedRoomCard/DashboardReleasedRoomCard";
import UpcomingSchedCard from "../../Components/UpcomingSchedCard/UpcomingSchedCard";
import AvailableRoomCard from "../../Components/AvailableRoomCard/AvailableRoomCard";
import OccupiedRoomCard from "../../Components/OccupiedRoomCard/OccupiedRoomCard";
import MaintenanceRoomCard from "../../Components/MaintenanceRoomCard/MaintenanceRoomCard";
import { useNavigate } from "react-router-dom";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";
import ReleasedRoomsModal from "../../Components/ReleaseRoomModal/ReleasedRoomsModal";

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const ROOMS_PER_PAGE = 9;

const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatLongDate = (d = new Date()) =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const normalize = (v) => String(v || "").trim().toLowerCase();

function ClerkDashboard() {
  const [activeNav, setActiveNav] = useState("all-rooms");
  const [activeBuilding, setActiveBuilding] = useState("All Buildings");
  const [activeFloor, setActiveFloor] = useState("All Floors");
  const [rooms, setRooms] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({});
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [releases, setReleases] = useState([]);
  const [reassignments, setReassignments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(ROOMS_PER_PAGE);
  const [showReleasedModal, setShowReleasedModal] = useState(false);
  const [releaseModalInitial, setReleaseModalInitial] = useState(null);
  const navigate = useNavigate();

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const today = getToday();
  const todayAbbrev = DAY_ABBR[now.getDay()];

  // ─── Listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubRooms = onSnapshot(collection(db, "rooms"), (snapshot) => {
      setRooms(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubEvents = onSnapshot(collection(db, "events"), (snapshot) => {
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubReservations = onSnapshot(
      collection(db, "reservationRequests"),
      (snapshot) => {
        setReservations(
          snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((r) => String(r.status || "").toLowerCase() === "approved")
        );
      }
    );

    const unsubReleases = onSnapshot(
      collection(db, "roomReleases"),
      (snapshot) => {
        setReleases(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubReassignments = onSnapshot(
      collection(db, "roomReassignments"),
      (snapshot) => {
        setReassignments(
          snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
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

  // ─── Per-room class schedules ──────────────────────────────────────────
  useEffect(() => {
    if (rooms.length === 0) return;

    const unsubs = rooms.map((room) =>
      onSnapshot(collection(db, "rooms", room.id, "schedules"), (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => !s.initialized);
        setRoomSchedules((prev) => ({ ...prev, [room.id]: list }));
      })
    );

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.map((r) => r.id).join(",")]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const toMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  // ✅ Map of releases for today, keyed by scheduleId_date
  const releaseMapToday = useMemo(() => {
    const map = new Map();
    releases
      .filter((r) => r.date === today)
      .forEach((r) => map.set(`${r.scheduleId}_${r.date}`, r));
    return map;
  }, [releases, today]);

  const reassignAwayKeysToday = new Set(
    reassignments
      .filter((r) => r.date === today && r.oldRoomId)
      .map((r) => `${r.scheduleId}_${r.date}`)
  );

  const reassignIntoByRoom = reassignments
    .filter((r) => r.date === today && r.newRoomId)
    .reduce((acc, r) => {
      if (!acc[r.newRoomId]) acc[r.newRoomId] = [];
      acc[r.newRoomId].push(r);
      return acc;
    }, {});

  // ─── Compute room status ────────────────────────────────────────────────
  const roomStatus = rooms.map((room) => {
    if (isRoomUnderMaintenance(room, today)) {
      return { ...room, displayStatus: "Maintenance" };
    }

    const roomClasses = (roomSchedules[room.id] || [])
      .filter((s) => s.day === todayAbbrev)
      .map((s) => {
        const key = `${s.id}_${today}`;

        // Reassigned-away → hidden
        if (reassignAwayKeysToday.has(key)) return null;

        // ✅ Release handling
        const releaseInfo = releaseMapToday.get(key);
        let endTime = s.endTime;
        let isReleased = false;
        let releasedAtTime = null;

        if (releaseInfo) {
          // Upcoming release → hidden
          if (!releaseInfo.effectiveEndTime) return null;

          const endMin = toMinutes(releaseInfo.effectiveEndTime);
          const startMin = toMinutes(s.startTime);
          if (endMin <= startMin) return null; // nothing used

          endTime = releaseInfo.effectiveEndTime;
          isReleased = true;
          releasedAtTime = releaseInfo.effectiveEndTime;
        }

        return {
          ...s,
          endTime,
          subject: s.subject,
          roomName: room.roomName,
          facultyName: s.facultyName || s.faculty,
          source: "schedule",
          isReleased,
          releasedAtTime,
        };
      })
      .filter(Boolean);

    const roomEvents = events
      .filter((e) => e.roomId === room.id && e.date === today)
      .map((e) => ({
        ...e,
        subject: e.title || e.purpose || "Room Activity",
        roomName: e.roomName || room.roomName,
        facultyName: e.faculty || "Admin",
        source: "event",
      }));

    const roomReservations = reservations
      .filter((r) => r.roomId === room.id && r.date === today)
      .map((r) => ({
        ...r,
        subject: r.customPurpose || r.courseTitle || r.purpose || "Reservation",
        roomName: r.roomName || room.roomName,
        facultyName: r.requesterName || r.facultyName,
        source: "reservation",
      }));

    const roomReassignInto = (reassignIntoByRoom[room.id] || []).map((r) => ({
      ...r,
      subject: `${r.courseTitle || "Class"} (Moved)`,
      roomName: r.newRoomName || room.roomName,
      facultyName: r.facultyName,
      source: "reassignment",
      startTime: r.startTime,
      endTime: r.endTime,
    }));

    const busy = [
      ...roomClasses,
      ...roomEvents,
      ...roomReservations,
      ...roomReassignInto,
    ];

    const occupied = busy.find(
      (item) =>
        currentMinutes >= toMinutes(item.startTime) &&
        currentMinutes < toMinutes(item.endTime)
    );
    if (occupied) {
      return { ...room, displayStatus: "Occupied", activeBooking: occupied };
    }

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
    default:
      displayedRooms = roomStatus;
  }

  // ─── Dynamic filter options ────────────────────────────────────────────
  const buildingOptions = useMemo(() => {
    const set = new Set(
      rooms.map((r) => (r.building || r.bldg || "").trim()).filter(Boolean)
    );
    return ["All Buildings", ...Array.from(set).sort()];
  }, [rooms]);

  const floorOptions = useMemo(() => {
    const set = new Set(rooms.map((r) => (r.floor || "").trim()).filter(Boolean));
    const sorted = Array.from(set).sort((a, b) => {
      const na = parseInt(a, 10) || 0;
      const nb = parseInt(b, 10) || 0;
      return na - nb;
    });
    return ["All Floors", ...sorted];
  }, [rooms]);

  // Apply building + floor filters
  const filteredRooms = displayedRooms.filter((room) => {
    if (
      activeBuilding !== "All Buildings" &&
      normalize(room.building || room.bldg) !== normalize(activeBuilding)
    ) {
      return false;
    }
    if (
      activeFloor !== "All Floors" &&
      normalize(room.floor) !== normalize(activeFloor)
    ) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    setVisibleCount(ROOMS_PER_PAGE);
  }, [activeNav, activeBuilding, activeFloor]);

  const visibleRooms = filteredRooms.slice(0, visibleCount);
  const hasMoreRooms = filteredRooms.length > visibleCount;

  // ─── Upcoming Schedule ─────────────────────────────────────────────────
  const allClassOccurrencesToday = rooms.flatMap((room) =>
    (roomSchedules[room.id] || [])
      .filter((s) => s.day === todayAbbrev)
      .map((s) => {
        const key = `${s.id}_${today}`;
        if (reassignAwayKeysToday.has(key)) return null;

        const releaseInfo = releaseMapToday.get(key);
        let endTime = s.endTime;
        let isReleased = false;

        if (releaseInfo) {
          if (!releaseInfo.effectiveEndTime) return null;
          const endMin = toMinutes(releaseInfo.effectiveEndTime);
          const startMin = toMinutes(s.startTime);
          if (endMin <= startMin) return null;
          endTime = releaseInfo.effectiveEndTime;
          isReleased = true;
        }

        return {
          id: `${room.id}_${s.id}`,
          startTime: s.startTime,
          endTime,
          subject: s.subject,
          roomName: room.roomName,
          facultyName: s.facultyName || s.faculty,
          source: "schedule",
          date: today,
          isReleased,
        };
      })
      .filter(Boolean)
  );

  const todaysEvents = events
    .filter((e) => e.date === today)
    .map((e) => ({
      id: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
      subject: e.title || e.purpose || "Room Activity",
      roomName: e.roomName,
      facultyName: e.faculty || "Admin",
      source: "event",
      date: today,
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
      date: today,
    }));

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
      date: today,
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

  // ─── Released Rooms ────────────────────────────────────────────────────
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

  const allReleasesWithRoomInfo = releases
    .map((r) => {
      const room = rooms.find((rm) => rm.id === r.roomId);
      return {
        ...r,
        roomName: r.roomName || room?.roomName || "Unknown Room",
        roomImage: room?.image || null,
      };
    })
    .sort((a, b) => {
      const aTime = a.releasedAt?.toMillis ? a.releasedAt.toMillis() : 0;
      const bTime = b.releasedAt?.toMillis ? b.releasedAt.toMillis() : 0;
      return bTime - aTime;
    });

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="clerk-container">
        <div className="clerk-dashboard-header">
          <h1 className="clerk-dashboard-title">Clerk Dashboard</h1>
          <p className="clerk-dashboard-subtitle">
            Monitor real-time room availability, occupancy, and daily schedule across
            the entire CICT department.
          </p>
        </div>

        <div className="clerk-dashboard-boxes">
          <div className="clerk-dashboard-main-box">
            {/* ── Compact toolbar: tabs + filters ── */}
            <div className="clerk-toolbar">
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
              </div>

              <div className="clerk-filters-inline">
                {buildingOptions.length > 1 && (
                  <div className="clerk-select">
                    <i className="fa-solid fa-building"></i>
                    <select
                      value={activeBuilding}
                      onChange={(e) => setActiveBuilding(e.target.value)}
                      aria-label="Filter by building"
                    >
                      {buildingOptions.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-angle-down clerk-select-chev"></i>
                  </div>
                )}

                {floorOptions.length > 1 && (
                  <div className="clerk-select">
                    <i className="fa-solid fa-layer-group"></i>
                    <select
                      value={activeFloor}
                      onChange={(e) => setActiveFloor(e.target.value)}
                      aria-label="Filter by floor"
                    >
                      {floorOptions.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-angle-down clerk-select-chev"></i>
                  </div>
                )}
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
                          onReserve={() => navigate("/clerk/walk-in-reservation")}
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
                      return <OccupiedRoomCard key={room.id} room={room} />;
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
                  <span>Scheduled Rooms Marked as Available</span>
                </div>
                <button
                  className="clerk-view-all-btn"
                  onClick={() => {
                    setReleaseModalInitial(null);
                    setShowReleasedModal(true);
                  }}
                >
                  View All
                </button>
              </div>
              <div className="released-rooms-list">
                {todaysReleases.length === 0 ? (
                  <p className="clerk-upcoming-empty">
                    No scheduled rooms marked as available today.
                  </p>
                ) : (
                  todaysReleases.slice(0, 5).map((release) => (
                    <DashboardReleasedRoomCard
                      key={release.id}
                      room={release.roomName}
                      name={release.faculty || "Unknown"}
                      time={`${release.startTime} - ${
                        release.effectiveEndTime || release.endTime
                      }`}
                      subject={release.subject || "N/A"}
                      ago="Today"
                      image={release.roomImage || "/default-room.png"}
                      onClick={() => {
                        setReleaseModalInitial(release);
                        setShowReleasedModal(true);
                      }}
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

              <div className="clerk-upcoming-date">
                <i className="fa-regular fa-calendar-check"></i>
                {formatLongDate(now)}
              </div>

              {upcomingSchedules.length > 0 ? (
                upcomingSchedules.map((schedule) => (
                  <UpcomingSchedCard key={schedule.id} schedule={schedule} />
                ))
              ) : (
                <p className="clerk-upcoming-empty">
                  No upcoming schedule for today.
                </p>
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

      <ReleasedRoomsModal
        show={showReleasedModal}
        onClose={() => {
          setShowReleasedModal(false);
          setReleaseModalInitial(null);
        }}
        releases={allReleasesWithRoomInfo}
        initialSelected={releaseModalInitial}
      />
    </>
  );
}

export default ClerkDashboard;