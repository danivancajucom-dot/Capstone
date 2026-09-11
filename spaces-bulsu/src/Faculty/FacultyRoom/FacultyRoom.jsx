import { useState, useEffect, useMemo } from "react";
import "./faculty-room.css";
import RoomCard from "../../Components/RoomCard/RoomCard";
import { useNavigate } from "react-router-dom";
import {
  collection,
  collectionGroup,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";

// ─── Helpers ────────────────────────────────────────────────────
const convertToMinutes = (time) => {
  if (!time) return 0;
  if (!time.includes(" ")) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }
  const [clock, period] = time.trim().split(" ");
  let [h, m] = clock.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
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

const STATUS_OPTIONS = [
  "All Status",
  "Available",
  "Occupied",
  "Under Maintenance",
];

export default function FacultyRoom() {
  const navigate = useNavigate();

  // ─── Building + Floor (top) ──────────────────────────────────
  const [selectedBuilding, setSelectedBuilding] = useState("All Buildings");
  const [selectedFloor, setSelectedFloor] = useState("All Floors");

  // ─── Floating filter panel ───────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [endTime, setEndTime] = useState(getCurrentTime());
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // ─── Realtime data ───────────────────────────────────────────
  const [roomsData, setRoomsData] = useState([]);
  const [schedulesData, setSchedulesData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [reservationsData, setReservationsData] = useState([]);
  const [releasesData, setReleasesData] = useState([]);
  const [reassignmentsData, setReassignmentsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Live ticker ─────────────────────────────────────────────
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Realtime subscriptions ──────────────────────────────────
  useEffect(() => {
    const unsubs = [];

    unsubs.push(
      onSnapshot(
        collection(db, "rooms"),
        (snap) => {
          setRoomsData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        (err) => {
          console.error("rooms listener:", err);
          setLoading(false);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        collectionGroup(db, "schedules"),
        (snap) => {
          setSchedulesData(
            snap.docs.map((d) => ({
              id: d.id,
              roomId: d.ref.parent.parent?.id,
              ...d.data(),
            }))
          );
        },
        (err) => console.error("schedules listener:", err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "events"),
        (snap) =>
          setEventsData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error("events listener:", err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "reservationRequests"),
        (snap) =>
          setReservationsData(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((r) => String(r.status || "").toLowerCase() === "approved")
          ),
        (err) => console.error("reservations listener:", err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "roomReleases"),
        (snap) =>
          setReleasesData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error("releases listener:", err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "roomReassignments"),
        (snap) =>
          setReassignmentsData(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((r) => String(r.status || "").toLowerCase() === "approved")
          ),
        (err) => console.error("reassignments listener:", err)
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  // ─── Group schedules by room ─────────────────────────────────
  const schedulesByRoom = useMemo(() => {
    const map = new Map();
    schedulesData.forEach((s) => {
      if (!s.roomId) return;
      if (!map.has(s.roomId)) map.set(s.roomId, []);
      map.get(s.roomId).push(s);
    });
    return map;
  }, [schedulesData]);

  // ─── Building options ────────────────────────────────────────
  const buildingOptions = useMemo(() => {
    const set = new Set();
    roomsData.forEach((r) => r.building && set.add(r.building));
    return ["All Buildings", ...Array.from(set).sort()];
  }, [roomsData]);

  // ─── Floor options (depend on building) ──────────────────────
  const floorOptions = useMemo(() => {
    const set = new Set();
    roomsData
      .filter(
        (r) =>
          selectedBuilding === "All Buildings" || r.building === selectedBuilding
      )
      .forEach((r) => r.floor && set.add(r.floor));
    return ["All Floors", ...Array.from(set).sort()];
  }, [roomsData, selectedBuilding]);

  useEffect(() => {
    if (!floorOptions.includes(selectedFloor)) {
      setSelectedFloor("All Floors");
    }
  }, [floorOptions, selectedFloor]);

  // ─── Processed rooms (realtime) ──────────────────────────────
  const processedRooms = useMemo(() => {
    if (roomsData.length === 0) return [];

    const selectedDay = getDayFromDate(selectedDate);

    const nowMinutes = convertToMinutes(getCurrentTime());
    let windowStart = startTime
      ? convertToMinutes(startTime)
      : endTime
      ? convertToMinutes(endTime)
      : nowMinutes;
    let windowEnd = endTime
      ? convertToMinutes(endTime)
      : startTime
      ? convertToMinutes(startTime)
      : nowMinutes;
    if (windowStart > windowEnd) {
      [windowStart, windowEnd] = [windowEnd, windowStart];
    }

    const overlaps = (startMin, endMin) =>
      startMin <= windowEnd && endMin >= windowStart;

    // Releases
    const releaseMap = new Map();
    releasesData.forEach((data) => {
      if (data.date !== selectedDate) return;
      const key = `${data.scheduleId}_${data.date}`;
      if (!releaseMap.has(data.roomId)) releaseMap.set(data.roomId, new Set());
      releaseMap.get(data.roomId).add(key);
    });

    // Reassignments
    const reassignAwayMap = new Map();
    const reassignIntoMap = new Map();
    reassignmentsData.forEach((data) => {
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

    const result = [];

    roomsData.forEach((roomData) => {
      const roomId = roomData.id;

      const maintenance =
        isRoomUnderMaintenance(roomData, selectedDate, startTime, endTime) ||
        String(roomData?.roomStatus || "").trim().toLowerCase() === "maintenance";

      if (maintenance) {
        result.push({
          ...roomData,
          id: roomId,
          status: "Under Maintenance",
          occupiedUntil: "",
        });
        return;
      }

      let occupied = false;
      let occupiedUntil = "";

      const schedules = schedulesByRoom.get(roomId) || [];
      const releasesForRoom = releaseMap.get(roomId) || new Set();
      const reassignAwayForRoom = reassignAwayMap.get(roomId) || new Set();

      // 1. Schedules
      schedules.forEach((sched) => {
        if (sched.initialized) return;
        if (sched.day?.toUpperCase() !== selectedDay) return;

        const key = `${sched.id}_${selectedDate}`;
        if (releasesForRoom.has(key)) return;
        if (reassignAwayForRoom.has(key)) return;

        const start = convertToMinutes(sched.startTime);
        const end = convertToMinutes(sched.endTime);
        if (overlaps(start, end)) {
          occupied = true;
          occupiedUntil = sched.endTime;
        }
      });

      // 2. Events
      if (!occupied) {
        eventsData
          .filter((e) => e.roomId === roomId && e.date === selectedDate)
          .forEach((event) => {
            const start = convertToMinutes(event.startTime);
            const end = convertToMinutes(event.endTime);
            if (overlaps(start, end)) {
              occupied = true;
              occupiedUntil = event.endTime;
            }
          });
      }

      // 3. Reservations
      if (!occupied) {
        reservationsData
          .filter((r) => r.roomId === roomId && r.date === selectedDate)
          .forEach((reservation) => {
            const start = convertToMinutes(reservation.startTime);
            const end = convertToMinutes(reservation.endTime);
            if (overlaps(start, end)) {
              occupied = true;
              occupiedUntil = reservation.endTime;
            }
          });
      }

      // 4. Reassigned-in
      if (!occupied) {
        const reassignIntoForRoom = reassignIntoMap.get(roomId) || [];
        reassignIntoForRoom.forEach((item) => {
          const start = convertToMinutes(item.startTime);
          const end = convertToMinutes(item.endTime);
          if (overlaps(start, end)) {
            occupied = true;
            occupiedUntil = item.endTime;
          }
        });
      }

      result.push({
        ...roomData,
        id: roomId,
        status: occupied ? "Occupied" : "Available",
        occupiedUntil,
      });
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roomsData,
    schedulesByRoom,
    eventsData,
    reservationsData,
    releasesData,
    reassignmentsData,
    selectedDate,
    startTime,
    endTime,
    nowTick,
  ]);

  // ─── Apply filters ───────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    let list = processedRooms;

    if (selectedBuilding !== "All Buildings") {
      list = list.filter((r) => r.building === selectedBuilding);
    }
    if (selectedFloor !== "All Floors") {
      list = list.filter((r) => r.floor === selectedFloor);
    }
    if (selectedStatus !== "All Status") {
      list = list.filter((r) => r.status === selectedStatus);
    }
    return list;
  }, [processedRooms, selectedBuilding, selectedFloor, selectedStatus]);

  // ─── Clear filters ───────────────────────────────────────────
  const clearFilters = () => {
    setSelectedBuilding("All Buildings");
    setSelectedFloor("All Floors");
    setSelectedDate(getToday());
    setStartTime(getCurrentTime());
    setEndTime(getCurrentTime());
    setSelectedStatus("All Status");
  };

  const hasActiveFilters =
    selectedBuilding !== "All Buildings" ||
    selectedFloor !== "All Floors" ||
    selectedStatus !== "All Status";

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="faculty-room-container">
      <div className="faculty-room-header">
        <h1>Rooms</h1>
        <p>
          Browse all classrooms and check their real-time availability by
          building, floor, date, and time.
        </p>
      </div>

      <div className="white-box-rooms">
        {/* ─── BUILDING + FLOORS ──────────────────────────────── */}
        <div className="building-floor-filter">
          <div className="filter-group building-group">
            <label className="filter-label">Building</label>
            <div className="dropdown-container">
              <select
                className="dropdown"
                value={selectedBuilding}
                onChange={(e) => {
                  setSelectedBuilding(e.target.value);
                  setSelectedFloor("All Floors");
                }}
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

          <div className="floor-buttons-lr">
            {floorOptions.map((f) => (
              <button
                key={f}
                type="button"
                className={`floor-btn-lr ${selectedFloor === f ? "active" : ""}`}
                onClick={() => setSelectedFloor(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ─── ACTIVE FILTER CHIPS ─────────────────────────────── */}
        <div className="active-filter-chips">
          <span className="filter-chip">
            <i className="fa-regular fa-calendar"></i>
            {selectedDate}
          </span>
          <span className="filter-chip">
            <i className="fa-regular fa-clock"></i>
            {startTime || "--:--"} – {endTime || "--:--"}
          </span>
          <span className="filter-chip">
            <i className="fa-solid fa-circle-info"></i>
            {selectedStatus}
          </span>
        </div>

        {/* ─── ROOM CARDS ──────────────────────────────────────── */}
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
                  if (room.status === "Under Maintenance") return;
                  navigate("/faculty/submit-reservation", { state: { room } });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── FLOATING FILTER BUTTON ────────────────────────────── */}
      <button
        type="button"
        className={`fab-filter-btn ${hasActiveFilters ? "has-active" : ""}`}
        onClick={() => setShowFilterPanel((v) => !v)}
        aria-label="Open filters"
      >
        <i className="fa-solid fa-sliders"></i>
        {hasActiveFilters && <span className="fab-dot" />}
      </button>

      {/* ─── FLOATING FILTER PANEL ─────────────────────────────── */}
      {showFilterPanel && (
        <>
          <div
            className="filter-panel-overlay"
            onClick={() => setShowFilterPanel(false)}
          />
          <div className="filter-panel">
            <div className="filter-panel-header">
              <h3>
                <i className="fa-solid fa-sliders"></i> Filters
              </h3>
              <button
                type="button"
                className="filter-panel-close"
                onClick={() => setShowFilterPanel(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="filter-panel-body">
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

              <div className="filter-row">
                <div className="filter-group">
                  <label className="filter-label">Start Time</label>
                  <div className="dropdown-container">
                    <input
                      type="time"
                      className="dropdown time-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="filter-group">
                  <label className="filter-label">End Time</label>
                  <div className="dropdown-container">
                    <input
                      type="time"
                      className="dropdown time-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Status</label>
                <div className="status-pills">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`status-pill ${
                        selectedStatus === s ? "active" : ""
                      }`}
                      onClick={() => setSelectedStatus(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-panel-footer">
              <button
                type="button"
                className="panel-clear-btn"
                onClick={clearFilters}
              >
                <i className="fa-solid fa-rotate-left"></i> Clear
              </button>
              <button
                type="button"
                className="panel-apply-btn"
                onClick={() => setShowFilterPanel(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}