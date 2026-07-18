import "./department-head-conflicts.css";
import ConflictCard from "../../Components/ConflictCard/ConflictCard";
import RoomReassignCard from "../../Components/RoomReassignCard/RoomReassignCard";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";

function DepartmentHeadConflicts() {
  const [conflicts, setConflicts] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [unresolved, setUnresolved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConflicts();
  }, []);


  const convertToMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const overlap = (aStart, aEnd, bStart, bEnd) => {
    const s1 = convertToMinutes(aStart);
    const e1 = convertToMinutes(aEnd);

    const s2 = convertToMinutes(bStart);
    const e2 = convertToMinutes(bEnd);

    return s1 < e2 && e1 > s2;
  };

  const getOverlapTime = (schedStart, schedEnd, eventStart, eventEnd) => {
  const start = Math.max(
    convertToMinutes(schedStart),
    convertToMinutes(eventStart)
  );

  const end = Math.min(
    convertToMinutes(schedEnd),
    convertToMinutes(eventEnd)
  );

  const toTime = (mins) => {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    return `${h}:${m}`;
  };

  return {
    start: toTime(start),
    end: toTime(end),
  };
};

  const loadConflicts = async () => {
  setLoading(true);
  try {
    const rooms = await getDocs(collection(db, "rooms"));
    const events = await getDocs(collection(db, "events"));

    const activeFound = [];
    const unresolvedFound = [];
    const resolvedFound = [];

    const now = new Date();

    for (const roomDoc of rooms.docs) {
      const room = roomDoc.data();

      const scheduleSnap = await getDocs(
        collection(db, "rooms", roomDoc.id, "schedules")
      );

      const schedules = scheduleSnap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(s => !s.initialized);

      const roomEvents = events.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
            e =>
              e.roomId === roomDoc.id &&
              e.status !== "Cancelled"
        );

      roomEvents.forEach(event => {

        const eventDay =
          ["SUN","MON","TUE","WED","THU","FRI","SAT"][
            new Date(event.date).getDay()
          ];

        schedules.forEach(schedule => {

          if (schedule.day !== eventDay) return;

          if (
            !overlap(
              schedule.startTime,
              schedule.endTime,
              event.startTime,
              event.endTime
            )
          )
            return;

          const eventEnd = new Date(
            `${event.date}T${event.endTime}`
          );

          const overlapTime = getOverlapTime(
            schedule.startTime,
            schedule.endTime,
            event.startTime,
            event.endTime
          );

          const conflict = {
            roomId: roomDoc.id,
            roomName: room.roomName,
            floor: room.floor,

            room,
            event,
            schedule,

            courseTitle: schedule.courseTitle || "",
            faculty: schedule.faculty || "",
            section: schedule.section || "",

            day: schedule.day,
            date: event.date,

            // original class
            startTime: schedule.startTime,
            endTime: schedule.endTime,

            // activity
            activityTitle: event.title,
            activityReason: event.reason,

            // mismong overlap
            conflictStartTime: overlapTime.start,
            conflictEndTime: overlapTime.end,

             status: "",
          };

          if (event.conflictResolved) {

            conflict.status = "resolved";
            resolvedFound.push(conflict);

          } else if (eventEnd < now) {

            conflict.status = "unresolved";
            unresolvedFound.push(conflict);

          } else {

            conflict.status = "active";
            activeFound.push(conflict);

          }

        });

      });

    }

    setConflicts(activeFound);
    setUnresolved(unresolvedFound);
    setResolved(resolvedFound);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

    const displayConflicts =
    activeTab === "all"
      ? conflicts
      : activeTab === "unresolved"
      ? unresolved
      : resolved;

  const emptyMessage =
    activeTab === "all"
      ? "No active conflicts."
      : activeTab === "unresolved"
      ? "No unresolved conflicts."
      : "No resolved conflicts.";

  return (
   <>
   <div className="dept-conflict">
  <div className="dept-page-header">
    <div>
      <h1>Conflict Monitoring</h1>
      <p>Resolve booking collisions and schedule overlaps within the CICT department.</p>
    </div>
    <button className="dept-conflict-export-btn" disabled={loading}>
      <i className="fa-solid fa-download"></i> Export Report
    </button>
  </div>
  <div className="conflict-boxes">
  <div className="conflict-main-box">
    <div className="conflict-nav">

      <div
        className={`conflict-nav-item ${
          activeTab === "all" ? "active" : ""
        }`}
        onClick={() => setActiveTab("all")}
      >
        All Conflicts
      </div>

      <div
        className={`conflict-nav-item ${
          activeTab === "unresolved" ? "active" : ""
        }`}
        onClick={() => setActiveTab("unresolved")}
      >
        Unresolved
      </div>

      <div
        className={`conflict-nav-item ${
          activeTab === "resolved" ? "active" : ""
        }`}
        onClick={() => setActiveTab("resolved")}
      >
        Resolved
      </div>

    </div>

    <div className="conflict-body">
      {loading ? (
        <div className="room-empty">
          <i className="fa-solid fa-spinner fa-spin"></i>

          <h2>Loading Conflicts</h2>

          <p>Please wait while we retrieve active conflicts.</p>
        </div>
      ) : displayConflicts.length === 0 ? (

        <div className="no-conflicts">
          <i className="fa-solid fa-calendar-check"></i>
          <p>{emptyMessage}</p>
        </div>

      ) : (

        displayConflicts.map((conflict, index) => (

          <ConflictCard
            key={`${conflict.schedule.id}-${conflict.event.id}-${index}`}
            conflict={conflict}
            showReassign={activeTab === "all"}
          />

        ))

      )}
    </div>
  </div>
  <div className="conflict-side-box">
    <div className="side-box-header">
  <i className="fa-solid fa-lightbulb side-box-icon"></i>
  <span className="side-box-title">Smart Alternatives</span>
</div>

    {loading ? (
      <div className="conflict-loading conflict-loading--side">
        <span className="conflict-spinner conflict-spinner--small"></span>
        <p>Loading suggestions...</p>
      </div>
    ) : (
      conflicts.slice(0,3).map(conflict=>(
      <RoomReassignCard
          key={`${conflict.schedule.id}-${conflict.event.id}`}
          conflict={conflict}
      />
      ))
    )}
  <div className="auto-resolve">
    <div className="auto-resolve-header">
      <span className="auto-resolve-title">Auto-resolve conflicts</span>
      <label className="toggle-smart">
        <input type="checkbox" />
        <span className="toggle-slider"></span>
      </label>
    </div>
    <p className="auto-resolve-desc">Enable this to let SpaceS AI automatically propose and notify stakeholders of room changes for minor overlaps.</p>
      </div>
     </div>
    </div>
</div>

    </>

  );
}

export default DepartmentHeadConflicts;