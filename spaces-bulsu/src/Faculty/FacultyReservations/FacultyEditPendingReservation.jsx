import "./faculty-edit-pending-reservation.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
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

function FacultyEditPendingReservation() {
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
    purpose: "",
    studentRange: "",
    requiredEquipment: [],
  });

  const [allRooms, setAllRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [conflictError, setConflictError] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Read‑only fields ─────────────────────────────────────────────
  const facultyName = reservation?.facultyName || reservation?.requesterName || "";
  const audienceType = reservation?.audienceType || "";
  const courseTitle = reservation?.courseTitle || "";
  const course = reservation?.attendees?.course || "";
  const yearSectionGroup = reservation?.attendees?.yearSectionGroup || "";
  const organization = reservation?.attendees?.organization || "";

  // ─── Load initial data ─────────────────────────────────────────────
  useEffect(() => {
    if (!reservation) {
      navigate("/faculty/reservations");
      return;
    }

    setEditableFields({
      roomName: reservation.roomName || "",
      date: reservation.date || "",
      startTime: reservation.startTime || "",
      endTime: reservation.endTime || "",
      purpose: reservation.purpose || "",
      studentRange: reservation.studentRange || "",
      requiredEquipment: reservation.requiredEquipment || [],
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
      const purpose = editableFields.purpose;
      const studentRange = editableFields.studentRange;
      const requiredEquipment = editableFields.requiredEquipment;

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

  // ─── Re‑fetch available rooms when date/time/purpose changes ──────
  useEffect(() => {
    if (allRooms.length > 0 && editableFields.date && editableFields.startTime && editableFields.endTime) {
      fetchAvailableRooms(allRooms, editableFields.date, editableFields.startTime, editableFields.endTime);
    }
  }, [editableFields.date, editableFields.startTime, editableFields.endTime, editableFields.purpose, editableFields.studentRange, editableFields.requiredEquipment]);

  // ─── Handle form changes ──────────────────────────────────────────
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setEditableFields((prev) => ({ ...prev, [field]: value }));
    setConflictError("");
  };

  const handleEquipmentChange = (e) => {
    const value = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
    setEditableFields((prev) => ({ ...prev, requiredEquipment: value }));
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
      let facultyNameFull = "Faculty";
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          currentUser = userSnap.data();
          facultyNameFull = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Faculty";
        }
      }

      // Find room ID
      const room = allRooms.find((r) => r.roomName === editableFields.roomName);
      const roomId = room ? room.id : null;

      // Update reservation
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        roomName: editableFields.roomName,
        roomId: roomId || reservation.roomId,
        date: editableFields.date,
        startTime: editableFields.startTime,
        endTime: editableFields.endTime,
        purpose: editableFields.purpose,
        studentRange: editableFields.studentRange,
        requiredEquipment: editableFields.requiredEquipment,
        updatedAt: serverTimestamp(),
      });

      // ─── Activity log ─────────────────────────────────────────────
      await logActivity({
        userId: firebaseUser?.uid || "",
        user: facultyNameFull,
        role: "Faculty",
        action: "Updated Pending Reservation",
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
            purpose: reservation.purpose,
          },
          updated: {
            room: editableFields.roomName,
            date: editableFields.date,
            startTime: editableFields.startTime,
            endTime: editableFields.endTime,
            purpose: editableFields.purpose,
          },
        },
      });

      // ─── Notifications ────────────────────────────────────────────

      // 1. Faculty (self)
      if (firebaseUser?.uid) {
        await sendNotification(
          firebaseUser.uid,
          "faculty",
          "Reservation Updated",
          `Your reservation for ${editableFields.roomName} on ${editableFields.date} (${editableFields.startTime} - ${editableFields.endTime}) has been updated.`,
          "reservation-updated",
          "INFO"
        );
      }

      // 2. All clerks and department heads
      const usersSnap = await getDocs(collection(db, "users"));
      const adminNotifications = [];
      usersSnap.forEach((doc) => {
        const role = normalize(doc.data().role);
        if (role === "clerk" || role === "department-head") {
          adminNotifications.push(
            sendNotification(
              doc.id,
              role === "clerk" ? "clerk" : "department-head",
              "Reservation Updated",
              `${facultyNameFull} updated their reservation for ${editableFields.roomName}.`,
              "reservation-updated",
              "INFO"
            )
          );
        }
      });
      await Promise.all(adminNotifications);

      setShowSaveModal(false);
      showToast("success", "Success", "Reservation updated successfully!");

      setTimeout(() => {
        navigate("/faculty/reservations");
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
      <div className="faculty-edit-pending-room">
        <h2>Reservation not found.</h2>
        <button onClick={() => navigate("/faculty/reservations")}>Back</button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="faculty-edit-pending-room">
      <i
        className="fa-solid fa-arrow-left faculty-edit-pending-back-arrow"
        onClick={() => navigate(-1)}
        style={{ cursor: "pointer", fontSize: "20px", marginBottom: "12px" }}
      ></i>

      <div className="white-box-edit-pending">
        <h2 className="faculty-edit-pending-title">Edit Pending Reservation</h2>

        {conflictError && (
          <div className="faculty-edit-conflict-banner">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{conflictError}</span>
          </div>
        )}

        <div className="faculty-edit-pending-info-grid">
          {/* ─── Read‑only fields ──────────────────────────────────── */}

          <div className="faculty-edit-pending-info-box">
            <h3 className="faculty-edit-pending-info-box-title">
              <i className="fa-solid fa-user"></i> Requester
            </h3>
            <div className="faculty-edit-pending-info-box-content">
              <p><strong>Name:</strong> {facultyName || "Unknown"}</p>
              {audienceType === "Organization" && (
                <p><strong>Organization:</strong> {organization || "N/A"}</p>
              )}
            </div>
          </div>

          <div className="faculty-edit-pending-info-box">
            <h3 className="faculty-edit-pending-info-box-title">
              <i className="fa-solid fa-book"></i> Course & Audience
            </h3>
            <div className="faculty-edit-pending-info-box-content">
              <p><strong>Course Title:</strong> {courseTitle || "N/A"}</p>
              <p><strong>Audience Type:</strong> {audienceType || "N/A"}</p>
              {audienceType === "Class" && (
                <>
                  <p><strong>Course:</strong> {course || "N/A"}</p>
                  <p><strong>Year/Section:</strong> {yearSectionGroup || "N/A"}</p>
                </>
              )}
            </div>
          </div>

          {/* ─── Editable fields ───────────────────────────────────── */}

          <div className="faculty-edit-pending-info-box editable">
            <h3 className="faculty-edit-pending-info-box-title">
              <i className="fa-solid fa-calendar-days"></i> Room & Schedule
            </h3>
            <div className="faculty-edit-pending-info-box-content">
              <div className="faculty-edit-pending-form-group">
                <label>Room</label>
                <select
                  className="faculty-edit-pending-form-input"
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

              <div className="faculty-edit-pending-form-group">
                <label>Date</label>
                <input
                  type="date"
                  className="faculty-edit-pending-form-input"
                  value={editableFields.date}
                  onChange={handleChange("date")}
                  disabled={saving}
                />
              </div>

              <div className="faculty-edit-pending-time-row">
                <div className="faculty-edit-pending-form-group half">
                  <label>Start Time</label>
                  <input
                    type="time"
                    className="faculty-edit-pending-form-input"
                    value={editableFields.startTime}
                    onChange={handleChange("startTime")}
                    disabled={saving}
                  />
                </div>
                <div className="faculty-edit-pending-form-group half">
                  <label>End Time</label>
                  <input
                    type="time"
                    className="faculty-edit-pending-form-input"
                    value={editableFields.endTime}
                    onChange={handleChange("endTime")}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Editable: Purpose & Details ───────────────────────── */}
          <div className="faculty-edit-pending-info-box editable">
            <h3 className="faculty-edit-pending-info-box-title">
              <i className="fa-solid fa-pen"></i> Purpose & Details
            </h3>
            <div className="faculty-edit-pending-info-box-content">
              <div className="faculty-edit-pending-form-group">
                <label>Purpose</label>
                <select
                  className="faculty-edit-pending-form-input"
                  value={editableFields.purpose}
                  onChange={handleChange("purpose")}
                  disabled={saving}
                >
                  <option value="">Select Purpose</option>
                  <option value="Lecture">Lecture</option>
                  <option value="Hands-on">Hands-on</option>
                  <option value="Examination">Examination</option>
                </select>
              </div>

              {editableFields.purpose === "Hands-on" && (
                <div className="faculty-edit-pending-form-group">
                  <label>Required Equipment (comma separated)</label>
                  <input
                    type="text"
                    className="faculty-edit-pending-form-input"
                    placeholder="e.g. Projector, Computer"
                    value={editableFields.requiredEquipment.join(", ")}
                    onChange={handleEquipmentChange}
                    disabled={saving}
                  />
                </div>
              )}

              {(editableFields.purpose === "Lecture" || editableFields.purpose === "Examination") && (
                <div className="faculty-edit-pending-form-group">
                  <label>Estimated Number of Students</label>
                  <select
                    className="faculty-edit-pending-form-input"
                    value={editableFields.studentRange}
                    onChange={handleChange("studentRange")}
                    disabled={saving}
                  >
                    <option value="">Select Range</option>
                    <option value="30-50">30 - 50</option>
                    <option value="50-60">50 - 60</option>
                    <option value="60-80">60 - 80</option>
                    <option value="80-100">80 - 100</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ─── Metadata ───────────────────────────────────────────── */}
          <div className="faculty-edit-pending-info-box">
            <h3 className="faculty-edit-pending-info-box-title">
              <i className="fa-solid fa-circle-info"></i> Metadata
            </h3>
            <div className="faculty-edit-pending-info-box-content">
              <p><strong>Status:</strong> <span className="faculty-edit-pending-status-badge pending">Pending</span></p>
              <p><strong>Requested On:</strong> {new Date(reservation.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="faculty-edit-pending-footer">
        <button
          className="faculty-edit-pending-back-btn"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          Back
        </button>
        <button
          className="faculty-edit-pending-save-btn"
          onClick={() => {
            if (!editableFields.roomName) {
              setConflictError("Please select a room.");
              showToast("error", "Error", "Please select a room.");
              return;
            }
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

export default FacultyEditPendingReservation;