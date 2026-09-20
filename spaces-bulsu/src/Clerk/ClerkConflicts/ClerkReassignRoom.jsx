import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./clerk-reassign-room.css";
import {
  collection, getDocs, addDoc, serverTimestamp, doc, getDoc,
  query, where,
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";
import { auth, db } from "../../firebase";
import { findFacultyUserByName } from "../../utils/findFacultyUser";
import { formatFacultyName } from "../../utils/parseFacultyName";
import Toast from "../../Popup/Toast/Toast";

// ─── Helpers ────────────────────────────────────────────────────
const format12Hour = (time) => {
  if (!time) return "-";
  const [hour, minute] = time.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
};

const cvtMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const minToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// ═══════════════════════════════════════════════════════════════
// Room status helpers — para hindi mailagay sa available list
// ang mga room na under maintenance / inactive
// ═══════════════════════════════════════════════════════════════
const isRoomMaintenance = (room) => {
  const status = String(room.roomStatus || "").toLowerCase().trim();
  const legacyStatus = String(room.status || "").toLowerCase().trim();
  return (
    room.maintenance === true ||
    status === "maintenance" ||
    legacyStatus === "under maintenance" ||
    legacyStatus === "maintenance"
  );
};

const isRoomInactive = (room) => {
  const status = String(room.roomStatus || "").toLowerCase().trim();
  return status === "inactive";
};

function ClerkReassignRoom() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [floor, setFloor] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [skippedRooms, setSkippedRooms] = useState({ maintenance: 0, inactive: 0 });
  const location = useLocation();

  const [alreadyPending, setAlreadyPending] = useState(false);
  const [checkingPending, setCheckingPending] = useState(true);

  const [showPreview, setShowPreview] = useState(false);

  const conflict = location.state?.conflict;
  const reassignType = location.state?.reassignType || "class";
  const from = location.state?.from || "/clerk/conflicts";

  const isEventReassign = reassignType === "event";

  const [toast, setToast] = useState({
    show: false, type: "success", title: "", message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(
        () => setToast((prev) => ({ ...prev, show: false })),
        4000,
      );
    }
  };

  const effectiveDate = isEventReassign
    ? (conflict?.event?.date || conflict?.date)
    : conflict?.date;
  const effectiveStart = isEventReassign
    ? (conflict?.event?.startTime || conflict?.startTime)
    : conflict?.startTime;
  const effectiveEnd = isEventReassign
    ? (conflict?.event?.endTime || conflict?.endTime)
    : conflict?.endTime;

  // ── Conflicting window (from the conflict info) ──
  const conflictWindow = useMemo(() => {
    if (!conflict?.conflictStartTime || !conflict?.conflictEndTime) return null;
    const cs = cvtMin(conflict.conflictStartTime);
    const ce = cvtMin(conflict.conflictEndTime);
    if (ce <= cs) return null;
    return { start: cs, end: ce };
  }, [conflict]);

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

  const overlap = (aS, aE, bS, bE) =>
    cvtMin(aS) < cvtMin(bE) && cvtMin(aE) > cvtMin(bS);

  const formatTime = (time) => format12Hour(time);

  // ══════════════════════════════════════════════════════════════
  // Load rooms + compute free windows
  // ══════════════════════════════════════════════════════════════
  const loadAvailableRooms = async () => {
    setRoomsLoading(true);
    const roomSnap = await getDocs(collection(db, "rooms"));
    const eventSnap = await getDocs(collection(db, "events"));
    const available = [];

    const classStart = cvtMin(effectiveStart);
    const classEnd = cvtMin(effectiveEnd);

    let maintenanceSkipped = 0;
    let inactiveSkipped = 0;

    for (const roomDoc of roomSnap.docs) {
      const room = roomDoc.data();

      // ✅ SKIP: floor filter
      if (floor && room.floor !== floor) continue;

      // ✅ SKIP: yung original room (hindi pwedeng i-reassign sa sarili)
      if (roomDoc.id === conflict.roomId) continue;

      // ✅ SKIP: rooms under maintenance — hindi pwedeng paglagyan
      if (isRoomMaintenance(room)) {
        maintenanceSkipped++;
        continue;
      }

      // ✅ SKIP: inactive rooms — hindi available
      if (isRoomInactive(room)) {
        inactiveSkipped++;
        continue;
      }

      const blockers = [];

      // Events in target room on the same date
      const roomEvents = eventSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => e.roomId === roomDoc.id && e.date === effectiveDate);
      for (const event of roomEvents) {
        if (conflict?.event?.id && event.id === conflict.event.id) continue;
        blockers.push({
          start: cvtMin(event.startTime),
          end: cvtMin(event.endTime),
        });
      }

      // Schedules in target room for that day
      const schedulesSnap = await getDocs(
        collection(db, "rooms", roomDoc.id, "schedules")
      );
      for (const schedDoc of schedulesSnap.docs) {
        const sched = schedDoc.data();
        if (schedDoc.id === conflict?.schedule?.id) continue;
        if (sched.day !== conflict.day) continue;
        blockers.push({
          start: cvtMin(sched.startTime),
          end: cvtMin(sched.endTime),
        });
      }

      // Overlaps with the class time
      const overlaps = blockers
        .filter((b) => b.start < classEnd && b.end > classStart)
        .map((b) => ({
          start: Math.max(b.start, classStart),
          end: Math.min(b.end, classEnd),
        }))
        .sort((a, b) => a.start - b.start);

      // Merge consecutive/overlapping blockers
      const merged = [];
      for (const o of overlaps) {
        if (merged.length === 0) merged.push({ ...o });
        else {
          const last = merged[merged.length - 1];
          if (o.start <= last.end) last.end = Math.max(last.end, o.end);
          else merged.push({ ...o });
        }
      }

      // Free windows within [classStart, classEnd]
      const freeWindows = [];
      let cursor = classStart;
      for (const block of merged) {
        if (block.start > cursor) {
          freeWindows.push({ start: cursor, end: block.start });
        }
        cursor = Math.max(cursor, block.end);
      }
      if (cursor < classEnd) {
        freeWindows.push({ start: cursor, end: classEnd });
      }

      if (freeWindows.length === 0) continue;

      const isFullyFree =
        freeWindows.length === 1 &&
        freeWindows[0].start === classStart &&
        freeWindows[0].end === classEnd;

      const primaryWindow = freeWindows.reduce((best, w) =>
        w.end - w.start > best.end - best.start ? w : best
      );

      available.push({
        id: roomDoc.id,
        ...room,
        _freeWindows: freeWindows,
        _primaryWindow: primaryWindow,
        _isPartial: !isFullyFree,
      });
    }

    setAvailableRooms(available);
    setSkippedRooms({ maintenance: maintenanceSkipped, inactive: inactiveSkipped });
    setRoomsLoading(false);
  };

  // ── Readable labels for preview ─────────────────────────────────
  const classSubject =
    conflict?.subject || conflict?.schedule?.subject || "Unknown Subject";
  const eventSubject =
    conflict?.activityTitle || conflict?.event?.title || "Untitled Activity";
  const displaySubject = isEventReassign ? eventSubject : classSubject;

  const activityReason =
    conflict?.activityReason || conflict?.event?.reason || "";

  // Reassigned window (from selected room)
  const reassignedWindow = useMemo(() => {
    if (!selectedRoom?._primaryWindow) return null;
    const w = selectedRoom._primaryWindow;
    return {
      start: minToTime(w.start),
      end: minToTime(w.end),
    };
  }, [selectedRoom]);

  const previewData = useMemo(() => {
    const reassignStart = reassignedWindow?.start || effectiveStart;
    const reassignEnd = reassignedWindow?.end || effectiveEnd;

    return {
      type: isEventReassign ? "Activity" : "Class",
      title: displaySubject,
      subtitle: isEventReassign
        ? (activityReason || "—")
        : (conflict?.section || "—"),
      faculty: conflict?.faculty || "TBA",
      day: conflict?.day || "—",
      date: effectiveDate || "—",
      originalTime:
        effectiveStart && effectiveEnd
          ? `${format12Hour(effectiveStart)} – ${format12Hour(effectiveEnd)}`
          : "—",
      reassignTime:
        reassignStart && reassignEnd
          ? `${format12Hour(reassignStart)} – ${format12Hour(reassignEnd)}`
          : "—",
      isPartial: !!selectedRoom?._isPartial,
      oldRoom: conflict?.roomName || "—",
      newRoom: selectedRoom?.roomName || "—",
      newRoomFloor: selectedRoom?.floor || "",
      newRoomType: selectedRoom?.roomType || "",
      newRoomCapacity: selectedRoom?.capacity || "",
    };
  }, [
    displaySubject, isEventReassign, activityReason, conflict,
    effectiveDate, effectiveStart, effectiveEnd,
    selectedRoom, reassignedWindow,
  ]);

  // ── Open preview ───────────────────────────────────────────────
  const handleSubmitClick = () => {
    if (!selectedRoom) {
      showToast("error", "Select a Room", "Please choose a room to reassign to.");
      return;
    }
    if (alreadyPending) {
      showToast(
        "error",
        "Already Pending",
        "There is already a pending reassignment for this class. Please wait.",
      );
      return;
    }
    if (checkingPending) {
      showToast("loading", "Please wait", "Checking existing reassignments...");
      return;
    }
    setShowPreview(true);
  };

  // ── Confirm & submit ──────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedRoom) {
      showToast("error", "Select a Room", "Please choose a room first.");
      return;
    }
    if (alreadyPending) {
      showToast(
        "error",
        "Already Pending",
        "There is already a pending reassignment for this class. Please wait.",
      );
      setShowPreview(false);
      return;
    }

    setLoading(true);
    showToast("loading", "Submitting", "Sending reassignment request...");

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

      // Use the free window (possibly partial) as the reassigned time
      const reassignStart = reassignedWindow?.start || effectiveStart;
      const reassignEnd = reassignedWindow?.end || effectiveEnd;
      const isPartial = !!selectedRoom._isPartial;

      const reassignmentRef = await addDoc(collection(db, "roomReassignments"), {
        reassignType,
        requestedBy: "clerk",
        requestedById: auth.currentUser?.uid || null,

        facultyId,
        facultyName: conflict.faculty || "",

        courseTitle: isEventReassign ? "" : classSubject,
        section: isEventReassign ? "" : (conflict.section || ""),
        day: conflict.day || "",

        // The actual time range being reassigned (may be a partial window)
        date: effectiveDate,
        startTime: reassignStart,
        endTime: reassignEnd,

        // Record the original class time for reference
        originalStartTime: effectiveStart,
        originalEndTime: effectiveEnd,
        isPartialReassignment: isPartial,
        freeWindows: (selectedRoom._freeWindows || []).map((w) => ({
          start: minToTime(w.start),
          end: minToTime(w.end),
        })),

        oldRoomId: conflict.roomId,
        oldRoomName: conflict.roomName,

        newRoomId: selectedRoom.id,
        newRoomName: selectedRoom.roomName,

        eventId: conflict?.event?.id || null,
        scheduleId: conflict?.schedule?.id || null,

        eventTitle: isEventReassign ? eventSubject : "",
        eventReason: isEventReassign ? activityReason : "",

        status: "pending_admin",
        adminNote: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify Admins
      const admins = usersSnap.docs.filter(
        (d) => String(d.data().role || "").toLowerCase() === "admin"
      );
      const partialNote = isPartial
        ? ` (partial: ${format12Hour(reassignStart)} – ${format12Hour(reassignEnd)} only)`
        : "";
      const notifications = admins.map((admin) =>
        addDoc(collection(db, "notifications"), {
          userId: admin.id,
          ownerType: "admin",
          reassignmentId: reassignmentRef.id,
          title: isPartial
            ? "New Partial Room Reassignment Request"
            : "New Room Reassignment Request",
          message: `${facultyFullName} • ${displaySubject} • ${conflict.roomName} → ${selectedRoom.roomName}${partialNote}. Please review.`,
          type: "room-reassignment-request",
          unread: true,
          archived: false,
          badge: "NEW",
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(notifications);

      // Activity log
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.data();
      await logActivity({
        user: `${userData.firstName} ${userData.lastName}`,
        role: userData.role,
        action: `Submitted ${isEventReassign ? "activity" : "class"} room reassignment${
          isPartial ? " (partial)" : ""
        }`,
        actionType: "edit",
        target: `${facultyFullName} • ${displaySubject} • ${conflict.roomName} → ${selectedRoom.roomName}${partialNote}`,
        status: "PENDING",
      });

      setShowPreview(false);
      showToast(
        "success",
        "Submitted for Approval",
        isPartial
          ? `Partial reassignment (${format12Hour(reassignStart)} – ${format12Hour(reassignEnd)}) sent to Admin.`
          : "Your reassignment request has been sent to the Admin for review.",
      );

      setTimeout(() => navigate(from), 1500);
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        "Submission Failed",
        "Could not submit the reassignment. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const courseTitle = conflict?.subject || conflict?.schedule?.subject || "—";
  const activityTitle =
    conflict?.activityTitle || conflict?.event?.title || "—";

  return (
    <>
      <div className="dept-reassign-room">
        <div className="dept-reassign-white-box">
          <div className="dept-reassign-heading">
            <span
              className={`dept-reassign-type-pill ${
                isEventReassign ? "is-event" : "is-class"
              }`}
            >
              <i
                className={`fa-solid ${
                  isEventReassign ? "fa-calendar-plus" : "fa-chalkboard-user"
                }`}
              ></i>
              {isEventReassign ? "Reassigning Activity" : "Reassigning Class"}
            </span>
            <h2 className="dept-reassign-title">
              {isEventReassign
                ? "Reassign Activity to New Room"
                : "Reassign Class to New Room"}
            </h2>
            <p className="dept-reassign-subtitle">
              {isEventReassign
                ? "Move the activity to another available room. The class stays in place and the faculty will be notified once approved."
                : "Move this class to another available room. The activity stays in place. Faculty will be notified once approved."}
            </p>
          </div>

          <div className="dept-reassign-summary">
            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">
                {isEventReassign ? "Activity Title" : "Course Title"}
              </span>
              <span className="dept-reassign-summary-value">
                {isEventReassign ? activityTitle : courseTitle}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">
                {isEventReassign ? "Reason" : "Section"}
              </span>
              <span className="dept-reassign-summary-value">
                {isEventReassign
                  ? activityReason || "—"
                  : conflict?.section || "—"}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Faculty</span>
              <span className="dept-reassign-summary-value">
                {conflict?.faculty || "—"}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Day</span>
              <span className="dept-reassign-summary-value">
                {conflict?.day || "—"}
              </span>
            </div>

            <div className="dept-reassign-summary-item">
              <span className="dept-reassign-summary-label">Date</span>
              <span className="dept-reassign-summary-value">
                {effectiveDate || "—"}
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
                {effectiveStart && effectiveEnd
                  ? `${formatTime(effectiveStart)} – ${formatTime(effectiveEnd)}`
                  : "—"}
              </span>
            </div>

            {conflictWindow && (
              <div className="dept-reassign-summary-item">
                <span className="dept-reassign-summary-label">
                  Conflicting Slot
                </span>
                <span className="dept-reassign-summary-value dept-reassign-conflict-value">
                  {format12Hour(minToTime(conflictWindow.start))} –{" "}
                  {format12Hour(minToTime(conflictWindow.end))}
                </span>
              </div>
            )}
          </div>

          {alreadyPending && !checkingPending && (
            <div className="dept-reassign-notice">
              <i className="fa-solid fa-circle-info"></i>
              <span>
                There is already a <b>pending reassignment</b> for this class.
                Please wait for the Admin's decision before submitting another.
              </span>
            </div>
          )}

          <div className="dept-reassign-room-section">
            <div className="dept-reassign-room-section-header">
              <div>
                <span className="dept-venue-title">Select a New Room</span>
                <p className="dept-venue-hint">
                  Rooms tagged <b>Full</b> are free for the entire class.
                  Rooms tagged <b>Partial</b> are only free for part of the
                  class — you can reassign to those for the free window only
                  (e.g. class 7:00–10:00, room free 7:00–9:00 → reassign
                  7:00–9:00 only).
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

            {/* ✅ Note: kung may rooms na hindi naipakita dahil maintenance/inactive */}
            {(skippedRooms.maintenance > 0 || skippedRooms.inactive > 0) &&
              availableRooms.length === 0 &&
              !roomsLoading && (
                <div className="dept-reassign-hidden-note">
                  <i className="fa-solid fa-circle-info"></i>
                  <span>
                    {skippedRooms.maintenance > 0 && (
                      <>
                        <b>{skippedRooms.maintenance}</b> room
                        {skippedRooms.maintenance === 1 ? "" : "s"} hidden — under
                        maintenance.
                      </>
                    )}
                    {skippedRooms.maintenance > 0 && skippedRooms.inactive > 0 && " "}
                    {skippedRooms.inactive > 0 && (
                      <>
                        <b>{skippedRooms.inactive}</b> room
                        {skippedRooms.inactive === 1 ? "" : "s"} hidden — inactive.
                      </>
                    )}
                  </span>
                </div>
              )}

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
                availableRooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  const w = room._primaryWindow;
                  const partial = room._isPartial;

                  return (
                    <button
                      type="button"
                      key={room.id}
                      className={`available-room-card ${
                        isSelected ? "selected" : ""
                      } ${partial ? "is-partial" : "is-full"}`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className="room-card-top">
                        <h4>{room.roomName}</h4>
                        {isSelected && (
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

                      <div
                        className={`room-card-availability ${
                          partial ? "is-partial" : "is-full"
                        }`}
                      >
                        {partial ? (
                          <>
                            <i className="fa-solid fa-circle-half-stroke"></i>
                            <span>
                              Partial — free{" "}
                              {format12Hour(minToTime(w.start))} –{" "}
                              {format12Hour(minToTime(w.end))}
                            </span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-circle-check"></i>
                            <span>Full — free for the whole class</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="dept-reassign-footer">
          <button
            className="dept-reassign-back-btn"
            onClick={() => navigate(from)}
            disabled={loading}
          >
            Back
          </button>
          <button
            className="dept-reassign-confirm-btn"
            onClick={handleSubmitClick}
            disabled={
              loading || !selectedRoom || alreadyPending || checkingPending
            }
          >
            {checkingPending ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Checking...
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane"></i> Submit for Approval
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div
          className="crr-preview-overlay"
          onClick={() => !loading && setShowPreview(false)}
        >
          <div
            className="crr-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="crr-preview-header">
              <div
                className={`crr-preview-icon ${
                  previewData.isPartial ? "is-partial" : ""
                }`}
              >
                <i
                  className={`fa-solid ${
                    isEventReassign ? "fa-calendar-plus" : "fa-chalkboard-user"
                  }`}
                ></i>
              </div>
              <h3>
                {previewData.isPartial
                  ? "Review Partial Reassignment"
                  : "Review Reassignment"}
              </h3>
              <p className="crr-preview-subtitle">
                {previewData.isPartial
                  ? "This room is only free for part of the class. The reassignment will cover only that free window."
                  : "Please confirm the details below before submitting to the Admin."}
              </p>
            </div>

            <div className="crr-preview-body">
              <div className="crr-preview-row">
                <span className="crr-preview-label">Type</span>
                <span className="crr-preview-value">
                  <span
                    className={`crr-preview-type-pill ${
                      isEventReassign ? "is-event" : "is-class"
                    }`}
                  >
                    {previewData.type}
                  </span>
                </span>
              </div>

              <div className="crr-preview-row">
                <span className="crr-preview-label">
                  {isEventReassign ? "Activity Title" : "Course Title"}
                </span>
                <span className="crr-preview-value">{previewData.title}</span>
              </div>

              <div className="crr-preview-row">
                <span className="crr-preview-label">
                  {isEventReassign ? "Reason" : "Section"}
                </span>
                <span className="crr-preview-value">
                  {previewData.subtitle}
                </span>
              </div>

              <div className="crr-preview-row">
                <span className="crr-preview-label">Faculty</span>
                <span className="crr-preview-value">{previewData.faculty}</span>
              </div>

              <div className="crr-preview-row">
                <span className="crr-preview-label">Day</span>
                <span className="crr-preview-value">{previewData.day}</span>
              </div>

              <div className="crr-preview-row">
                <span className="crr-preview-label">Date</span>
                <span className="crr-preview-value">
                  {formatDateLong(previewData.date)}
                </span>
              </div>

              <div className="crr-preview-row">
                <span className="crr-preview-label">Original Class Time</span>
                <span className="crr-preview-value">
                  {previewData.originalTime}
                </span>
              </div>

              <div className="crr-preview-row">
                <span className="crr-preview-label">
                  {previewData.isPartial
                    ? "Reassigned Window"
                    : "Reassigned Time"}
                </span>
                <span
                  className={`crr-preview-value ${
                    previewData.isPartial
                      ? "crr-preview-value--partial"
                      : ""
                  }`}
                >
                  {previewData.reassignTime}
                  {previewData.isPartial && (
                    <span className="crr-preview-partial-tag">Partial</span>
                  )}
                </span>
              </div>

              <div className="crr-preview-move">
                <div className="crr-preview-move-item">
                  <span className="crr-preview-move-label">From</span>
                  <span className="crr-preview-move-value">
                    {previewData.oldRoom}
                  </span>
                </div>
                <div className="crr-preview-move-arrow">
                  <i className="fa-solid fa-arrow-right"></i>
                </div>
                <div className="crr-preview-move-item crr-preview-move-item--to">
                  <span className="crr-preview-move-label">To</span>
                  <span className="crr-preview-move-value">
                    {previewData.newRoom}
                  </span>
                  {previewData.newRoomFloor && (
                    <span className="crr-preview-move-meta">
                      {previewData.newRoomFloor}
                      {previewData.newRoomCapacity
                        ? ` • ${previewData.newRoomCapacity} Seats`
                        : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="crr-preview-note">
                <i className="fa-solid fa-circle-info"></i>
                <span>
                  {previewData.isPartial ? (
                    <>
                      Only <strong>{previewData.reassignTime}</strong> will be
                      reassigned to <strong>{previewData.newRoom}</strong>. The
                      remaining time of{" "}
                      <strong>{previewData.originalTime}</strong> stays in the
                      original room. Admin will review before it takes effect.
                    </>
                  ) : (
                    <>
                      After submitting, this reassignment will be marked as{" "}
                      <strong>Pending Admin Approval</strong>. The faculty and
                      admin will be notified once it's processed.
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="crr-preview-actions">
              <button
                className="crr-preview-back-btn"
                onClick={() => setShowPreview(false)}
                disabled={loading}
              >
                <i className="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button
                className={`crr-preview-confirm-btn ${
                  loading ? "is-loading" : ""
                }`}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>{" "}
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check"></i> Confirm &
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </>
  );
}

export default ClerkReassignRoom;