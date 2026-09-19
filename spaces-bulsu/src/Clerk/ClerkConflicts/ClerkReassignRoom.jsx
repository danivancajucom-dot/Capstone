import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./clerk-reassign-room.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import {
  collection, getDocs, addDoc, serverTimestamp, doc, getDoc,
  query, where,
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";
import { auth, db } from "../../firebase";
import { findFacultyUserByName } from "../../utils/findFacultyUser";
import { formatFacultyName } from "../../utils/parseFacultyName";

function ClerkReassignRoom() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [floor, setFloor] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const location = useLocation();

  const [alreadyPending, setAlreadyPending] = useState(false);
  const [checkingPending, setCheckingPending] = useState(true);

  const conflict = location.state?.conflict;
  const reassignType = location.state?.reassignType || "class"; // "class" | "event"
  const from = location.state?.from || "/clerk/conflicts";

  const isEventReassign = reassignType === "event";

  // ── Kung event: gamitin ang totoong oras ng event, hindi ng schedule ──
  const effectiveDate  = isEventReassign
    ? (conflict?.event?.date || conflict?.date)
    : conflict?.date;
  const effectiveStart = isEventReassign
    ? (conflict?.event?.startTime || conflict?.startTime)
    : conflict?.startTime;
  const effectiveEnd   = isEventReassign
    ? (conflict?.event?.endTime   || conflict?.endTime)
    : conflict?.endTime;

  useEffect(() => { checkPendingReassignment(); }, []);
  useEffect(() => { loadAvailableRooms(); }, [floor]);

  const checkPendingReassignment = async () => {
    if (!conflict?.schedule?.id) { setCheckingPending(false); return; }
    const q = query(
      collection(db, "roomReassignments"),
      where("scheduleId", "==", conflict.schedule.id),
      where("date", "==", conflict.date),
      where("status", "in", ["pending_admin", "pending_faculty", "pending"])
    );
    const snap = await getDocs(q);
    setAlreadyPending(!snap.empty);
    setCheckingPending(false);
  };

  const cvtMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const overlap = (aS, aE, bS, bE) => cvtMin(aS) < cvtMin(bE) && cvtMin(aE) > cvtMin(bS);

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
    const roomSnap = await getDocs(collection(db, "rooms"));
    const eventSnap = await getDocs(collection(db, "events"));
    const available = [];

    for (const roomDoc of roomSnap.docs) {
      const room = roomDoc.data();
      if (floor && room.floor !== floor) continue;
      // Skip the current room since we're moving away
      if (roomDoc.id === conflict.roomId) continue;

      let occupied = false;

      // Check events
      const roomEvents = eventSnap.docs.map((d) => d.data()).filter((e) => e.roomId === roomDoc.id);
      for (const event of roomEvents) {
        if (event.date !== effectiveDate) continue;
        if (overlap(effectiveStart, effectiveEnd, event.startTime, event.endTime)) {
          occupied = true; break;
        }
      }
      if (occupied) continue;

      // Check schedules
      const schedulesSnap = await getDocs(collection(db, "rooms", roomDoc.id, "schedules"));
      for (const schedDoc of schedulesSnap.docs) {
        const sched = schedDoc.data();
        if (schedDoc.id === conflict?.schedule?.id) continue;
        if (sched.day !== conflict.day) continue;
        if (overlap(effectiveStart, effectiveEnd, sched.startTime, sched.endTime)) {
          occupied = true; break;
        }
      }
      if (occupied) continue;

      available.push({ id: roomDoc.id, ...room });
    }

    setAvailableRooms(available);
    setRoomsLoading(false);
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRoom) { alert("Select a room."); return; }
    if (alreadyPending) {
      alert("There is already a pending reassignment for this class. Please wait.");
      setShowConfirm(false);
      return;
    }

    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const facultyDoc = findFacultyUserByName(usersSnap, conflict.faculty);

      let facultyId = null;
      let facultyFullName = conflict.faculty || "TBA";

      if (facultyDoc) {
        facultyId = facultyDoc.id;
        const fd = facultyDoc.data();
        facultyFullName = formatFacultyName(`${fd.lastName}, ${fd.firstName}`);
      }

      // ── Title: event → eventTitle ; class → courseTitle / subject ──
      const classSubject = conflict.subject || conflict.schedule?.subject || "Unknown Subject";
      const eventSubject = conflict.activityTitle || conflict.event?.title || "Untitled Activity";
      const displaySubject = isEventReassign ? eventSubject : classSubject;

      const reassignmentRef = await addDoc(collection(db, "roomReassignments"), {
        // meta
        reassignType,                 // "class" | "event"
        requestedBy: "clerk",
        requestedById: auth.currentUser?.uid || null,

        // faculty (used for event too — same faculty is affected)
        facultyId,
        facultyName: conflict.faculty || "",

        // Title — same field for both; nilalagay natin yung tamang title
        courseTitle: isEventReassign ? "" : classSubject,
        section: isEventReassign ? "" : (conflict.section || ""),
        day: conflict.day || "",

        // Date / time — kung event, gamitin ang totoong event time
        date: effectiveDate,
        startTime: effectiveStart,
        endTime: effectiveEnd,

        oldRoomId: conflict.roomId,
        oldRoomName: conflict.roomName,

        newRoomId: selectedRoom.id,
        newRoomName: selectedRoom.roomName,

        eventId: conflict?.event?.id || null,
        scheduleId: conflict?.schedule?.id || null,

        // Event-specific details
        eventTitle: isEventReassign ? eventSubject : "",
        eventReason: isEventReassign
          ? (conflict.activityReason || conflict.event?.reason || "")
          : "",

        // flow status
        status: "pending_admin",
        adminNote: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify Admins
      const admins = usersSnap.docs.filter(
        (d) => String(d.data().role || "").toLowerCase() === "admin"
      );
      for (const admin of admins) {
        await addDoc(collection(db, "notifications"), {
          userId: admin.id,
          ownerType: "admin",
          reassignmentId: reassignmentRef.id,
          title: "New Room Reassignment Request",
          message: `${facultyFullName} • ${displaySubject} • ${conflict.roomName} → ${selectedRoom.roomName}. Please review.`,
          type: "room-reassignment-request",
          unread: true, archived: false, badge: "NEW",
          createdAt: serverTimestamp(),
        });
      }

      // Activity log
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.data();
      await logActivity({
        user: `${userData.firstName} ${userData.lastName}`,
        role: userData.role,
        action: `Submitted ${isEventReassign ? "activity" : "class"} room reassignment`,
        actionType: "edit",
        target: `${facultyFullName} • ${displaySubject} • ${conflict.roomName} → ${selectedRoom.roomName}`,
        status: "PENDING",
      });

      alert("Reassignment submitted for Admin approval.");
      setShowConfirm(false);
      navigate(from);
    } catch (err) {
      console.error(err);
      alert("Failed to submit reassignment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const courseTitle   = conflict?.subject || conflict?.schedule?.subject || "—";
  const activityTitle = conflict?.activityTitle || conflict?.event?.title || "—";
  const activityReason = conflict?.activityReason || conflict?.event?.reason || "";

  return (
    <>
      <div className="dept-reassign-room">
        <div className="dept-reassign-white-box">
          <div className="dept-reassign-heading">
            <span className={`dept-reassign-type-pill ${isEventReassign ? "is-event" : "is-class"}`}>
              <i className={`fa-solid ${isEventReassign ? "fa-calendar-plus" : "fa-chalkboard-user"}`}></i>
              {isEventReassign ? "Reassigning Activity" : "Reassigning Class"}
            </span>
            <h2 className="dept-reassign-title">
              {isEventReassign ? "Reassign Activity to New Room" : "Reassign Class to New Room"}
            </h2>
            <p className="dept-reassign-subtitle">
              {isEventReassign
                ? "Move the activity to another available room. The class stays in place and the faculty will be notified once approved."
                : "Move this class to another available room. The activity stays in place. Faculty will be notified once approved."}
            </p>
          </div>

          {/* ── SUMMARY: same layout, dynamic labels for event vs class ── */}
          <div className="dept-reassign-summary">
            {/* 1. Title */}
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">
                {isEventReassign ? "Activity Title" : "Course Title"}
              </span>
              <span className="dept-reassign-summary-value">
                {isEventReassign ? activityTitle : courseTitle}
              </span>
            </div>

            {/* 2. Reason (event) / Section (class) */}
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">
                {isEventReassign ? "Reason" : "Section"}
              </span>
              <span className="dept-reassign-summary-value">
                {isEventReassign
                  ? (activityReason || "—")
                  : (conflict?.section || "—")}
              </span>
            </div>

            {/* 3. Faculty */}
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Faculty</span>
              <span className="dept-reassign-summary-value">
                {conflict?.faculty || "—"}
              </span>
            </div>

            {/* 4. Day */}
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Day</span>
              <span className="dept-reassign-summary-value">
                {conflict?.day || "—"}
              </span>
            </div>

            {/* 5. Date */}
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Date</span>
              <span className="dept-reassign-summary-value">
                {effectiveDate || "—"}
              </span>
            </div>

            {/* 6. Current Room */}
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Current Room</span>
              <span className="dept-reassign-summary-value">
                {conflict?.roomName || "—"}
              </span>
            </div>

            {/* 7. Time */}
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Time</span>
              <span className="dept-reassign-summary-value">
                {effectiveStart && effectiveEnd
                  ? `${formatTime(effectiveStart)} – ${formatTime(effectiveEnd)}`
                  : "—"}
              </span>
            </div>
          </div>

          <div className="dept-reassign-room-section">
            <div className="dept-reassign-room-section-header">
              <div>
                <span className="dept-venue-title">Select a New Room</span>
                <p className="dept-venue-hint">Only rooms free during this time slot are shown.</p>
              </div>
              <div className="dept-dropdown-wrapper-venue">
                <select value={floor} onChange={(e) => setFloor(e.target.value)}
                  className="dept-dropdown-venue" aria-label="Filter by floor">
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
                  <button type="button" key={room.id}
                    className={`available-room-card ${selectedRoom?.id === room.id ? "selected" : ""}`}
                    onClick={() => setSelectedRoom(room)}>
                    <div className="room-card-top">
                      <h4>{room.roomName}</h4>
                      {selectedRoom?.id === room.id && <i className="fa-solid fa-circle-check"></i>}
                    </div>
                    <div className="room-card-meta">
                      <span className="room-card-floor"><i className="fa-solid fa-building"></i>{room.floor}</span>
                      {room.roomType && <span className="room-card-type">{room.roomType}</span>}
                      {room.capacity && (
                        <span className="room-card-capacity"><i className="fa-solid fa-users"></i>{room.capacity}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="dept-reassign-footer">
          <button className="dept-reassign-back-btn" onClick={() => navigate(from)}>Back</button>
          <button className="dept-reassign-confirm-btn"
            onClick={() => setShowConfirm(true)}
            disabled={loading || !selectedRoom || alreadyPending || checkingPending}>
            {loading ? "Processing..." : "Submit for Approval"}
          </button>
          {alreadyPending && (
            <div className="dept-reassign-summary-item" style={{ color: "#991b1b" }}>
              <span>Already reassigned. Wait for the Admin's decision.</span>
            </div>
          )}
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

export default ClerkReassignRoom;