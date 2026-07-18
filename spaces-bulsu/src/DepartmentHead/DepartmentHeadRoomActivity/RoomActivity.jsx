import { useState, useEffect } from "react";
import "./room-activity.css";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";
import {
  collection,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

import { auth } from "../../firebase";
import { logActivity } from "../../utils/logActivity";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";

function parseTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

const normalizeName = (name = "") => {
  return name
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

// ---------------- DISPLAY HELPERS ----------------
function formatTime12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDuration(start, end) {
  const s = parseTime(start);
  const e = parseTime(end);
  if (s == null || e == null || e <= s) return "";
  const mins = e - s;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function RoomActivity() {
  const navigate = useNavigate();
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    if (type !== "loading") {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    }
  };

  const [rooms, setRooms] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    room: "",
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [maintenanceBlocked, setMaintenanceBlocked] = useState(false);

  // ---------------- FIREBASE ROOMS ----------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRooms(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ---------------- CONFLICT DETECTION ----------------
  useEffect(() => {
    const checkConflict = async () => {
      setError("");

      if (!form.room || !form.date || !form.startTime || !form.endTime) {
        setConflicts([]);
        return;
      }

      const room = rooms.find((r) => r.roomName === form.room);

      if (!room) return;

      setCheckingConflicts(true);

      const schedulesRef = collection(db, "rooms", room.id, "schedules");

      const snap = await getDocs(schedulesRef);

      const reqStart = parseTime(form.startTime);
      const reqEnd = parseTime(form.endTime);

      const day = new Date(form.date)
        .toLocaleDateString("en-US", {
          weekday: "short",
        })
        .toUpperCase();

      const found = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((s) => {
          if (s.day !== day) return false;

          return overlap(reqStart, reqEnd, parseTime(s.startTime), parseTime(s.endTime));
        });

      setConflicts(found);
      setCheckingConflicts(false);
    };

    checkConflict();
  }, [form, rooms]);

  // ---------------- MAINTENANCE CHECK ----------------
  // Hindi dapat makapag-override ang department head sa isang room na
  // naka-maintenance sa loob ng hinihiling na petsa/oras.
  useEffect(() => {
    if (!form.room || !form.date || !form.startTime || !form.endTime) {
      setMaintenanceBlocked(false);
      return;
    }

    const room = rooms.find((r) => r.roomName === form.room);

    if (!room) {
      setMaintenanceBlocked(false);
      return;
    }

    setMaintenanceBlocked(
      isRoomUnderMaintenance(room, form.date, form.startTime, form.endTime)
    );
  }, [form.room, form.date, form.startTime, form.endTime, rooms]);

  // ---------------- INPUT ----------------
  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // ---------------- VALIDATION ----------------
  const validate = () => {
    if (!form.title) return "Title is required";
    if (!form.room) return "Please select a room";
    if (!form.date) return "Date is required";
    if (!form.startTime || !form.endTime) return "Time is required";
    if (parseTime(form.startTime) >= parseTime(form.endTime))
      return "Invalid time range";
    if (maintenanceBlocked)
      return "This room is under maintenance during the selected date/time.";
    return null;
  };

  const canSubmit =
    form.title && form.room && form.date && form.startTime && form.endTime;

  // ---------------- OVERRIDE ----------------
  const handleConfirm = async () => {
    try {
      const err = validate();

      if (err) {
        setError(err);
        return;
      }

      const roomDoc = rooms.find((r) => r.roomName === form.room);

      if (!roomDoc) {
        showToast("error", "Error", "Room not found");
        return;
      }

      if (isRoomUnderMaintenance(roomDoc, form.date, form.startTime, form.endTime)) {
        showToast(
          "error",
          "Room Unavailable",
          "This room is under maintenance during the selected date/time."
        );
        return;
      }

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        showToast("error", "Error", "No authenticated user.");
        return;
      }

      setSubmitting(true);

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

      const currentUser = userSnap.data();

      const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();

      // create room activity
      await addDoc(collection(db, "events"), {
        roomId: roomDoc.id,
        roomName: roomDoc.roomName,

        title: form.title,
        reason: form.reason,

        date: form.date,

        startTime: form.startTime,
        endTime: form.endTime,

        status: "active",

        createdAt: serverTimestamp(),
      });

      await logActivity({
        userId: firebaseUser.uid,
        user: fullName,
        role: currentUser.role,

        action: "Created Room Activity",
        actionType: "success",

        target: `${form.title} (${roomDoc.roomName})`,
        status: "SUCCESS",

        details: {
          room: roomDoc.roomName,
          title: form.title,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          reason: form.reason,
        },
      });

      // -----------------------------
      // SEND NOTIFICATION TO FACULTIES
      // -----------------------------

      const usersSnap = await getDocs(collection(db, "users"));

      for (const conflict of conflicts) {
        if (!conflict.faculty) continue;

        const scheduleName = normalizeName(conflict.faculty);

        const facultyUser = usersSnap.docs.find((doc) => {
          const user = doc.data();

          const accountName = normalizeName(
            `${user.lastName}, ${user.firstName}${
              user.middleInitial ? ` ${user.middleInitial}` : ""
            }`
          );

          return accountName === scheduleName;
        });

        if (!facultyUser) {
          console.log("Faculty not found:", conflict.faculty);
          continue;
        }

        await addDoc(collection(db, "notifications"), {
          userId: facultyUser.id,

          title: "Room Activity Override",

          message: `${form.title} will use ${roomDoc.roomName} on ${form.date} (${form.startTime}-${form.endTime}). Your scheduled class may be affected.`,

          type: "room-activity",

          unread: true,

          archived: false,

          badge: "NEW",

          activityTitle: form.title,

          roomName: roomDoc.roomName,

          activityDate: form.date,

          activityStart: form.startTime,

          activityEnd: form.endTime,

          createdAt: serverTimestamp(),
        });
      }

      showToast("success", "Success", "Room Activity Created!");

      setShowModal(false);
      setForm({
        title: "",
        room: "",
        date: "",
        startTime: "",
        endTime: "",
        reason: "",
      });
    } catch (error) {
      console.error(error);

      showToast("error", "Firestore Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.roomName === form.room);
  const duration = formatDuration(form.startTime, form.endTime);

  return (
    <div className="ra-page">
      <div className="ra-header">
        <div>
          <h1 className="ra-title">Room Activity</h1>
          <p className="ra-subtitle">
            Create a room activity request and override existing reservations
            when authorized.
          </p>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="ra-banner ra-banner-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}

      {/* MAINTENANCE WARNING */}
      {maintenanceBlocked && !error && (
        <div className="ra-banner ra-banner-warning">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            This room is under maintenance during the selected date/time.
            Please choose another room or time.
          </span>
        </div>
      )}

      <div className="ra-layout">
        {/* FORM */}
        <div className="ra-card">
          <div className="ra-card-title">
            <span className="ra-card-bar"></span>
            Activity Details
          </div>

          <div className="ra-form">
            <div className="ra-field">
              <label htmlFor="ra-title">Activity Title</label>
              <div className="ra-icon-input">
                <i className="fa-solid fa-bookmark"></i>
                <input
                  id="ra-title"
                  className="ra-plain-input"
                  placeholder="e.g. Freshmen Orientation"
                  value={form.title}
                  onChange={handleChange("title")}
                />
              </div>
            </div>

            <div className="ra-field">
              <label htmlFor="ra-room">Room</label>
              <div className="ra-select-wrap">
                <i className="fa-solid fa-door-closed"></i>
                <select
                  id="ra-room"
                  value={form.room}
                  onChange={handleChange("room")}
                  className="ra-select"
                  disabled={loading}
                >
                  <option value="">
                    {loading ? "Loading rooms…" : "Select room"}
                  </option>
                  {rooms.map((r) => {
                    const underMaintenance =
                      String(r.roomStatus || "").toLowerCase() === "maintenance";
                    return (
                      <option key={r.id} value={r.roomName}>
                        {r.roomName}
                        {underMaintenance ? " (Under Maintenance)" : ""}
                      </option>
                    );
                  })}
                </select>
                <i className="fa-solid fa-chevron-down ra-chevron"></i>
              </div>
            </div>

            <div className="ra-field">
              <label htmlFor="ra-date">Date</label>
              <div className="ra-icon-input">
                <i className="fa-solid fa-calendar-days"></i>
                <input
                  id="ra-date"
                  type="date"
                  className="ra-plain-input"
                  value={form.date}
                  onChange={handleChange("date")}
                />
              </div>
              {form.date && (
                <span className="ra-hint">{formatDateLong(form.date)}</span>
              )}
            </div>

            <div className="ra-row">
              <div className="ra-field">
                <label htmlFor="ra-start">Start Time</label>
                <div className="ra-icon-input">
                  <i className="fa-solid fa-clock"></i>
                  <input
                    id="ra-start"
                    type="time"
                    className="ra-plain-input"
                    value={form.startTime}
                    onChange={handleChange("startTime")}
                  />
                </div>
              </div>

              <div className="ra-field">
                <label htmlFor="ra-end">End Time</label>
                <div className="ra-icon-input">
                  <i className="fa-solid fa-clock"></i>
                  <input
                    id="ra-end"
                    type="time"
                    className="ra-plain-input"
                    value={form.endTime}
                    onChange={handleChange("endTime")}
                  />
                </div>
              </div>
            </div>

            {duration && (
              <div className="ra-duration-chip">
                <i className="fa-solid fa-hourglass-half"></i>
                Duration: {duration}
              </div>
            )}

            <div className="ra-field">
              <label htmlFor="ra-reason">Reason</label>
              <textarea
                id="ra-reason"
                value={form.reason}
                onChange={handleChange("reason")}
                className="ra-textarea"
                placeholder="Briefly explain why this activity needs the room…"
              />
            </div>
          </div>

          <div className="ra-footer">
            <button
              className="ra-confirm-btn"
              onClick={() => setShowModal(true)}
              disabled={maintenanceBlocked || !canSubmit}
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              Confirm Override
            </button>
          </div>
        </div>

        {/* CONFLICT */}
        <div className="ra-side">
          {selectedRoom && (
            <div className="ra-room-summary">
              <div className="ra-room-summary-header">
                <i className="fa-solid fa-building"></i>
                <span>{selectedRoom.roomName}</span>
              </div>
              <div
                className={`ra-status-pill ${
                  String(selectedRoom.roomStatus || "").toLowerCase() ===
                  "maintenance"
                    ? "is-maintenance"
                    : "is-available"
                }`}
              >
                {String(selectedRoom.roomStatus || "").toLowerCase() ===
                "maintenance"
                  ? "Under Maintenance"
                  : "Available"}
              </div>
            </div>
          )}

          {checkingConflicts && (
            <div className="ra-checking">
              <span className="ra-spinner" />
              Checking existing schedules…
            </div>
          )}

          {!checkingConflicts && conflicts.length > 0 && (
            <div className="ra-conflict-card">
              <div className="ra-conflict-title">
                <i className="fa-solid fa-triangle-exclamation"></i>
                {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""}{" "}
                Detected
              </div>
              <p className="ra-conflict-desc">
                These existing schedules overlap with your requested time.
                Confirming will notify the affected faculty.
              </p>

              <div className="ra-conflict-list">
                {conflicts.map((c) => (
                  <div key={c.id} className="ra-conflict-item">
                    <div>
                      <div className="ra-conflict-code">{c.title || "Untitled Schedule"}</div>
                      <div className="ra-conflict-time">
                        {formatTime12(c.startTime)} – {formatTime12(c.endTime)}
                        {c.faculty ? ` · ${c.faculty}` : ""}
                      </div>
                    </div>

                    <button
                      className="ra-reassign-btn"
                      onClick={() => navigate("/department-head/reassign-room")}
                    >
                      Reassign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!checkingConflicts &&
            conflicts.length === 0 &&
            form.room &&
            form.date &&
            form.startTime &&
            form.endTime &&
            !maintenanceBlocked && (
              <div className="ra-clear-card">
                <i className="fa-solid fa-circle-check"></i>
                No conflicts for this room and time.
              </div>
            )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="ra-modal-overlay" role="dialog" aria-modal="true">
          <div className="ra-modal">
            <div className="ra-modal-icon">
              <i className="fa-solid fa-right-to-bracket"></i>
            </div>

            <h3 className="ra-modal-title">Confirm Override?</h3>
            <p className="ra-modal-text">
              {conflicts.length > 0
                ? `This will override ${conflicts.length} existing schedule${
                    conflicts.length > 1 ? "s" : ""
                  } and notify the affected faculty.`
                : "This room activity will be created."}
            </p>

            <div className="ra-modal-summary">
              <div className="ra-modal-summary-row">
                <i className="fa-solid fa-bookmark"></i>
                <span>{form.title || "Untitled activity"}</span>
              </div>
              <div className="ra-modal-summary-row">
                <i className="fa-solid fa-door-open"></i>
                <span>{form.room}</span>
              </div>
              <div className="ra-modal-summary-row">
                <i className="fa-solid fa-calendar-days"></i>
                <span>{formatDateLong(form.date)}</span>
              </div>
              <div className="ra-modal-summary-row">
                <i className="fa-solid fa-clock"></i>
                <span>
                  {formatTime12(form.startTime)} – {formatTime12(form.endTime)}
                  {duration ? ` (${duration})` : ""}
                </span>
              </div>
            </div>

            <div className="ra-modal-actions">
              <button
                className="ra-modal-cancel"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                className="ra-modal-confirm"
                onClick={handleConfirm}
                disabled={maintenanceBlocked || submitting}
              >
                {submitting ? (
                  <>
                    <span className="ra-spinner ra-spinner-light" />
                    Creating…
                  </>
                ) : (
                  "Confirm"
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
    </div>
  );
}