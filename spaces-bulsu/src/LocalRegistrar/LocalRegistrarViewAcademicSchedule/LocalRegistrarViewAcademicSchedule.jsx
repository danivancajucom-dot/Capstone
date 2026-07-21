import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./local-registrar-view-academic-schedule.css";
import LRRoomCard from "../../Components/LRRoomCard/LRRoomCard";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

const FLOORS = [
  "All Floors",
  "1st floor",
  "2nd floor",
  "3rd floor",
  "4th floor",
];

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

// Local date string (YYYY-MM-DD) – avoids UTC shift
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

function LocalRegistrarViewAcademicSchedule() {
  const navigate = useNavigate();

  const [semester, setSemester] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("All Floors");

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, [semester, schoolYear, selectedFloor]);

  const loadRooms = async () => {
    setLoading(true);

    try {
      const today = getToday();
      const currentMinutes = getCurrentMinutes();
      const todayDay = getCurrentDay();

      // ─── FETCH ALL DATA ──────────────────────────────────────
      const roomSnapshot = await getDocs(collection(db, "rooms"));
      const eventSnapshot = await getDocs(collection(db, "events"));
      const reservationSnapshot = await getDocs(
        collection(db, "reservationRequests")
      );

      // ─── RELEASES ─────────────────────────────────────────────
      const releaseSnap = await getDocs(collection(db, "roomReleases"));
      const releaseMap = new Map(); // roomId -> Set of `${scheduleId}_${date}`
      releaseSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.date !== today) return;
        const key = `${data.scheduleId}_${data.date}`;
        if (!releaseMap.has(data.roomId)) {
          releaseMap.set(data.roomId, new Set());
        }
        releaseMap.get(data.roomId).add(key);
      });

      // ─── REASSIGNMENTS ────────────────────────────────────────
      const reassignSnap = await getDocs(collection(db, "roomReassignments"));
      const reassignAwayMap = new Map(); // roomId -> Set of keys (moved out)
      const reassignIntoMap = new Map(); // roomId -> array of reassign items (moved in)

      reassignSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (String(data.status || "").toLowerCase() !== "approved") return;
        if (data.date !== today) return;

        const key = `${data.scheduleId}_${data.date}`;

        if (data.oldRoomId) {
          if (!reassignAwayMap.has(data.oldRoomId)) {
            reassignAwayMap.set(data.oldRoomId, new Set());
          }
          reassignAwayMap.get(data.oldRoomId).add(key);
        }

        if (data.newRoomId) {
          if (!reassignIntoMap.has(data.newRoomId)) {
            reassignIntoMap.set(data.newRoomId, []);
          }
          reassignIntoMap.get(data.newRoomId).push(data);
        }
      });

      // ─── PROCESS EACH ROOM ──────────────────────────────────
      const filteredRooms = [];

      for (const roomDoc of roomSnapshot.docs) {
        const roomData = roomDoc.data();

        // Floor filter
        if (
          selectedFloor !== "All Floors" &&
          roomData.floor !== selectedFloor
        ) {
          continue;
        }

        // Maintenance check (highest priority)
        const maintenance = isUnderMaintenance(roomData);

        // Fetch schedules for this room
        const scheduleSnapshot = await getDocs(
          collection(db, "rooms", roomDoc.id, "schedules")
        );
        const schedules = scheduleSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Check if any schedule matches the semester/schoolYear filter
        const hasMatchingSchedule = schedules.some((schedule) => {
          const semesterMatch = !semester || schedule.semester === semester;
          const schoolYearMatch = !schoolYear || schedule.schoolYear === schoolYear;
          return semesterMatch && schoolYearMatch;
        });

        // If no matching schedule, skip this room entirely
        if (!hasMatchingSchedule) continue;

        // ─── DETERMINE OCCUPANCY ──────────────────────────────
        let occupied = false;
        let occupiedUntil = "";

        const releasesForRoom = releaseMap.get(roomDoc.id) || new Set();
        const reassignAwayForRoom = reassignAwayMap.get(roomDoc.id) || new Set();

        // 1. Check regular schedules (skip released & reassigned‑away)
        schedules.forEach((schedule) => {
          if (schedule.initialized) return;
          if (schedule.day?.toUpperCase() !== todayDay) return;

          const key = `${schedule.id}_${today}`;
          if (releasesForRoom.has(key)) return;
          if (reassignAwayForRoom.has(key)) return;

          const start = timeToMinutes(schedule.startTime);
          const end = timeToMinutes(schedule.endTime);

          if (currentMinutes >= start && currentMinutes < end) {
            occupied = true;
            occupiedUntil = schedule.endTime;
          }
        });

        // 2. Check events (if not already occupied)
        if (!occupied) {
          const roomEvents = eventSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((event) => event.roomId === roomDoc.id && event.date === today);

          roomEvents.forEach((event) => {
            const start = timeToMinutes(event.startTime);
            const end = timeToMinutes(event.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = event.endTime;
            }
          });
        }

        // 3. Check approved reservations (case‑insensitive)
        if (!occupied) {
          const roomReservations = reservationSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (res) =>
                res.roomId === roomDoc.id &&
                res.date === today &&
                String(res.status).toLowerCase() === "approved"
            );

          roomReservations.forEach((reservation) => {
            const start = timeToMinutes(reservation.startTime);
            const end = timeToMinutes(reservation.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = reservation.endTime;
            }
          });
        }

        // 4. Check reassigned‑in (if not already occupied)
        if (!occupied) {
          const reassignIntoForRoom = reassignIntoMap.get(roomDoc.id) || [];
          reassignIntoForRoom.forEach((item) => {
            const start = timeToMinutes(item.startTime);
            const end = timeToMinutes(item.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = item.endTime;
            }
          });
        }

        // ─── FINAL STATUS ─────────────────────────────────────
        const status = maintenance
          ? "Under Maintenance"
          : occupied
          ? "Occupied"
          : "Available";

        filteredRooms.push({
          id: roomDoc.id,
          ...roomData,
          status,
        });
      }

      setRooms(filteredRooms);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="lr-academic-schedule">
      <div>
        <h1>Academic Schedule</h1>
        <p>
          This page allows the local registrar to view classroom schedules by
          room and filter them by semester, school year, and floor.
        </p>
      </div>

      <div className="white-box-rooms">
        <div className="filters">
          <div className="dropdown-container">
            <select
              className="dropdown"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{ color: semester ? "#000" : "#64748B" }}
            >
              <option value="">Select Semester</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
            <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
          </div>

          <div className="dropdown-container">
            <select
              className="dropdown"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              style={{ color: schoolYear ? "#000" : "#64748B" }}
            >
              <option value="">Select School Year</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
              <option value="2028-2029">2028-2029</option>
            </select>
            <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
          </div>
        </div>

        <div className="floor-buttons">
          {FLOORS.map((floor) => (
            <button
              key={floor}
              className={`floor-btn ${selectedFloor === floor ? "active" : ""}`}
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
          ) : rooms.length === 0 ? (
            <div className="room-empty">
              <i className="fa-regular fa-building"></i>
              <h2>No Rooms Found</h2>
              <p>No rooms match the selected filters or have schedules.</p>
            </div>
          ) : (
            rooms.map((room) => (
              <LRRoomCard
                key={room.id}
                roomName={room.roomName}
                capacity={room.capacity}
                roomType={room.roomType}
                status={room.status}
                onClick={() =>
                  navigate("/local-registrar/room-card", {
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

        {!loading && rooms.length > 0 && (
          <div className="load-more-schedule">
            <button className="load-more-btn-sched">Load More</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LocalRegistrarViewAcademicSchedule;