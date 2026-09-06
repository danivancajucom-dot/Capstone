import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./clerk-view-academic-schedule.css";
import LRRoomCard from "../../Components/LRRoomCard/LRRoomCard";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../../firebase";

const FLOORS = [
  "All Floors",
  "1st floor",
  "2nd floor",
  "3rd floor",
  "4th floor",
];

// ─── Time helpers ─────────────────────────────────────────────────────
const timeToMinutes = (time) => {
  if (!time) return 0;
  if (!time.includes(" ")) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }
  const [clock, period] = time.trim().split(" ");
  let [hour, minute] = clock.split(":").map(Number);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
};

const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const getCurrentDay = () => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date().getDay()];
};

const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isUnderMaintenance = (roomData) => {
  const roomStatus = String(roomData?.roomStatus || "").trim().toLowerCase();
  return roomStatus === "maintenance";
};

// ─── Latest schedule helpers ─────────────────────────────────────────
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

const getLatestSchedule = (schedules) => {
  if (!schedules || schedules.length === 0) return null;
  return schedules.reduce((best, cur) => {
    const by = schoolYearStart(best.schoolYear);
    const bs = semesterRank(best.semester);
    const cy = schoolYearStart(cur.schoolYear);
    const cs = semesterRank(cur.semester);
    if (cy > by || (cy === by && cs > bs)) return cur;
    return best;
  }, schedules[0]);
};

// ─── Main component ──────────────────────────────────────────────────
function ClerkViewAcademicSchedule() {
  const navigate = useNavigate();
  const [selectedFloor, setSelectedFloor] = useState("All Floors");

  // ─── Real‑time state ───────────────────────────────────────────────
  const [rooms, setRooms] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({});
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [releases, setReleases] = useState([]);
  const [reassignments, setReassignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Pagination ────────────────────────────────────────────────────
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ─── Listeners ─────────────────────────────────────────────────────

  useEffect(() => {
    const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRooms(data);
      setLoading(false);
    });

    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      setEvents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubReservations = onSnapshot(
      collection(db, "reservationRequests"),
      (snap) => {
        const data = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((r) => String(r.status || "").toLowerCase() === "approved");
        setReservations(data);
      }
    );

    const unsubReleases = onSnapshot(collection(db, "roomReleases"), (snap) => {
      setReleases(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubReassignments = onSnapshot(
      collection(db, "roomReassignments"),
      (snap) => {
        const data = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((r) => String(r.status || "").toLowerCase() === "approved");
        setReassignments(data);
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

  // ─── Per‑room schedules listener ──────────────────────────────────
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

  // ─── Reset pagination on floor change ────────────────────────────
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedFloor]);

  // ─── Compute rooms with latest schedule and status ────────────────

  const computedRooms = (() => {
    const today = getToday();
    const currentMinutes = getCurrentMinutes();
    const todayDay = getCurrentDay();

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

    const reassignIntoByRoom = reassignments
      .filter((r) => r.date === today && r.newRoomId)
      .reduce((acc, r) => {
        if (!acc[r.newRoomId]) acc[r.newRoomId] = [];
        acc[r.newRoomId].push(r);
        return acc;
      }, {});

    return rooms
      .map((room) => {
        // Floor filter
        if (selectedFloor !== "All Floors" && room.floor !== selectedFloor) {
          return null;
        }

        const maintenance = isUnderMaintenance(room);
        const schedules = roomSchedules[room.id] || [];
        const latestSchedule = getLatestSchedule(schedules);

        // ── Determine occupancy by checking ALL schedules today ──
        let occupied = false;
        let occupiedUntil = "";
        let currentSchedule = null;

        // 1. Check all schedules for today
        const todaySchedules = schedules.filter(
          (s) =>
            !s.initialized &&
            s.day?.toUpperCase() === todayDay &&
            !releaseKeysToday.has(`${s.id}_${today}`) &&
            !reassignAwayKeysToday.has(`${s.id}_${today}`)
        );

        for (const sched of todaySchedules) {
          const start = timeToMinutes(sched.startTime);
          const end = timeToMinutes(sched.endTime);
          if (currentMinutes >= start && currentMinutes < end) {
            occupied = true;
            occupiedUntil = sched.endTime;
            currentSchedule = sched;
            break;
          }
        }

        // 2. If not occupied, check events
        if (!occupied) {
          const roomEvents = events.filter((e) => e.roomId === room.id && e.date === today);
          for (const e of roomEvents) {
            const start = timeToMinutes(e.startTime);
            const end = timeToMinutes(e.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = e.endTime;
              currentSchedule = e;
              break;
            }
          }
        }

        // 3. If not occupied, check reservations
        if (!occupied) {
          const roomReservations = reservations.filter(
            (r) => r.roomId === room.id && r.date === today
          );
          for (const r of roomReservations) {
            const start = timeToMinutes(r.startTime);
            const end = timeToMinutes(r.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = r.endTime;
              currentSchedule = r;
              break;
            }
          }
        }

        // 4. If not occupied, check reassigned‑in
        if (!occupied) {
          const reassignInto = reassignIntoByRoom[room.id] || [];
          for (const item of reassignInto) {
            const start = timeToMinutes(item.startTime);
            const end = timeToMinutes(item.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = item.endTime;
              currentSchedule = item;
              break;
            }
          }
        }

        const status = maintenance
          ? "Under Maintenance"
          : occupied
          ? "Occupied"
          : "Available";

        return {
          id: room.id,
          ...room,
          status,
          latestSchedule,   // for display (most recent semester/year)
          currentSchedule,  // the actual schedule occupying now
        };
      })
      .filter(Boolean);
  })();

  // ─── Paginate ──────────────────────────────────────────────────────
  const visibleRooms = computedRooms.slice(0, visibleCount);
  const hasMore = visibleCount < computedRooms.length;

  const loadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="clerk-academic-schedule">
      <div>
        <h1>Academic Schedule</h1>
        <p>
          View classroom schedules by room. Shows the latest schedule for each room.
          Status updates automatically in real time.
        </p>
      </div>

      <div className="white-box-rooms">
        {/* Floor filter only */}
        <div className="floor-buttons-lr">
          {FLOORS.map((floor) => (
            <button
              key={floor}
              className={`floor-btn-lr ${selectedFloor === floor ? "active" : ""}`}
              onClick={() => setSelectedFloor(floor)}
            >
              {floor}
            </button>
          ))}
        </div>

        <div className="lr-room-cards">
          {loading ? (
            <div className="room-empty">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <h2>Loading Rooms</h2>
              <p>Please wait while we retrieve available rooms.</p>
            </div>
          ) : computedRooms.length === 0 ? (
            <div className="room-empty">
              <i className="fa-regular fa-building"></i>
              <h2>No Rooms Found</h2>
              <p>No rooms match the selected floor or have schedules.</p>
            </div>
          ) : (
            visibleRooms.map((room) => (
              <LRRoomCard
                key={room.id}
                roomName={room.roomName}
                floor={room.floor}
                capacity={room.capacity}
                roomType={room.roomType}
                status={room.status}
                latestSchedule={room.latestSchedule}
                currentSchedule={room.currentSchedule}
                onClick={() =>
                  navigate("/clerk/schedule-room-card", {
                    state: {
                      roomId: room.id,
                      room,
                    },
                  })
                }
              />
            ))
          )}
        </div>

        {!loading && hasMore && (
          <div className="load-more-schedule">
            <button className="load-more-btn-sched" onClick={loadMore}>
              Load More ({computedRooms.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClerkViewAcademicSchedule;