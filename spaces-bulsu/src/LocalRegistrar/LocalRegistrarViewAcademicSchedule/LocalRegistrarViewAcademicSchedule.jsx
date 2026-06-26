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
    const roomSnapshot = await getDocs(collection(db, "rooms"));

    const filteredRooms = [];

    for (const roomDoc of roomSnapshot.docs) {
      const roomData = roomDoc.data();

      // ✅ Floor filter is now from room document
      if (
        selectedFloor !== "All Floors" &&
        roomData.floor !== selectedFloor
      ) {
        continue;
      }

      // Kung walang semester at school year filter,
      // ipakita agad ang room
      if (!semester && !schoolYear) {
        filteredRooms.push({
          id: roomDoc.id,
          ...roomData,
        });
        continue;
      }

      const scheduleSnapshot = await getDocs(
        collection(db, "rooms", roomDoc.id, "schedules")
      );

      const schedules = scheduleSnapshot.docs
        .map((doc) => doc.data())
        .filter((s) => !s.initialized);

      const hasMatchingSchedule = schedules.some((schedule) => {
        const semesterMatch =
          !semester || schedule.semester === semester;

        const schoolYearMatch =
          !schoolYear || schedule.schoolYear === schoolYear;

        return semesterMatch && schoolYearMatch;
      });

      if (hasMatchingSchedule) {
        filteredRooms.push({
          id: roomDoc.id,
          ...roomData,
        });
      }
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
              style={{
                color: semester ? "#000" : "#64748B",
              }}
            >
              <option value="">
                Select Semester
              </option>

              <option value="1st Semester">
                1st Semester
              </option>

              <option value="2nd Semester">
                2nd Semester
              </option>

            </select>

            <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
          </div>

          <div className="dropdown-container">
            <select
              className="dropdown"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              style={{
                color: schoolYear ? "#000" : "#64748B",
              }}
            >
              <option value="">
                Select School Year
              </option>

              <option value="2026-2027">
                2026-2027
              </option>

              <option value="2027-2028">
                2027-2028
              </option>

              <option value="2028-2029">
                2028-2029
              </option>

            </select>

            <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
          </div>

        </div>

        <div className="floor-buttons">

          {FLOORS.map((floor) => (
            <button
              key={floor}
              className={`floor-btn ${
                selectedFloor === floor ? "active" : ""
              }`}
              onClick={() => setSelectedFloor(floor)}
            >
              {floor}
            </button>
          ))}

        </div>

        <div className="lr-room-cards">

          {loading ? (
            <h3>Loading rooms...</h3>
          ) : rooms.length === 0 ? (
            <h3>No rooms found.</h3>
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
            <button className="load-more-btn-sched">
              Load More
            </button>
          </div>
        )}

      </div>

    </div>
  );
}

export default LocalRegistrarViewAcademicSchedule;