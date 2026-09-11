import { useState, useEffect } from "react";
import "./faculty-room.css";
import RoomCard from "../../Components/RoomCard/RoomCard";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";

const TABS = ["All", "Available", "Occupied", "Maintenance"];

// Helpers
const convertToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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

const getDayFromDate = (dateStr) => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date(dateStr + "T00:00:00").getDay()];
};

export default function FacultyRoom() {
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());
  const [selectedBuilding, setSelectedBuilding] = useState("All Buildings");
  const [selectedFloor, setSelectedFloor] = useState("All Floors");
  const [buildingOptions, setBuildingOptions] = useState(["All Buildings"]);
  const [floorOptions, setFloorOptions] = useState(["All Floors"]);
  
  useEffect(() => {
    loadRooms();
  }, [selectedDate, selectedTime, selectedBuilding, selectedFloor]);
  
  const loadRooms = async () => {
    setLoading(true);
    
    try {
      const currentTimeString = selectedTime;
      const currentMinutes = convertToMinutes(selectedTime);
      const selectedDay = getDayFromDate(selectedDate);
      
      // Fetch all data
      const roomSnapshot = await getDocs(collection(db, "rooms"));
      const eventSnapshot = await getDocs(collection(db, "events"));
      const reservationSnapshot = await getDocs(collection(db, "reservationRequests"));
      const releaseSnap = await getDocs(collection(db, "roomReleases"));
      const reassignSnap = await getDocs(collection(db, "roomReassignments"));
      
      // Releases
      const releaseMap = new Map();
      releaseSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.date !== selectedDate) return;
        const key = `${data.scheduleId}_${data.date}`;
        if (!releaseMap.has(data.roomId)) releaseMap.set(data.roomId, new Set());
        releaseMap.get(data.roomId).add(key);
      });
      
      // Reassignments
      const reassignAwayMap = new Map();
      const reassignIntoMap = new Map();
      reassignSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (String(data.status || "").toLowerCase() !== "approved") return;
        if (data.date !== selectedDate) return;
        const key = `${data.scheduleId}_${data.date}`;
        if (data.oldRoomId) {
          if (!reassignAwayMap.has(data.oldRoomId)) reassignAwayMap.set(data.oldRoomId, new Set());
          reassignAwayMap.get(data.oldRoomId).add(key);
        }
        if (data.newRoomId) {
          if (!reassignIntoMap.has(data.newRoomId)) reassignIntoMap.set(data.newRoomId, []);
          reassignIntoMap.get(data.newRoomId).push(data);
        }
      });
      
      const roomList = [];
      const buildingsSet = new Set();
      const floorsSet = new Set();
      
      for (const roomDoc of roomSnapshot.docs) {
        const room = { id: roomDoc.id, ...roomDoc.data() };
        
        if (room.building) buildingsSet.add(room.building);
        if (room.floor) floorsSet.add(room.floor);
        
        // Maintenance check
        const maintenance = isRoomUnderMaintenance(room, selectedDate, currentTimeString, currentTimeString);
        if (maintenance) {
          roomList.push({ ...room, status: "Maintenance", occupiedUntil: "" });
          continue;
        }
        
        let occupied = false;
        let occupiedUntil = "";
        
        // Check schedules
        const scheduleSnapshot = await getDocs(collection(db, "rooms", room.id, "schedules"));
        const releasesForRoom = releaseMap.get(room.id) || new Set();
        const reassignAwayForRoom = reassignAwayMap.get(room.id) || new Set();
        
        scheduleSnapshot.docs.forEach((doc) => {
          const sched = doc.data();
          if (sched.initialized) return;
          if (sched.day !== selectedDay) return;
          
          const key = `${doc.id}_${selectedDate}`;
          if (releasesForRoom.has(key)) return;
          if (reassignAwayForRoom.has(key)) return;
          
          const start = convertToMinutes(sched.startTime);
          const end = convertToMinutes(sched.endTime);
          if (currentMinutes >= start && currentMinutes < end) {
            occupied = true;
            occupiedUntil = sched.endTime;
          }
        });
        
        // Events
        if (!occupied) {
          eventSnapshot.docs.forEach((doc) => {
            const event = doc.data();
            if (event.roomId !== room.id) return;
            if (event.date !== selectedDate) return;
            const start = convertToMinutes(event.startTime);
            const end = convertToMinutes(event.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = event.endTime;
            }
          });
        }
        
        // Reservations
        if (!occupied) {
          reservationSnapshot.docs.forEach((doc) => {
            const reservation = doc.data();
            if (reservation.roomId !== room.id) return;
            if (String(reservation.status).toLowerCase() !== "approved") return;
            if (reservation.date !== selectedDate) return;
            const start = convertToMinutes(reservation.startTime);
            const end = convertToMinutes(reservation.endTime);
            if (currentMinutes >= start && currentMinutes < end) {
              occupied = true;
              occupiedUntil = reservation.endTime;
            }
          });
        }
        
        // Reassignments into room
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
      
      const uniqueBuildings = ["All Buildings", ...Array.from(buildingsSet).sort()];
      const uniqueFloors = ["All Floors", ...Array.from(floorsSet).sort()];
      setBuildingOptions(uniqueBuildings);
      setFloorOptions(uniqueFloors);
      
      if (!uniqueBuildings.includes(selectedBuilding)) setSelectedBuilding("All Buildings");
      if (!uniqueFloors.includes(selectedFloor)) setSelectedFloor("All Floors");
      
      let filtered = roomList;
      if (selectedBuilding !== "All Buildings") {
        filtered = filtered.filter((r) => r.building === selectedBuilding);
      }
      if (selectedFloor !== "All Floors") {
        filtered = filtered.filter((r) => r.floor === selectedFloor);
      }
      
      setRooms(filtered);
    } catch (err) {
      console.error(err);
    }
    
    setLoading(false);
  };
  
  const clearFilters = () => {
    setSelectedDate(getToday());
    setSelectedTime(getCurrentTime());
    setSelectedBuilding("All Buildings");
    setSelectedFloor("All Floors");
  };
  
  const hasActiveFilters =
    selectedBuilding !== "All Buildings" ||
    selectedFloor !== "All Floors" ||
    selectedDate !== getToday() ||
    selectedTime !== getCurrentTime();
  
  const filteredRooms = rooms.filter((room) => {
    if (activeTab === "Available") return room.status === "Available";
    if (activeTab === "Occupied") return room.status === "Occupied";
    if (activeTab === "Maintenance") return room.status === "Maintenance";
    return true;
  });
  
  return (
    <div className="faculty-room-container">
      {/* HEADER */}
      <div className="faculty-room-header">
        <h1>Rooms</h1>
        <p>Browse all classrooms and check their real-time availability by date, time, building, and floor.</p>
      </div>
      
      {/* FILTERS */}
      <div className="white-box-rooms">
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
            
            <div className="filter-group">
              <label className="filter-label">Building</label>
              <div className="dropdown-container">
                <select
                  className="dropdown"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  {buildingOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
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
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
              </div>
            </div>
          </div>
        </div>
        
        {/* TABS */}
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
        
        {/* ROOMS */}
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
          <div className="faculty-room-grid">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onViewSchedule={() =>
                  navigate("/faculty/view-room", { state: { room } })
                }
                onReserve={() => {
                  if (room.status === "Maintenance") return;
                  navigate("/faculty/submit-reservation", { state: { room } });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}