import { useState, useEffect } from "react";
import "./faculty-room.css";
import RoomCard from "../../Components/RoomCard/RoomCard";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";

const TABS = ["All", "Available", "Occupied", "Maintenance"];

export default function FacultyRoom() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    loadRooms();
  }, []);

  const convertToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const getToday = () => {
    return new Date().toISOString().split("T")[0];
  };

  const getCurrentDay = () => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[new Date().getDay()];
  };

  const getCurrentTimeString = () => {
    const now = new Date();
    return (
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0")
    );
  };

  const loadRooms = async () => {
    setLoading(true);

    try {
      const today = getToday();
      const currentTimeString = getCurrentTimeString();
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // ─── FETCH ALL DATA ──────────────────────────────────────
      const roomSnapshot = await getDocs(collection(db, "rooms"));
      const eventSnapshot = await getDocs(collection(db, "events"));
      const reservationSnapshot = await getDocs(
        collection(db, "reservationRequests")
      );

      // ─── RELEASES ─────────────────────────────────────────────
      const releaseSnap = await getDocs(collection(db, "roomReleases"));
      const releaseMap = new Map(); // roomId -> Set of scheduleId_date keys
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
      const reassignAwayMap = new Map(); // roomId -> Set of scheduleId_date keys (moved out)
      const reassignIntoMap = new Map(); // roomId -> array of reassign items (moved in)

      reassignSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (String(data.status || "").toLowerCase() !== "approved") return;
        if (data.date !== today) return;

        const key = `${data.scheduleId}_${data.date}`;

        // Moved out of old room
        if (data.oldRoomId) {
          if (!reassignAwayMap.has(data.oldRoomId)) {
            reassignAwayMap.set(data.oldRoomId, new Set());
          }
          reassignAwayMap.get(data.oldRoomId).add(key);
        }

        // Moved into new room
        if (data.newRoomId) {
          if (!reassignIntoMap.has(data.newRoomId)) {
            reassignIntoMap.set(data.newRoomId, []);
          }
          reassignIntoMap.get(data.newRoomId).push(data);
        }
      });

      // ─── PROCESS EACH ROOM ──────────────────────────────────
      const roomList = [];

      for (const roomDoc of roomSnapshot.docs) {
        const room = {
          id: roomDoc.id,
          ...roomDoc.data(),
        };

        // 1. MAINTENANCE CHECK (always highest priority)
        const maintenance = isRoomUnderMaintenance(
          room,
          today,
          currentTimeString,
          currentTimeString
        );

        if (maintenance) {
          roomList.push({
            ...room,
            status: "Maintenance",
            occupiedUntil: "",
          });
          continue;
        }

        let occupied = false;
        let occupiedUntil = "";

        // 2. CHECK REGULAR SCHEDULES (skip released & reassigned‑away)
        const scheduleSnapshot = await getDocs(
          collection(db, "rooms", room.id, "schedules")
        );

        const releasesForRoom = releaseMap.get(room.id) || new Set();
        const reassignAwayForRoom = reassignAwayMap.get(room.id) || new Set();

        scheduleSnapshot.docs.forEach((doc) => {
          const sched = doc.data();
          if (sched.initialized) return;
          if (sched.day !== getCurrentDay()) return;

          const key = `${doc.id}_${today}`;
          if (releasesForRoom.has(key)) return;     // released → skip
          if (reassignAwayForRoom.has(key)) return; // moved out → skip

          const start = convertToMinutes(sched.startTime);
          const end = convertToMinutes(sched.endTime);

          if (currentMinutes >= start && currentMinutes < end) {
            occupied = true;
            occupiedUntil = sched.endTime;
          }
        });

        // 3. CHECK EVENTS (if not already occupied)
        if (!occupied) {
          eventSnapshot.docs.forEach((doc) => {
            const event = doc.data();
            if (event.roomId !== room.id) return;
            if (event.date !== today) return;

            const start = convertToMinutes(event.startTime);
            const end = convertToMinutes(event.endTime);

            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = event.endTime;
            }
          });
        }

        // 4. CHECK APPROVED RESERVATIONS (case‑insensitive)
        if (!occupied) {
          reservationSnapshot.docs.forEach((doc) => {
            const reservation = doc.data();
            if (reservation.roomId !== room.id) return;
            if (String(reservation.status).toLowerCase() !== "approved") return;
            if (reservation.date !== today) return;

            const start = convertToMinutes(reservation.startTime);
            const end = convertToMinutes(reservation.endTime);

            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = reservation.endTime;
            }
          });
        }

        // 5. CHECK REASSIGNED‑IN (if not already occupied)
        if (!occupied) {
          const reassignIntoForRoom = reassignIntoMap.get(room.id) || [];
          reassignIntoForRoom.forEach((item) => {
            const start = convertToMinutes(item.startTime);
            const end = convertToMinutes(item.endTime);

            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = item.endTime;
            }
          });
        }

        roomList.push({
          ...room,
          status: occupied ? "Occupied" : "Available",
          occupiedUntil,
        });
      }

      setRooms(roomList);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const filteredRooms = rooms.filter((room) => {
    if (activeTab === "Available") return room.status === "Available";
    if (activeTab === "Occupied") return room.status === "Occupied";
    if (activeTab === "Maintenance") return room.status === "Maintenance";
    return true;
  });

  return (
    <div className="ra2-page">
      <div className="ra2-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`ra2-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="room-empty">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <h2>Loading Rooms</h2>
          <p>Please wait while we retrieve available rooms.</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="room-empty">
          <i className="fa-regular fa-building"></i>
          <h2>No Rooms Found</h2>
          <p>There are no rooms available under the selected filter.</p>
        </div>
      ) : (
        <div className="room-grid">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onViewSchedule={() =>
                navigate("/faculty/view-room", {
                  state: { room },
                })
              }
              onReserve={() => {
                if (room.status === "Maintenance") return;
                navigate("/faculty/submit-reservation", {
                  state: { room },
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}