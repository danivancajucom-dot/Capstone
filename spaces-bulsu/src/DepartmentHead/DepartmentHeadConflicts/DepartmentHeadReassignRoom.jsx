import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./department-head-reassign-room.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";
import { auth, db } from "../../firebase";

function DepartmentHeadReassignRoom() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [floor, setFloor] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const location = useLocation();

  const conflict =
  location.state?.conflict;

  const from =
  location.state?.from ||
  "/department-head/conflicts";

  const normalizeName = (name) => {
      if (!name) return "";

      return name
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/,/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    useEffect(()=>{
        loadAvailableRooms();
    },[floor]);

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

const formatTime = (time) => {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;

  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const loadAvailableRooms = async () => {

    setRoomsLoading(true);

    const roomSnap = await getDocs(collection(db,"rooms"));

    const eventSnap = await getDocs(collection(db,"events"));

    const available = [];

    for(const roomDoc of roomSnap.docs){

        const room = roomDoc.data();

        if(floor && room.floor !== floor)
            continue;

        let occupied = false;

        const roomEvents = eventSnap.docs
        .map(doc=>doc.data())
        .filter(e=>e.roomId===roomDoc.id);

        for(const event of roomEvents){

            if(event.date!==conflict.date)
                continue;

            if(
                overlap(
                    conflict.startTime,
                    conflict.endTime,
                    event.startTime,
                    event.endTime
                )
            ){
                occupied=true;
                break;
            }

        }

        if(!occupied){

            available.push({
                id:roomDoc.id,
                ...room
            });

        }

    }

    setAvailableRooms(available);
    setRoomsLoading(false);

};

  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRoom) {
      alert("Select a room.");
      return;
    }

    setLoading(true);

    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const conflictName = normalizeName(conflict.faculty);

      // convert "CAPARAS, Alex" → "alex caparas"
      const flipName = (name) => {
        if (!name) return "";

        const parts = name.split(",");

        if (parts.length !== 2) return normalizeName(name);

        const last = parts[0].trim();
        const first = parts[1].trim();

        return normalizeName(`${first} ${last}`);
      };

      const scheduleName = flipName(conflict.faculty);
      usersSnap.docs.forEach((d) => {
        const u = d.data();
      });

      const faculty = usersSnap.docs.find((d) => {
        const u = d.data();
        const userName = normalizeName(
          `${u.firstName} ${u.lastName}`
        );

        const matched = userName === scheduleName;
        return matched;
      });


      if (!faculty) {
        alert("Faculty not found. Check name format.");
        setLoading(false);
        return;
      }

      const facultyId = faculty.id;

      const subject =
        conflict.subject ||
        conflict.schedule?.subject ||
        "Unknown Subject";

      const reassignmentRef = await addDoc(
        collection(db, "roomReassignments"),
        {
          facultyId,
          facultyName: conflict.faculty,

          courseTitle: subject,
          section: conflict.section,

          date: conflict.date,
          startTime: conflict.startTime,
          endTime: conflict.endTime,

          oldRoomId: conflict.roomId,
          oldRoomName: conflict.roomName,

          newRoomId: selectedRoom.id,
          newRoomName: selectedRoom.roomName,

          eventId: conflict?.event?.id || null,
          scheduleId: conflict?.schedule?.id || null,

          status: "pending",
          createdAt: serverTimestamp(),
        }
      );

      // =========================
      // Notification for Faculty
      // =========================
      await addDoc(collection(db, "notifications"), {
        userId: facultyId,
        ownerType: "faculty",

        assignmentId: reassignmentRef.id,

        title: "Room Reassignment",
        message: `Your ${subject} class has been moved to ${selectedRoom.roomName}. Please review and respond.`,

        type: "room-reassignment",
        unread: true,
        archived: false,
        badge: "NEW",
        createdAt: serverTimestamp(),
      });

      // =========================
      // Notification for Department Head
      // =========================
     await addDoc(collection(db, "notifications"), {
      userId: auth.currentUser.uid,
      ownerType: "department-head",

      assignmentId: reassignmentRef.id,

      title: "Room Reassignment Submitted",
      message: `Room reassignment for ${conflict.faculty} has been submitted successfully. Waiting for the faculty's response.`,

      type: "room-reassignment-status",
      unread: true,
      archived: false,
      badge: "INFO",
      createdAt: serverTimestamp(),
    });

    // =========================
    // Activity Log
    // =========================
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const userData = userDoc.data();

    await logActivity({
      user: `${userData.firstName} ${userData.lastName}`,
      role: userData.role,
      action: "Submitted room reassignment",
      actionType: "edit",
      target: `${conflict.faculty} • ${courseTitle} • ${conflict.roomName} → ${selectedRoom.roomName}`,
      status: "Success",
    });

      alert("Room reassigned successfully!");
      setShowConfirm(false);
      navigate(from);

    } catch (err) {
      alert("Failed to reassign room. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  const courseTitle =
    conflict?.subject || conflict?.schedule?.subject || "—";

  return (
    <>
      <div className="dept-reassign-room">
        <div className="dept-reassign-white-box">

          <div className="dept-reassign-heading">
            <h2 className="dept-reassign-title">Reassign Room</h2>
            <p className="dept-reassign-subtitle">
              Move this class to another available room. The faculty will be
              notified once you confirm.
            </p>
          </div>

          {/* -------------------------------------------------- */}
          {/* CONFLICT SUMMARY (read-only, compact) */}
          {/* -------------------------------------------------- */}
          <div className="dept-reassign-summary">

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Course Title</span>
              <span className="dept-reassign-summary-value">{courseTitle}</span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Faculty</span>
              <span className="dept-reassign-summary-value">
                {conflict?.faculty || "—"}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Section</span>
              <span className="dept-reassign-summary-value">
                {conflict?.section || "—"}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Date</span>
              <span className="dept-reassign-summary-value">
                {conflict?.date || "—"}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Current Room</span>
              <span className="dept-reassign-summary-value">
                {conflict?.roomName || "—"}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Time</span>
              <span className="dept-reassign-summary-value">
                {conflict?.startTime && conflict?.endTime
                  ? `${formatTime(conflict.startTime)} – ${formatTime(conflict.endTime)}`
                  : "—"}
              </span>
            </div>

          </div>

          {/* -------------------------------------------------- */}
          {/* ROOM SELECTION */}
          {/* -------------------------------------------------- */}
          <div className="dept-reassign-room-section">

            <div className="dept-reassign-room-section-header">
              <div>
                <span className="dept-venue-title">Select a New Room</span>
                <p className="dept-venue-hint">
                  Only rooms free during this time slot are shown.
                </p>
              </div>

              <div className="dept-dropdown-wrapper-venue">
                <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="dept-dropdown-venue"
                    aria-label="Filter by floor"
                >
                    <option value="">All Floors</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="4th Floor">4th Floor</option>
                </select>

                <i className="fa-solid fa-angle-down dept-dropdown-icon-venue"></i>
              </div>
            </div>

            <div className="available-room-list">

                {roomsLoading ? (

                    <div className="room-select-empty">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <p>Checking room availability...</p>
                    </div>

                ) : availableRooms.length === 0 ? (

                    <div className="room-select-empty">
                        <i className="fa-regular fa-calendar-xmark"></i>
                        <p>No available rooms found for this time slot.</p>
                    </div>

                ) : (

                  availableRooms.map((room) => (

                      <button
                          type="button"
                          key={room.id}
                          className={`available-room-card ${
                              selectedRoom?.id === room.id ? "selected" : ""
                          }`}
                          onClick={() => setSelectedRoom(room)}
                      >

                          <div className="room-card-top">

                              <h4>{room.roomName}</h4>

                              {selectedRoom?.id === room.id && (
                                  <i className="fa-solid fa-circle-check"></i>
                              )}

                          </div>

                          <div className="room-card-meta">
                            <span className="room-card-floor">
                              <i className="fa-solid fa-building"></i>
                              {room.floor}
                            </span>

                            {room.roomType && (
                              <span className="room-card-type">
                                {room.roomType}
                              </span>
                            )}

                            {room.capacity && (
                              <span className="room-card-capacity">
                                <i className="fa-solid fa-users"></i>
                                {room.capacity}
                              </span>
                            )}
                          </div>

                      </button>

                  ))

                )}

            </div>
          </div>
        </div>

        <div className="dept-reassign-footer">
          <button className="dept-reassign-back-btn" onClick={() => navigate(from)}>
            Back
          </button>
          <button
            className="dept-reassign-confirm-btn"
            onClick={() => setShowConfirm(true)}
            disabled={loading || !selectedRoom}
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmPopup
          onCancel={() => setShowConfirm(false)}
          onConfirm={loading ? null : handleConfirm}
        />
      )}
    </>
  );
}

export default DepartmentHeadReassignRoom;