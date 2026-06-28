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
  where
} from "firebase/firestore";

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

export default function RoomActivity() {
  const navigate = useNavigate();
  const [toast, setToast] = useState({
    show:false,
    type:"success",
    title:"",
    message:"",
  });

  const showToast = (type,title,message)=>{
      setToast({
        show:true,
        type,
        title,
        message
      });

      if(type!=="loading"){
          setTimeout(()=>{
              setToast(prev=>({...prev,show:false}));
          },4000);
      }
  };

  const [rooms, setRooms] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

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

      if (
        !form.room ||
        !form.date ||
        !form.startTime ||
        !form.endTime
      )
        return;

      const room = rooms.find(
        (r) => r.roomName === form.room
      );

      if (!room) return;

      const schedulesRef = collection(
        db,
        "rooms",
        room.id,
        "schedules"
      );

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

          return overlap(
            reqStart,
            reqEnd,
            parseTime(s.startTime),
            parseTime(s.endTime)
          );
        });

      console.log(found);

      setConflicts(found);
    };

    checkConflict();
  }, [form, rooms]);
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
    return null;
  };

  // ---------------- OVERRIDE ----------------
  const handleConfirm = async () => {
  try {

    const err = validate();

    if (err) {
      setError(err);
      return;
    }

    const roomDoc = rooms.find(
      r => r.roomName === form.room
    );

    if (!roomDoc) {
      showToast("error", "Error", "Room not found");
      return;
    }

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

      createdAt: serverTimestamp()

    });

    // -----------------------------
    // SEND NOTIFICATION TO FACULTIES
    // -----------------------------

    const usersSnap = await getDocs(collection(db, "users"));

    for (const conflict of conflicts) {

      if (!conflict.faculty) continue;

      const scheduleName = normalizeName(conflict.faculty);

      const facultyUser = usersSnap.docs.find(doc => {

        const user = doc.data();

        const accountName = normalizeName(
          `${user.lastName}, ${user.firstName}${user.middleInitial ? ` ${user.middleInitial}` : ""}`
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

        message:
          `${form.title} will use ${roomDoc.roomName} on ${form.date} (${form.startTime}-${form.endTime}). Your scheduled class may be affected.`,

        type: "room-activity",

        unread: true,

        archived: false,

        badge: "NEW",

        activityTitle: form.title,

        roomName: roomDoc.roomName,

        activityDate: form.date,

        activityStart: form.startTime,

        activityEnd: form.endTime,

        createdAt: serverTimestamp()

      });

    }

    showToast(
      "success",
      "Success",
      "Room Activity Created!"
    );

    setShowModal(false);

  } catch (error) {

    console.error(error);

    showToast(
      "error",
      "Firestore Error",
      error.message
    );

  }
};

  return (
    <div className="ra-page">

      <h1 className="ra-title">Room Activity</h1>
      <div className="ra-header">
              <p className="ra-subtitle">
                  Create a room activity request and override existing reservations when authorized.
              </p>
          </div>
      {/* ERROR */}
      {error && <div className="ra-error">{error}</div>}

      <div className="ra-layout">

        {/* FORM */}
        <div className="ra-card">
          <div className="ra-card-title">Activity Details</div>
          
          <div className="ra-form">

            <div className="ra-field">
                <label>
                    <i className="fa-solid fa-bookmark"></i>
                    Activity Title
                </label>

                <input
                    className="ra-input"
                    placeholder="Activity Title"
                    value={form.title}
                    onChange={handleChange("title")}
                />
            </div>

            <div className="ra-field">
                <label>
                  <i className="fa-solid fa-door-open"></i>
                  Room
                </label>

                <select
                  value={form.room}
                  onChange={handleChange("room")}
                  className="ra-input"
                >
                  <option value="">Select Room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.roomName}>
                      {r.roomName}
                    </option>
                  ))}
                </select>
              </div>

            <div className="ra-field">
              <label>
                <i className="fa-solid fa-calendar-days"></i>
                Date
              </label>

              <input
                type="date"
                className="ra-input"
                value={form.date}
                onChange={handleChange("date")}
              />
            </div>

            <div className="ra-row">

              <div className="ra-field">
                <label>
                  <i className="fa-solid fa-clock"></i>
                  Start Time
                </label>

                <input
                  type="time"
                  className="ra-input"
                  value={form.startTime}
                  onChange={handleChange("startTime")}
                />
              </div>

              <div className="ra-field">
                <label>
                  <i className="fa-solid fa-clock"></i>
                  End Time
                </label>

                <input
                  type="time"
                  className="ra-input"
                  value={form.endTime}
                  onChange={handleChange("endTime")}
                />
              </div>

            </div>

            <div className="ra-field">
              <label>
                <i className="fa-solid fa-pen"></i>
                Reason
              </label>

              <textarea
                value={form.reason}
                onChange={handleChange("reason")}
                className="ra-textarea"
                placeholder="Enter reason..."
              />
            </div>
          </div>

          <div className="ra-footer">
              <button
                  className="ra-confirm-btn"
                  onClick={() => setShowModal(true)}
              >
                  Confirm Override
              </button>
          </div>
        </div>

        {/* CONFLICT */}
        {conflicts.length > 0 && (
          <div className="ra-conflict-card">
            <h3>⚠ Conflict Detected</h3>

            {conflicts.map((c) => (
              <div key={c.id} className="ra-conflict-item">
                <div>
                  <b>{c.title}</b>
                  <div>{c.startTime} - {c.endTime}</div>
                </div>

                <button
                  className="ra-reassign-btn"
                  onClick={() =>
                    navigate("/department-head/reassign-room")
                  }
                >
                  REASSIGN
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="ra-modal-overlay">
          <div className="ra-modal">

            <h3>Confirm Override?</h3>

            <button
              className="ra-modal-cancel"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>

            <button
              className="ra-modal-confirm"
              onClick={handleConfirm}
            >
              Confirm
            </button>

          </div>
        </div>
      )}
      <Toast
          show={toast.show}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() =>
            setToast(prev=>({...prev,show:false}))
          }
      />

    </div>
  );
}