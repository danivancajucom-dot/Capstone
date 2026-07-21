import "./department-head-edit-approved-reservation.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import { logActivity } from "../../utils/logActivity";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";
import SavePopup from "../../Popup/SavePopup/SavePopup";
import Toast from "../../Popup/Toast/Toast";

// ─── Helpers ──────────────────────────────────────────────────────────
const convertToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const normalize = (value) => value?.toString().trim().toLowerCase();

const getDayAbbrev = (dateStr) => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date(dateStr).getDay()];
};

const overlap = (aStart, aEnd, bStart, bEnd) => {
  return convertToMinutes(aStart) < convertToMinutes(bEnd) &&
         convertToMinutes(aEnd) > convertToMinutes(bStart);
};

const toDateStr = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ─── Find user by name ──────────────────────────────────────────────
const findUserByName = async (name) => {
  if (!name) return null;
  const usersSnap = await getDocs(collection(db, "users"));
  const normalized = name.trim().toLowerCase();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim().toLowerCase();
    if (fullName === normalized) return { id: doc.id, ...data };
  }
  return null;
};

// ─── Send notification ──────────────────────────────────────────────
const sendNotification = async (userId, ownerType, title, message, type, badge = "INFO") => {
  if (!userId) return;
  await addDoc(collection(db, "notifications"), {
    userId,
    ownerType,
    title,
    message,
    type,
    unread: true,
    archived: false,
    badge,
    createdAt: serverTimestamp(),
  });
};

function DepartmentHeadEditApprovedReservation() {
  const navigate = useNavigate();
  const location = useLocation();
  const reservation = location.state?.reservation;

  // ─── Toast state ──────────────────────────────────────────────────
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    }
  };

  // ─── State ─────────────────────────────────────────────────────────
  const [editableFields, setEditableFields] = useState({
    roomName: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  const [allRooms, setAllRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [conflictError, setConflictError] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Read‑only purpose and other fields ──────────────────────────
  const purpose = reservation?.purpose || "";
  const isOtherActivity = purpose === "Other Activity";
  const customPurpose = reservation?.attendees?.customPurpose || "";
  const audienceType = reservation?.audienceType || "";
  const studentRange = reservation?.studentRange || "";
  const requiredEquipment = reservation?.requiredEquipment || [];
  const courseTitle = reservation?.courseTitle || "";
  const facultyName = reservation?.facultyName || reservation?.requesterName || "";

  // ─── Load initial data ─────────────────────────────────────────────
  useEffect(() => {
    if (!reservation) {
      navigate("/department-head/reservations");
      return;
    }

    setEditableFields({
      roomName: reservation.roomName || "",
      date: reservation.date || "",
      startTime: reservation.startTime || "",
      endTime: reservation.endTime || "",
    });

    loadAllRooms();
  }, [reservation]);

  // ─── Load all rooms ────────────────────────────────────────────────
  const loadAllRooms = async () => {
    setLoadingRooms(true);
    try {
      const snap = await getDocs(collection(db, "rooms"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllRooms(data);
      // After loading all rooms, fetch available ones based on current fields
      fetchAvailableRooms(data, editableFields.date, editableFields.startTime, editableFields.endTime);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // ─── Fetch available rooms based on purpose, date, time ───────────
  const fetchAvailableRooms = async (roomsList = allRooms, date, startTime, endTime) => {
    if (!date || !startTime || !endTime || roomsList.length === 0) {
      setAvailableRooms([]);
      return;
    }

    setLoadingAvailable(true);
    try {
      const dayAbbrev = getDayAbbrev(date);

      // Fetch releases, reassignments for the date
      const [releaseSnap, reassignSnap, eventSnap, reservationSnap] = await Promise.all([
        getDocs(collection(db, "roomReleases")),
        getDocs(collection(db, "roomReassignments")),
        getDocs(query(collection(db, "events"), where("date", "==", date))),
        getDocs(
          query(
            collection(db, "reservationRequests"),
            where("date", "==", date),
            where("status", "==", "approved")
          )
        ),
      ]);

      const releases = releaseSnap.docs.map((d) => d.data());
      const reassignments = reassignSnap.docs
        .map((d) => d.data())
        .filter((r) => normalize(r.status) === "approved");
      const events = eventSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const reservations = reservationSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.id !== reservation.id); // exclude self

      // Build release keys
      const releaseKeys = new Set(
        releases
          .filter((r) => r.date === date)
          .map((r) => `${r.scheduleId}_${r.date}`)
      );

      const reassignAwayKeys = new Set(
        reassignments
          .filter((r) => r.date === date && r.oldRoomId)
          .map((r) => `${r.scheduleId}_${r.date}`)
      );

      // Group reassignments by new room
      const reassignIntoMap = {};
      reassignments
        .filter((r) => r.date === date && r.newRoomId)
        .forEach((r) => {
          if (!reassignIntoMap[r.newRoomId]) reassignIntoMap[r.newRoomId] = [];
          reassignIntoMap[r.newRoomId].push(r);
        });

      // For each room, check availability
      const available = [];

      for (const room of roomsList) {
        // Maintenance check
        if (isRoomUnderMaintenance(room, date, startTime, endTime)) continue;

        // Fetch schedules for this room
        const scheduleSnap = await getDocs(
          collection(db, "rooms", room.id, "schedules")
        );
        const schedules = scheduleSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => !s.initialized && s.day === dayAbbrev);

        // Check if any schedule overlaps (skip released & reassigned‑away)
        const hasScheduleConflict = schedules.some((sched) => {
          const key = `${sched.id}_${date}`;
          if (releaseKeys.has(key)) return false;
          if (reassignAwayKeys.has(key)) return false;
          return overlap(startTime, endTime, sched.startTime, sched.endTime);
        });
        if (hasScheduleConflict) continue;

        // Check events
        const hasEventConflict = events.some(
          (e) => e.roomId === room.id && overlap(startTime, endTime, e.startTime, e.endTime)
        );
        if (hasEventConflict) continue;

        // Check other approved reservations
        const hasReservationConflict = reservations.some(
          (r) => r.roomId === room.id && overlap(startTime, endTime, r.startTime, r.endTime)
        );
        if (hasReservationConflict) continue;

        // Check reassigned‑in (they also occupy)
        const reassignInto = reassignIntoMap[room.id] || [];
        const hasReassignConflict = reassignInto.some((r) =>
          overlap(startTime, endTime, r.startTime, r.endTime)
        );
        if (hasReassignConflict) continue;

        // ─── Purpose‑based filters ──────────────────────────────────
        // Equipment (for Hands‑on)
        if (purpose === "Hands-on" && requiredEquipment.length > 0) {
          const roomEquipment = Object.entries(room.equipment || {})
            .filter(([key, value]) => value === true)
            .map(([key]) => key.toLowerCase());

          const hasAllEquipment = requiredEquipment.every((eq) =>
            roomEquipment.includes(eq.toLowerCase())
          );
          if (!hasAllEquipment) continue;
        }

        // Capacity (for Lecture / Examination)
        if ((purpose === "Lecture" || purpose === "Examination") && studentRange) {
          const minCapacity = {
            "30-50": 30,
            "50-60": 50,
            "60-80": 60,
            "80-100": 80,
          }[studentRange] || 0;
          if (Number(room.capacity || 0) < minCapacity) continue;
        }

        // For Organization meetings, we might want capacity too? Not required.

        available.push(room);
      }

      setAvailableRooms(available);

      // If the current selected room is not in available, clear selection
      if (editableFields.roomName && !available.some((r) => r.roomName === editableFields.roomName)) {
        setEditableFields((prev) => ({ ...prev, roomName: "" }));
        setConflictError("The previously selected room is no longer available for the chosen date/time.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  // ─── Re‑fetch available rooms when date/time changes ──────────────
  useEffect(() => {
    if (allRooms.length > 0 && editableFields.date && editableFields.startTime && editableFields.endTime) {
      fetchAvailableRooms(allRooms, editableFields.date, editableFields.startTime, editableFields.endTime);
    }
  }, [editableFields.date, editableFields.startTime, editableFields.endTime, allRooms]);

  // ─── Handle form changes ──────────────────────────────────────────
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setEditableFields((prev) => ({ ...prev, [field]: value }));
    setConflictError("");
  };

  // ─── Check conflicts (for the selected room) ──────────────────────
  const checkConflicts = async () => {
    const { roomName, date, startTime, endTime } = editableFields;
    if (!roomName || !date || !startTime || !endTime) return "Please select a room, date, and time.";

    const room = allRooms.find((r) => r.roomName === roomName);
    if (!room) return "Selected room not found.";

    if (isRoomUnderMaintenance(room, date, startTime, endTime)) {
      return "This room is under maintenance during the selected time.";
    }

    // Check if room is actually available (already filtered, but double-check)
    if (!availableRooms.some((r) => r.roomName === roomName)) {
      return "This room is not available for the selected date/time and purpose.";
    }

    return null;
  };

  // ─── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    showToast("loading", "Saving", "Updating reservation...");

    try {
      const conflict = await checkConflicts();
      if (conflict) {
        setConflictError(conflict);
        showToast("error", "Conflict Detected", conflict);
        setSaving(false);
        return;
      }

      const firebaseUser = auth.currentUser;
      let currentUser = {};
      let deptHeadName = "Department Head";
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          currentUser = userSnap.data();
          deptHeadName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Department Head";
        }
      }

      // Update reservation
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        roomName: editableFields.roomName,
        date: editableFields.date,
        startTime: editableFields.startTime,
        endTime: editableFields.endTime,
        updatedAt: serverTimestamp(),
      });

      // Find room ID
      const room = allRooms.find((r) => r.roomName === editableFields.roomName);
      if (room) {
        await updateDoc(doc(db, "reservationRequests", reservation.id), {
          roomId: room.id,
        });
      }

      // ─── Activity log ─────────────────────────────────────────────
      await logActivity({
        userId: firebaseUser?.uid || "",
        user: deptHeadName,
        role: "Department Head",
        action: "Updated Approved Reservation",
        actionType: "edit",
        target: `${editableFields.roomName} - ${courseTitle}`,
        status: "SUCCESS",
        details: {
          reservationId: reservation.id,
          previous: {
            room: reservation.roomName,
            date: reservation.date,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
          },
          updated: {
            room: editableFields.roomName,
            date: editableFields.date,
            startTime: editableFields.startTime,
            endTime: editableFields.endTime,
          },
        },
      });

      // ─── Notifications ────────────────────────────────────────────

      // 1. Faculty
      let facultyUserId = reservation.userId;
      if (!facultyUserId && facultyName) {
        const user = await findUserByName(facultyName);
        if (user) facultyUserId = user.id;
      }
      if (facultyUserId) {
        await sendNotification(
          facultyUserId,
          "faculty",
          "Reservation Updated",
          `Your reservation for ${editableFields.roomName} on ${editableFields.date} (${editableFields.startTime} - ${editableFields.endTime}) has been updated by Department Head.`,
          "reservation-updated",
          "INFO"
        );
      }

      // 2. Department head (self)
      if (firebaseUser?.uid) {
        await sendNotification(
          firebaseUser.uid,
          "department-head",
          "Reservation Updated",
          `You updated ${facultyName}'s reservation for ${editableFields.roomName}.`,
          "reservation-updated",
          "INFO"
        );
      }

      // 3. All clerks
      const usersSnap = await getDocs(collection(db, "users"));
      const clerkNotifications = [];
      usersSnap.forEach((doc) => {
        const role = normalize(doc.data().role);
        if (role === "clerk") {
          clerkNotifications.push(
            sendNotification(
              doc.id,
              "clerk",
              "Reservation Updated",
              `${facultyName}'s reservation for ${editableFields.roomName} was updated by Department Head.`,
              "reservation-updated",
              "INFO"
            )
          );
        }
      });
      await Promise.all(clerkNotifications);

      setShowSaveModal(false);
      showToast("success", "Success", "Reservation updated successfully!");

      setTimeout(() => {
        navigate("/department-head/reservations");
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast("error", "Error", err.message || "Failed to update reservation.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Redirect if no reservation ────────────────────────────────────
  if (!reservation) {
    return (
      <div className="dh-edit-approved-room">
        <h2>Reservation not found.</h2>
        <button onClick={() => navigate("/department-head/reservations")}>Back</button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="dh-edit-approved-room">
      <i
        className="fa-solid fa-arrow-left dh-edit-approved-back-arrow"
        onClick={() => navigate(-1)}
        style={{ cursor: "pointer", fontSize: "20px", marginBottom: "12px" }}
      ></i>

      <div className="white-box-edit-approved">
        <h2 className="dh-edit-approved-title">Edit Approved Reservation</h2>

        {conflictError && (
          <div className="dh-edit-conflict-banner">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{conflictError}</span>
          </div>
        )}

        <div className="dh-edit-approved-info-grid">
          {/* ─── Read‑only fields ──────────────────────────────────── */}

          <div className="dh-edit-approved-info-box">
            <h3 className="dh-edit-approved-info-box-title">
              <i className="fa-solid fa-user"></i> Requester
            </h3>
            <div className="dh-edit-approved-info-box-content">
              <p><strong>Name:</strong> {facultyName || "Unknown"}</p>
              {audienceType === "Organization" && (
                <p><strong>Organization:</strong> {reservation.attendees?.organization || "N/A"}</p>
              )}
            </div>
          </div>

          <div className="dh-edit-approved-info-box">
            <h3 className="dh-edit-approved-info-box-title">
              <i className="fa-solid fa-book"></i> Course & Audience
            </h3>
            <div className="dh-edit-approved-info-box-content">
              <p><strong>Course Title:</strong> {courseTitle || "N/A"}</p>
              <p><strong>Audience Type:</strong> {audienceType || "N/A"}</p>
              {audienceType === "Class" && (
                <>
                  <p><strong>Course:</strong> {reservation.attendees?.course || "N/A"}</p>
                  <p><strong>Year/Section:</strong> {reservation.attendees?.yearSectionGroup || "N/A"}</p>
                </>
              )}
            </div>
          </div>

          {/* ─── Editable fields ───────────────────────────────────── */}

          <div className="dh-edit-approved-info-box editable">
            <h3 className="dh-edit-approved-info-box-title">
              <i className="fa-solid fa-calendar-days"></i> Room & Schedule
            </h3>
            <div className="dh-edit-approved-info-box-content">
              <div className="dh-edit-approved-form-group">
                <label>Room</label>
                <select
                  className="dh-edit-approved-form-input"
                  value={editableFields.roomName}
                  onChange={handleChange("roomName")}
                  disabled={loadingRooms || loadingAvailable || saving}
                >
                  <option value="">{loadingAvailable ? "Loading available rooms..." : "Select a room"}</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.roomName}>
                      {r.roomName} {r.roomStatus === "maintenance" ? "(Under Maintenance)" : ""}
                    </option>
                  ))}
                </select>
                {loadingAvailable && (
                  <small style={{ color: "#6b7280", marginTop: "4px" }}>
                    <i className="fa-solid fa-spinner fa-spin"></i> Checking availability...
                  </small>
                )}
                {availableRooms.length === 0 && !loadingAvailable && editableFields.date && editableFields.startTime && editableFields.endTime && (
                  <small style={{ color: "#dc2626", marginTop: "4px" }}>
                    No rooms available for the selected date, time, and purpose.
                  </small>
                )}
              </div>

              <div className="dh-edit-approved-form-group">
                <label>Date</label>
                <input
                  type="date"
                  className="dh-edit-approved-form-input"
                  value={editableFields.date}
                  onChange={handleChange("date")}
                  disabled={saving}
                />
              </div>

              <div className="dh-edit-approved-time-row">
                <div className="dh-edit-approved-form-group half">
                  <label>Start Time</label>
                  <input
                    type="time"
                    className="dh-edit-approved-form-input"
                    value={editableFields.startTime}
                    onChange={handleChange("startTime")}
                    disabled={saving}
                  />
                </div>
                <div className="dh-edit-approved-form-group half">
                  <label>End Time</label>
                  <input
                    type="time"
                    className="dh-edit-approved-form-input"
                    value={editableFields.endTime}
                    onChange={handleChange("endTime")}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Purpose (read‑only) ───────────────────────────────── */}
          <div className="dh-edit-approved-info-box">
            <h3 className="dh-edit-approved-info-box-title">
              <i className="fa-solid fa-pen"></i> Purpose
            </h3>
            <div className="dh-edit-approved-info-box-content">
              <p><strong>Purpose:</strong> {purpose || "N/A"}</p>
              {isOtherActivity && customPurpose && (
                <p><strong>Specified Activity:</strong> {customPurpose}</p>
              )}
              {requiredEquipment.length > 0 && (
                <p><strong>Required Equipment:</strong> {requiredEquipment.map(eq => ({
                  projector: "Projector",
                  tvDisplay: "TV Display",
                  ac: "AC",
                  computer: "Computer",
                  smartBoard: "Smart Board"
                }[eq] || eq)).join(", ")}</p>
              )}
              {studentRange && <p><strong>Estimated Attendees:</strong> {studentRange}</p>}
            </div>
          </div>

          {/* ─── Metadata ───────────────────────────────────────────── */}
          <div className="dh-edit-approved-info-box">
            <h3 className="dh-edit-approved-info-box-title">
              <i className="fa-solid fa-circle-info"></i> Metadata
            </h3>
            <div className="dh-edit-approved-info-box-content">
              <p><strong>Status:</strong> <span className="dh-edit-approved-status-badge approved">Approved</span></p>
              <p><strong>Requested On:</strong> {new Date(reservation.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dh-edit-approved-footer">
        <button
          className="dh-edit-approved-back-btn"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          Back
        </button>
        <button
          className="dh-edit-save-btn"
          onClick={() => {
            // Check if room is selected and available
            if (!editableFields.roomName) {
              setConflictError("Please select a room.");
              showToast("error", "Error", "Please select a room.");
              return;
            }
            // Check if the selected room is in available list
            if (!availableRooms.some((r) => r.roomName === editableFields.roomName)) {
              setConflictError("The selected room is not available for the chosen date/time and purpose.");
              showToast("error", "Error", "Selected room is not available.");
              return;
            }
            setShowSaveModal(true);
          }}
          disabled={saving || loadingAvailable}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {showSaveModal && (
        <SavePopup
          onCancel={() => setShowSaveModal(false)}
          onConfirm={handleSave}
        />
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}

export default DepartmentHeadEditApprovedReservation;