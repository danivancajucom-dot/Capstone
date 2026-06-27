import { useState, useEffect } from "react";
import "./faculty-room.css";
import RoomCard from "../../Components/RoomCard/RoomCard";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

const TABS = ["All", "Available", "Occupied"];

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

  const loadRooms = async () => {
    setLoading(true);

    try {
      const roomSnapshot = await getDocs(
        collection(db, "rooms")
      );

      const eventSnapshot = await getDocs(
        collection(db, "events")
      );

      const roomList = [];

      const now = new Date();

      const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

      for (const roomDoc of roomSnapshot.docs) {

        const room = {
          id: roomDoc.id,
          ...roomDoc.data(),
        };

        let occupied = false;
        let occupiedUntil = "";

        // CHECK SCHEDULES
        const scheduleSnapshot = await getDocs(
          collection(
            db,
            "rooms",
            room.id,
            "schedules"
          )
        );

        scheduleSnapshot.docs.forEach((doc) => {

          const sched = doc.data();

          if (sched.initialized) return;

          if (sched.day !== getCurrentDay()) return;

          const start = convertToMinutes(
            sched.startTime
          );

          const end = convertToMinutes(
            sched.endTime
          );

          if (
            currentMinutes >= start &&
            currentMinutes < end
          ) {
            occupied = true;
            occupiedUntil = sched.endTime;
          }

        });

        // CHECK EVENTS
        eventSnapshot.docs.forEach((doc) => {

          const event = doc.data();

          if (event.roomId !== room.id) return;

          if (event.date !== getToday()) return;

          const start = convertToMinutes(
            event.startTime
          );

          const end = convertToMinutes(
            event.endTime
          );

          if (
            currentMinutes >= start &&
            currentMinutes < end
          ) {
            occupied = true;
            occupiedUntil = event.endTime;
          }

        });

        roomList.push({
          ...room,
          status: occupied
            ? "Occupied"
            : "Available",
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

    if (activeTab === "Available")
      return room.status === "Available";

    if (activeTab === "Occupied")
      return room.status === "Occupied";

    return true;

  });

  return (
    <div className="ra2-page">

      <div className="ra2-tabs">

        {TABS.map((tab) => (
          <button
            key={tab}
            className={`ra2-tab ${
              activeTab === tab ? "active" : ""
            }`}
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

            <p>
                There are no rooms available under the selected filter.
            </p>
        </div>

      ) : (

        <div className="room-grid">

          {filteredRooms.map((room) => (

            <RoomCard
                key={room.id}
                room={room}
                onViewSchedule={() =>
                    navigate("/faculty/view-room", {
                        state: {
                            room,
                        },
                    })
                }
                onReserve={() =>
                    navigate("/faculty/submit-reservation", {
                        state: { room }
                    })
                }
            />

          ))}

        </div>

      )}

    </div>
  );
}