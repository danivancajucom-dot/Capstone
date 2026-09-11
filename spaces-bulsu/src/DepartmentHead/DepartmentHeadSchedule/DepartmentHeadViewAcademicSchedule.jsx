import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dept-head-view-academic-schedule.css";
import LRRoomCard from "../../Components/LRRoomCard/LRRoomCard";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

// ─── Helpers ────────────────────────────────────────────────────
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

const getCurrentTime = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

const isUnderMaintenance = (roomData) => {
  const roomStatus = String(roomData?.roomStatus || "").trim().toLowerCase();
  return roomStatus === "maintenance";
};

function DepartmentHeadViewAcademicSchedule() {
  const navigate = useNavigate();

  // ─── Filters ──────────────────────────────────────────────────
  const [semester, setSemester] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("All Buildings");
  const [selectedFloor, setSelectedFloor] = useState("All Floors");
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());

  // ─── Data ─────────────────────────────────────────────────────
  const [allRooms, setAllRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Pagination ──────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ─── Extract unique buildings & floors from room data ───────
  const [buildingOptions, setBuildingOptions] = useState(["All Buildings"]);
  const [floorOptions, setFloorOptions] = useState(["All Floors"]);

  useEffect(() => {
    loadRooms();
  }, [semester, schoolYear, selectedBuilding, selectedFloor, selectedDate, selectedTime]);

  const loadRooms = async () => {
    setLoading(true);

    try {
      const selectedDay = new Date(selectedDate + "T00:00:00")
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      const minutes = timeToMinutes(selectedTime);

      const roomSnapshot = await getDocs(collection(db, "rooms"));
      const eventSnapshot = await getDocs(collection(db, "events"));
      const reservationSnapshot = await getDocs(collection(db, "reservationRequests"));
      const releaseSnap = await getDocs(collection(db, "roomReleases"));
      const reassignSnap = await getDocs(collection(db, "roomReassignments"));

      const releaseMap = new Map();
      releaseSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.date !== selectedDate) return;
        const key = `${data.scheduleId}_${data.date}`;
        if (!releaseMap.has(data.roomId)) {
          releaseMap.set(data.roomId, new Set());
        }
        releaseMap.get(data.roomId).add(key);
      });

      const reassignAwayMap = new Map();
      const reassignIntoMap = new Map();
      reassignSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (String(data.status || "").toLowerCase() !== "approved") return;
        if (data.date !== selectedDate) return;
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

      const processedRooms = [];
      const buildingsSet = new Set();
      const floorsSet = new Set();

      for (const roomDoc of roomSnapshot.docs) {
        const roomData = roomDoc.data();

        if (roomData.building) buildingsSet.add(roomData.building);
        if (roomData.floor) floorsSet.add(roomData.floor);

        const scheduleSnapshot = await getDocs(
          collection(db, "rooms", roomDoc.id, "schedules")
        );
        const schedules = scheduleSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const matchingSchedules = schedules.filter((schedule) => {
          const semesterMatch = !semester || schedule.semester === semester;
          const schoolYearMatch = !schoolYear || schedule.schoolYear === schoolYear;
          return semesterMatch && schoolYearMatch;
        });

        if (matchingSchedules.length === 0) continue;

        let occupied = false;
        let occupiedUntil = "";

        const releasesForRoom = releaseMap.get(roomDoc.id) || new Set();
        const reassignAwayForRoom = reassignAwayMap.get(roomDoc.id) || new Set();

        matchingSchedules.forEach((schedule) => {
          if (schedule.initialized) return;
          if (schedule.day?.toUpperCase() !== selectedDay) return;

          const key = `${schedule.id}_${selectedDate}`;
          if (releasesForRoom.has(key)) return;
          if (reassignAwayForRoom.has(key)) return;

          const start = timeToMinutes(schedule.startTime);
          const end = timeToMinutes(schedule.endTime);
          if (minutes >= start && minutes <= end) {
            occupied = true;
            occupiedUntil = schedule.endTime;
          }
        });

        if (!occupied) {
          const roomEvents = eventSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((event) => event.roomId === roomDoc.id && event.date === selectedDate);

          roomEvents.forEach((event) => {
            const start = timeToMinutes(event.startTime);
            const end = timeToMinutes(event.endTime);
            if (minutes >= start && minutes <= end) {
              occupied = true;
              occupiedUntil = event.endTime;
            }
          });
        }

        if (!occupied) {
          const roomReservations = reservationSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (res) =>
                res.roomId === roomDoc.id &&
                res.date === selectedDate &&
                String(res.status).toLowerCase() === "approved"
            );

          roomReservations.forEach((reservation) => {
            const start = timeToMinutes(reservation.startTime);
            const end = timeToMinutes(reservation.endTime);
            if (minutes >= start && minutes <= end) {
              occupied = true;
              occupiedUntil = reservation.endTime;
            }
          });
        }

        if (!occupied) {
          const reassignIntoForRoom = reassignIntoMap.get(roomDoc.id) || [];
          reassignIntoForRoom.forEach((item) => {
            const start = timeToMinutes(item.startTime);
            const end = timeToMinutes(item.endTime);
            if (minutes >= start && minutes <= end) {
              occupied = true;
              occupiedUntil = item.endTime;
            }
          });
        }

        const maintenance = isUnderMaintenance(roomData);
        const status = maintenance
          ? "Under Maintenance"
          : occupied
          ? "Occupied"
          : "Available";

        processedRooms.push({
          id: roomDoc.id,
          ...roomData,
          status,
          occupiedUntil,
        });
      }

      const uniqueBuildings = ["All Buildings", ...Array.from(buildingsSet).sort()];
      const uniqueFloors = ["All Floors", ...Array.from(floorsSet).sort()];
      setBuildingOptions(uniqueBuildings);
      setFloorOptions(uniqueFloors);

      if (!uniqueBuildings.includes(selectedBuilding)) {
        setSelectedBuilding("All Buildings");
      }
      if (!uniqueFloors.includes(selectedFloor)) {
        setSelectedFloor("All Floors");
      }

      let filtered = processedRooms;
      if (selectedBuilding !== "All Buildings") {
        filtered = filtered.filter((r) => r.building === selectedBuilding);
      }
      if (selectedFloor !== "All Floors") {
        filtered = filtered.filter((r) => r.floor === selectedFloor);
      }

      setAllRooms(processedRooms);
      setFilteredRooms(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  // ─── Clear filters ───────────────────────────────────────────
  const clearFilters = () => {
    setSemester("");
    setSchoolYear("");
    setSelectedBuilding("All Buildings");
    setSelectedFloor("All Floors");
    setSelectedDate(getToday());
    setSelectedTime(getCurrentTime());
  };

  const hasActiveFilters =
    semester ||
    schoolYear ||
    selectedBuilding !== "All Buildings" ||
    selectedFloor !== "All Floors";

  // ─── Pagination calculations ────────────────────────────────
  const totalItems = filteredRooms.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedRooms = filteredRooms.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="lr-academic-schedule">
      <div>
        <h1>Academic Schedule</h1>
        <p>
          View classroom schedules by semester, school year, building, floor,
          and specific date/time.
        </p>
      </div>

      <div className="white-box-rooms">
        {/* ─── FILTERS ─────────────────────────────────────────── */}
        <div className="filters-bar">
          <div className="filters-header">
            <span className="filters-title">
              <i className="fa-solid fa-sliders"></i> Filters
            </span>
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                <i className="fa-solid fa-xmark"></i> Clear filters
              </button>
            )}
          </div>

          <div className="filters">
            <div className="filter-group">
              <label className="filter-label">Semester</label>
              <div className="dropdown-container">
                <select
                  className="dropdown"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  style={{ color: semester ? "#000" : "#64748B" }}
                >
                  <option value="">All Semesters</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                </select>
                <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">School Year</label>
              <div className="dropdown-container">
                <select
                  className="dropdown"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  style={{ color: schoolYear ? "#000" : "#64748B" }}
                >
                  <option value="">All School Years</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                  <option value="2028-2029">2028-2029</option>
                </select>
                <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Building</label>
              <div className="dropdown-container">
                <select
                  className="dropdown"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  {buildingOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Floor</label>
              <div className="dropdown-container">
                <select
                  className="dropdown"
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                >
                  {floorOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Date</label>
              <div className="dropdown-container">
                <input
                  type="date"
                  className="dropdown date-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Time</label>
              <div className="dropdown-container">
                <input
                  type="time"
                  className="dropdown time-input"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── ROOM CARDS ──────────────────────────────────────── */}
        <div className="lr-room-cards">
          {loading ? (
            <div className="room-empty">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <h2>Loading Rooms</h2>
              <p>Please wait while we retrieve available rooms.</p>
            </div>
          ) : paginatedRooms.length === 0 ? (
            <div className="room-empty">
              <i className="fa-regular fa-building"></i>
              <h2>No Rooms Found</h2>
              <p>
                No rooms match the selected filters or have schedules for the
                chosen semester/school year.
              </p>
            </div>
          ) : (
            paginatedRooms.map((room) => (
              <LRRoomCard
                key={room.id}
                roomName={room.roomName}
                floor={room.floor}
                capacity={room.capacity}
                roomType={room.roomType}
                status={room.status}
                onClick={() =>
                  navigate("/department-head/schedule-room-card", {
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

        {/* ─── PAGINATION ──────────────────────────────────────── */}
        {!loading && totalItems > 0 && (
          <div className="pagination-schedule">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-btn ${page === currentPage ? "active" : ""}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>

            <span className="page-info">
              Showing {startIndex + 1}–{endIndex} of {totalItems}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DepartmentHeadViewAcademicSchedule;