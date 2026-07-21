import { useEffect, useMemo, useState, useRef } from "react";
import "./WalkInReservation.css";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";
import { logActivity } from "../../utils/logActivity";
import Toast from "../../Popup/Toast/Toast";
import { useNavigate } from "react-router-dom";

// ─── Constants ───────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split("T")[0];
const MIN_HOUR = 7;   // 7:00 AM
const MAX_HOUR = 20;  // 8:00 PM

// ─── Helpers ────────────────────────────────────────────────────────
const convertToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const convertToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const formatTime12 = (time) => {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const overlap = (aStart, aEnd, bStart, bEnd) => {
  return convertToMinutes(aStart) < convertToMinutes(bEnd) &&
         convertToMinutes(aEnd) > convertToMinutes(bStart);
};

const getTodayLocal = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const normalize = (value) => value?.toString().trim().toLowerCase();

// ─── Main Component ──────────────────────────────────────────────────
export default function WalkInReservation() {
  const navigate = useNavigate();
  const toastTimeoutRef = useRef(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [savingReservation, setSavingReservation] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // ─── Toast state ────────────────────────────────────────────────────
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      toastTimeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
        toastTimeoutRef.current = null;
      }, 4000);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ─── State ──────────────────────────────────────────────────────
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [releases, setReleases] = useState([]);
  const [reassignments, setReassignments] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({});

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [floor, setFloor] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [form, setForm] = useState({
    requesterType: "",
    requesterId: "",
    requesterName: "",
    organizationName: "",
    purpose: "",
    customPurpose: "",
    course: "",
    yearSectionGroup: "",
    studentRange: "", // Added for attendees count
    date: TODAY,
    duration: "",
    endTime: "",
    startTime: "",
  });

  const today = getTodayLocal();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTime = useMemo(() => {
    return String(now.getHours()).padStart(2, "0") + ":" +
           String(now.getMinutes()).padStart(2, "0");
  }, []);

  // ─── Listeners ──────────────────────────────────────────────────

  // 1. Rooms
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRooms(data);
      setLoadingRooms(false);
    });
    return unsub;
  }, []);

  // 2. Room schedules (per room)
  useEffect(() => {
    if (rooms.length === 0) return;
    const unsubs = rooms.map((room) =>
      onSnapshot(
        collection(db, "rooms", room.id, "schedules"),
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => !s.initialized);
          setRoomSchedules((prev) => ({
            ...prev,
            [room.id]: list,
          }));
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [rooms.map((r) => r.id).join(",")]);

  // 3. Events (room activities)
  useEffect(() => {
    const q = query(collection(db, "events"), where("date", "==", today));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoadingSchedule(false);
    });
    return unsub;
  }, [today]);

  // 4. Approved reservations (case‑insensitive)
  useEffect(() => {
    const q = query(
      collection(db, "reservationRequests"),
      where("date", "==", today)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((r) => normalize(r.status) === "approved");
      setReservations(data);
    });
    return unsub;
  }, [today]);

  // 5. Room releases
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "roomReleases"), (snap) => {
      setReleases(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // 6. Room reassignments (approved only)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "roomReassignments"), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => normalize(r.status) === "approved");
      setReassignments(data);
    });
    return unsub;
  }, []);

  // ─── Build busy items for a room on a given date ────────────────

  const getBusyItemsForRoom = (roomId, date, dayAbbrev) => {
    const items = [];

    const schedules = roomSchedules[roomId] || [];
    const releaseKeys = new Set(
      releases
        .filter((r) => r.roomId === roomId && r.date === date)
        .map((r) => `${r.scheduleId}_${r.date}`)
    );
    const reassignAwayKeys = new Set(
      reassignments
        .filter((r) => r.oldRoomId === roomId && r.date === date)
        .map((r) => `${r.scheduleId}_${r.date}`)
    );

    schedules
      .filter((s) => s.day === dayAbbrev)
      .filter((s) => {
        const key = `${s.id}_${date}`;
        return !releaseKeys.has(key) && !reassignAwayKeys.has(key);
      })
      .forEach((s) => {
        items.push({
          startTime: s.startTime,
          endTime: s.endTime,
          label: s.subject || "Class",
          source: "schedule",
        });
      });

    events
      .filter((e) => e.roomId === roomId && e.date === date)
      .forEach((e) => {
        items.push({
          startTime: e.startTime,
          endTime: e.endTime,
          label: e.title || e.purpose || "Room Activity",
          source: "event",
        });
      });

    reservations
      .filter((r) => r.roomId === roomId && r.date === date)
      .forEach((r) => {
        items.push({
          startTime: r.startTime,
          endTime: r.endTime,
          label: r.customPurpose || r.courseTitle || r.purpose || "Reservation",
          source: "reservation",
        });
      });

    reassignments
      .filter((r) => r.newRoomId === roomId && r.date === date)
      .forEach((r) => {
        items.push({
          startTime: r.startTime,
          endTime: r.endTime,
          label: `${r.courseTitle || "Class"} (Moved)`,
          source: "reassignment",
        });
      });

    return items.sort((a, b) => convertToMinutes(a.startTime) - convertToMinutes(b.startTime));
  };

  // ─── Available Rooms ──────────────────────────────────────────────

  const getDayAbbrev = () => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[new Date(today).getDay()];
  };

  const availableRooms = useMemo(() => {
    const dayAbbrev = getDayAbbrev();
    const start = currentMinutes;

    return rooms
      .map((room) => {
        if (isRoomUnderMaintenance(room, today, currentTime, currentTime)) {
          return null;
        }

        const busy = getBusyItemsForRoom(room.id, today, dayAbbrev);
        const occupied = busy.find(
          (item) =>
            start >= convertToMinutes(item.startTime) &&
            start < convertToMinutes(item.endTime)
        );
        if (occupied) return null;

        const nextBusy = busy.find(
          (item) => convertToMinutes(item.startTime) > start
        );
        const availableUntil = nextBusy ? nextBusy.startTime : "23:59";

        const maxAllowedEnd = Math.min(
          convertToMinutes(availableUntil),
          MAX_HOUR * 60
        );
        const maxMinutes = maxAllowedEnd - start;
        if (maxMinutes < 30) return null;

        return {
          ...room,
          availableUntil: convertToTime(maxAllowedEnd),
          maxMinutes,
        };
      })
      .filter(Boolean);
  }, [rooms, roomSchedules, events, reservations, releases, reassignments, today, currentMinutes, currentTime]);

  // ─── Live Availability (for right panel) ─────────────────────────

  const liveAvailability = useMemo(() => {
    const dayAbbrev = getDayAbbrev();
    return rooms.map((room) => {
      if (isRoomUnderMaintenance(room, today, currentTime, currentTime)) {
        return { ...room, maintenance: true, available: false };
      }

      const busy = getBusyItemsForRoom(room.id, today, dayAbbrev);

      const current = busy.find(
        (item) =>
          currentMinutes >= convertToMinutes(item.startTime) &&
          currentMinutes < convertToMinutes(item.endTime)
      );

      if (current) {
        const nextReservation = busy.find(
          (item) => convertToMinutes(item.startTime) > convertToMinutes(current.endTime)
        );
        return {
          ...room,
          maintenance: false,
          available: false,
          nextAvailable: current.endTime,
          nextBusyStart: nextReservation ? nextReservation.startTime : "23:59",
        };
      }

      const upcoming = busy.find(
        (item) => convertToMinutes(item.startTime) > currentMinutes
      );
      return {
        ...room,
        maintenance: false,
        available: true,
        availableFrom: currentTime,
        availableUntil: upcoming ? upcoming.startTime : "23:59",
      };
    });
  }, [rooms, roomSchedules, events, reservations, releases, reassignments, today, currentMinutes, currentTime]);

  // ─── Available duration slots (no 4-hour cap) ─────────────────────

  useEffect(() => {
    if (!selectedRoom) {
      setAvailableSlots([]);
      return;
    }

    const start = convertToMinutes(form.startTime);
    if (!start) {
      setAvailableSlots([]);
      return;
    }

    const dayAbbrev = getDayAbbrev();
    const busy = getBusyItemsForRoom(selectedRoom.id, today, dayAbbrev);

    let nextBusy = MAX_HOUR * 60;
    busy.forEach((item) => {
      const busyStart = convertToMinutes(item.startTime);
      if (busyStart > start && busyStart < nextBusy) {
        nextBusy = busyStart;
      }
    });

    const maxEnd = Math.min(nextBusy, MAX_HOUR * 60);
    const maxDuration = maxEnd - start;
    if (maxDuration < 30) {
      setAvailableSlots([]);
      return;
    }

    const slots = [];
    for (let mins = 30; mins <= maxDuration; mins += 30) {
      slots.push({
        value: mins,
        label: mins < 60
          ? `${mins} mins`
          : mins % 60 === 0
          ? `${mins / 60} Hour${mins > 60 ? 's' : ''}`
          : `${Math.floor(mins / 60)} hr ${mins % 60} mins`,
      });
    }
    setAvailableSlots(slots);
  }, [selectedRoom, form.startTime, today, roomSchedules, events, reservations, releases, reassignments]);

  // ─── Select Room ──────────────────────────────────────────────────

  const selectRoom = (room) => {
    setSelectedRoom(room);

    const nowMinutes = currentMinutes;
    const startMins = Math.max(nowMinutes, MIN_HOUR * 60);
    const startTime = convertToTime(startMins);

    const dayAbbrev = getDayAbbrev();
    const busy = getBusyItemsForRoom(room.id, today, dayAbbrev);
    let nextBusy = MAX_HOUR * 60;
    busy.forEach((item) => {
      const busyStart = convertToMinutes(item.startTime);
      if (busyStart > startMins && busyStart < nextBusy) {
        nextBusy = busyStart;
      }
    });
    const maxEnd = Math.min(nextBusy, MAX_HOUR * 60);
    const maxDuration = maxEnd - startMins;
    const duration = Math.max(30, maxDuration);

    setForm((prev) => ({
      ...prev,
      startTime: startTime,
      endTime: convertToTime(startMins + duration),
      duration,
    }));
  };

  // ─── Handle Input Changes ────────────────────────────────────────

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "duration" && selectedRoom && updated.startTime) {
        const start = convertToMinutes(updated.startTime);
        const dur = parseInt(value, 10);
        if (!isNaN(dur) && dur > 0) {
          updated.endTime = convertToTime(start + dur);
        }
      }

      if (field === "startTime" && selectedRoom && updated.duration) {
        const start = convertToMinutes(updated.startTime);
        const dur = parseInt(updated.duration, 10);
        if (!isNaN(dur) && dur > 0) {
          updated.endTime = convertToTime(start + dur);
        }
      }

      return updated;
    });
  };

  // ─── Validate ─────────────────────────────────────────────────────

  const validate = () => {
    if (!selectedRoom) return "Please select a room.";
    if (isRoomUnderMaintenance(selectedRoom, today, form.startTime, form.endTime)) {
      return "This room is under maintenance and cannot be reserved.";
    }
    if (!form.requesterId.trim()) return "Requester ID is required.";
    if (!form.requesterName.trim()) return "Requester Name is required.";
    if (!form.startTime) return "Select a start time.";
    if (!form.duration) return "Select a duration.";
    if (!form.purpose.trim()) return "Purpose is required.";
    if ((form.requesterType === "organization" || form.purpose === "Meeting") && !form.studentRange) {
      return "Please select the estimated number of attendees.";
    }

    const start = convertToMinutes(form.startTime);
    const end = convertToMinutes(form.endTime);

    if (start < MIN_HOUR * 60) return "Reservations can only start from 7:00 AM.";
    if (end > MAX_HOUR * 60) return "Reservations must end before 8:00 PM.";
    if (start >= end) return "End time must be after start time.";
    if (start < currentMinutes && today === TODAY) return "You cannot reserve a past time today.";

    const dayAbbrev = getDayAbbrev();
    const busy = getBusyItemsForRoom(selectedRoom.id, today, dayAbbrev);
    const conflict = busy.find(
      (item) =>
        overlap(
          form.startTime,
          form.endTime,
          item.startTime,
          item.endTime
        )
    );
    if (conflict) return "Room is no longer available at that time.";

    return null;
  };

  // ─── Notifications ──────────────────────────────────────────────────

  const notifyClerkAndDepartmentHead = async (title, message, reservationId) => {
    const usersSnap = await getDocs(collection(db, "users"));
    const notifications = [];
    usersSnap.forEach((userDoc) => {
      const user = userDoc.data();
      const role = normalize(user.role);
      if (role === "clerk" || role === "department-head") {
        notifications.push(
          addDoc(collection(db, "notifications"), {
            userId: userDoc.id,
            ownerType: role === "clerk" ? "clerk" : "department-head",
            reservationId,
            title,
            message,
            type: "walk-in-reservation",
            unread: true,
            archived: false,
            badge: "NEW",
            createdAt: serverTimestamp(),
          })
        );
      }
    });
    if (notifications.length > 0) await Promise.all(notifications);
  };

  // ─── Confirm Reservation ──────────────────────────────────────────

  const handleConfirm = async () => {
    const error = validate();
    if (error) {
      showToast("error", "Validation Error", error);
      return;
    }

    setSavingReservation(true);
    showToast("loading", "Processing", "Creating walk-in reservation...");

    try {
      const firebaseUser = auth.currentUser;
      let clerkName = "Clerk";
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          clerkName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Clerk";
        }
      }

      const reservationRef = await addDoc(collection(db, "reservationRequests"), {
        reservationType: "walk-in",
        requesterId: form.requesterId,
        requesterName: form.requesterName,
        organizationName: form.organizationName,
        course: form.course,
        yearSectionGroup: form.yearSectionGroup,
        estimatedAttendees: form.studentRange,
        roomId: selectedRoom.id,
        roomName: selectedRoom.roomName,
        floor: selectedRoom.floor,
        date: today,
        startTime: form.startTime,
        endTime: form.endTime,
        duration: Number(form.duration),
        purpose: form.customPurpose || form.purpose,
        status: "approved",
        approvedBy: firebaseUser?.uid || "",
        createdBy: firebaseUser?.uid || "",
        createdAt: serverTimestamp(),
      });

      // Notify all clerks and department heads
      await notifyClerkAndDepartmentHead(
        "Walk-In Reservation Created",
        `${form.requesterName} created a walk-in reservation for ${selectedRoom.roomName} today from ${form.startTime} to ${form.endTime}.`,
        reservationRef.id
      );

      // Notify the clerk who created it (self)
      if (firebaseUser?.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: firebaseUser.uid,
          ownerType: "clerk",
          reservationId: reservationRef.id,
          title: "Walk-In Reservation Created",
          message: `You successfully created a walk-in reservation for ${selectedRoom.roomName} (${form.startTime} - ${form.endTime}).`,
          type: "walk-in-created",
          unread: true,
          archived: false,
          badge: "SUCCESS",
          createdAt: serverTimestamp(),
        });
      }

      // Update room status if currently within reservation
      const start = convertToMinutes(form.startTime);
      const end = convertToMinutes(form.endTime);
      if (currentMinutes >= start && currentMinutes < end) {
        await updateDoc(doc(db, "rooms", selectedRoom.id), { status: "Occupied" });
      }

      // Activity log (department heads will see this)
      await logActivity({
        userId: firebaseUser?.uid || "",
        user: clerkName,
        role: "Clerk",
        action: "Created Walk-In Reservation",
        actionType: "CREATE",
        target: `${selectedRoom.roomName} | ${form.requesterName}`,
        status: "SUCCESS",
        details: {
          reservationId: reservationRef.id,
          requester: form.requesterName,
          date: today,
          startTime: form.startTime,
          endTime: form.endTime,
          purpose: form.customPurpose || form.purpose,
        },
      });

      showToast("success", "Success", "Walk-in reservation created successfully!");
      setShowModal(false);
      setSelectedRoom(null);
      setAvailableSlots([]);
      setForm({
        requesterId: "",
        requesterName: "",
        organizationName: "",
        course: "",
        yearSectionGroup: "",
        studentRange: "",
        customPurpose: "",
        requesterType: "",
        purpose: "",
        date: TODAY,
        duration: "",
        endTime: "",
        startTime: "",
      });

      // Navigate or stay
      setTimeout(() => {
        // Optionally navigate to reservations list
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast("error", "Error", err.message || "Failed to save reservation.");
      await logActivity({
        userId: auth.currentUser?.uid || "",
        user: clerkName || "Clerk",
        role: "Clerk",
        action: "Created Walk-In Reservation",
        actionType: "CREATE",
        target: selectedRoom?.roomName || "Unknown Room",
        status: "FAILED",
        details: { error: err.message },
      });
    } finally {
      setSavingReservation(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!loadingRooms && !loadingSchedule) {
      setPageLoading(false);
    }
  }, [loadingRooms, loadingSchedule]);

  if (pageLoading) {
    return (
      <div className="wir-loading-page">
        <div className="spinner"></div>
        <p>Loading walk-in reservation...</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="container">
      <div className="wir-page">
        <h1 className="wir-title">Walk-In Reservation</h1>
        <p className="wir-subtitle">Instant Booking</p>

        <div className="wir-layout">
          <div className="wir-card">
            <div className="wir-section-title">
              <span className="wir-section-bar" />
              Requester Information
            </div>

            {/* Requester Type */}
            <div className="wir-field">
              <label>Requester Type</label>
              <select
                className="wir-input"
                value={form.requesterType}
                onChange={handleChange("requesterType")}
              >
                <option value="">Select Requester</option>
                <option value="faculty">Faculty</option>
                <option value="organization">Organization</option>
              </select>
            </div>

            <div className="wir-row">
              <div className="wir-field">
                <label>
                  {form.requesterType === "faculty"
                    ? "Faculty ID"
                    : "Organization / Student ID"}
                </label>
                <input
                  className="wir-input"
                  value={form.requesterId}
                  onChange={handleChange("requesterId")}
                />
              </div>
              <div className="wir-field">
                <label>
                  {form.requesterType === "faculty"
                    ? "Faculty Name"
                    : "Requester Name"}
                </label>
                <input
                  className="wir-input"
                  value={form.requesterName}
                  onChange={handleChange("requesterName")}
                />
              </div>
            </div>

            {form.requesterType === "organization" && (
              <div className="wir-field">
                <label>Organization Name</label>
                <input
                  className="wir-input"
                  placeholder="Computer Society"
                  value={form.organizationName}
                  onChange={handleChange("organizationName")}
                />
              </div>
            )}

            <div className="wir-field">
              <label>Purpose</label>
              <select
                className="wir-input"
                value={form.purpose}
                onChange={handleChange("purpose")}
              >
                <option value="">Select Purpose</option>
                {form.requesterType === "faculty" ? (
                  <>
                    <option value="Class">Class</option>
                    <option value="Meeting">Meeting</option>
                  </>
                ) : (
                  <>
                    <option value="Training">Training</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Other Activity">Other Activity</option>
                  </>
                )}
              </select>
            </div>

            {form.requesterType === "faculty" && form.purpose === "Class" && (
              <div className="wir-row">
                <div className="wir-field">
                  <label>Course</label>
                  <input
                    className="wir-input"
                    placeholder="BSIT"
                    value={form.course}
                    onChange={handleChange("course")}
                  />
                </div>
                <div className="wir-field">
                  <label>Year / Section / Group</label>
                  <input
                    className="wir-input"
                    placeholder="4F-G2"
                    value={form.yearSectionGroup}
                    onChange={handleChange("yearSectionGroup")}
                  />
                </div>
              </div>
            )}

            {(form.requesterType === "faculty" && form.purpose === "Meeting") ||
              form.requesterType === "organization" && (
                <div className="wir-field">
                  <label>Estimated Number of Attendees</label>
                  <select
                    className="wir-input"
                    value={form.studentRange}
                    onChange={handleChange("studentRange")}
                  >
                    <option value="">Select Range</option>
                    <option value="1-30">1 - 30 Persons</option>
                    <option value="31-50">31 - 50 Persons</option>
                    <option value="51-80">51 - 80 Persons</option>
                    <option value="81-100">81 - 100 Persons</option>
                    <option value="101+">101+ Persons</option>
                  </select>
                </div>
              )}

            {form.purpose === "Other Activity" && (
              <div className="wir-field">
                <label>Specify Activity</label>
                <input
                  className="wir-input"
                  placeholder="Specify..."
                  value={form.customPurpose}
                  onChange={handleChange("customPurpose")}
                />
              </div>
            )}

            <div className="wir-section-title" style={{ marginTop: 24 }}>
              <span className="wir-section-bar" />
              Room And Schedule
            </div>

            <div className="wir-slots-header">
              <span className="wir-slots-label">Available Room Slots</span>
              <div className="wir-floor-pill">
                {floor}
                <i className="fa-solid fa-chevron-down" />
              </div>
            </div>

            <div className="wir-slots">
              {loadingRooms ? (
                <div className="wir-inline-loading">Loading rooms...</div>
              ) : availableRooms.length === 0 ? (
                <div className="wir-inline-loading">No rooms available now.</div>
              ) : (
                availableRooms.map((room) => (
                  <button
                    key={room.id}
                    className={`wir-room-card ${
                      selectedRoom?.id === room.id ? "selected" : ""
                    }`}
                    onClick={() => selectRoom(room)}
                  >
                    <div className="wir-room-card-top">
                      <div>
                        <h4>{room.roomName}</h4>
                        <p>{room.roomType}</p>
                      </div>
                      <span className="wir-room-status">AVAILABLE</span>
                    </div>
                    <div className="wir-room-card-info">
                      <div>
                        <span>Start</span>
                        <strong>{formatTime12(currentTime)}</strong>
                      </div>
                      <div>
                        <span>Until</span>
                        <strong>{formatTime12(room.availableUntil)}</strong>
                      </div>
                    </div>
                    <div className="wir-room-duration">
                      Maximum Booking
                      <strong>
                        {Math.floor(room.maxMinutes / 60) > 0 &&
                          `${Math.floor(room.maxMinutes / 60)} hr `}
                        {room.maxMinutes % 60} mins
                      </strong>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="wir-row" style={{ marginTop: 20 }}>
              <div className="wir-field">
                <label>Date</label>
                <div className="wir-icon-input">
                  <i className="fa-regular fa-calendar" />
                  <input type="date" className="wir-plain-input" value={today} readOnly />
                </div>
              </div>

              {selectedRoom && availableSlots.length > 0 && (
                <div className="wir-max-duration">
                  <i className="fa-solid fa-clock" />
                  Maximum Booking
                  <strong>{availableSlots[availableSlots.length - 1].label}</strong>
                </div>
              )}

              {selectedRoom && availableSlots.length > 0 && (
                <div className="wir-field" style={{ flex: 1 }}>
                  <label>Duration</label>
                  <select
                    className="wir-input"
                    value={form.duration}
                    onChange={handleChange("duration")}
                  >
                    {availableSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="wir-booking-preview">
                <div className="wir-preview-header">
                  <i className="fa-solid fa-clock"></i>
                  <span>Booking Summary</span>
                </div>
                <div className="wir-preview-grid">
                  <div className="wir-preview-box">
                    <small>START</small>
                    <h3>
                      {form.startTime ? formatTime12(form.startTime) : "--"}
                    </h3>
                  </div>
                  <div className="wir-preview-box">
                    <small>END</small>
                    <h3>
                      {form.endTime ? formatTime12(form.endTime) : "--"}
                    </h3>
                  </div>
                  <div className="wir-preview-box full">
                    <small>DURATION</small>
                    <h3>
                      {form.duration
                        ? form.duration >= 60
                          ? `${Math.floor(form.duration / 60)} hr ${
                              form.duration % 60 || ""
                            }`
                          : `${form.duration} mins`
                        : "--"}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="wir-footer">
              <button
                className="wir-confirm-btn"
                onClick={() => setShowModal(true)}
                disabled={savingReservation}
              >
                Confirm Booking
              </button>
            </div>
          </div>

          <div className="wir-right-col">
            <div className="wir-quick-note">
              <i className="fa-solid fa-circle-info" />
              <div>
                <div className="wir-note-title">Quick Note</div>
                <div className="wir-note-text">
                  Reservations must be within 7:00 AM – 8:00 PM.
                  Duration is limited by the next booking or closing time.
                </div>
              </div>
            </div>

            <div className="wir-availability-card">
              <div className="wir-avail-header">
                <span className="wir-avail-title">Live Availability</span>
                <span className="wir-live-dot" />
              </div>

              {selectedRoom && (
                <div className="wir-room-timeline">
                  <h4>Today's Schedule</h4>
                  {getBusyItemsForRoom(selectedRoom.id, today, getDayAbbrev()).map(
                    (item) => (
                      <div key={item.source + item.startTime} className="timeline-item">
                        <div className="timeline-time">
                          {formatTime12(item.startTime)} - {formatTime12(item.endTime)}
                        </div>
                        <div className="timeline-label">{item.label}</div>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="wir-avail-date">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              <div className="wir-avail-list">
                {liveAvailability.map((room) => (
                  <div
                    key={room.id}
                    className={`wir-live-room ${
                      room.available ? "available" : "occupied"
                    }`}
                  >
                    <div className="wir-live-top">
                      <div>
                        <div className="wir-live-room-name">{room.roomName}</div>
                        <div className="wir-live-room-type">{room.roomType}</div>
                      </div>
                      <span
                        className={`wir-live-badge ${
                          room.maintenance
                            ? "gray"
                            : room.available
                            ? "green"
                            : "red"
                        }`}
                      >
                        {room.maintenance
                          ? "MAINTENANCE"
                          : room.available
                          ? "AVAILABLE"
                          : "OCCUPIED"}
                      </span>
                    </div>
                    <div className="wir-live-bottom">
                      {room.maintenance ? (
                        <strong>Room is currently under maintenance</strong>
                      ) : room.available ? (
                        <div className="live-info-row">
                          <span>Available</span>
                          <strong>
                            {formatTime12(room.availableFrom)} until{" "}
                            {formatTime12(room.availableUntil)}
                          </strong>
                        </div>
                      ) : (
                        <>
                          <div className="live-info-row">
                            <span>Occupied</span>
                            <strong>Until {formatTime12(room.nextAvailable)}</strong>
                          </div>
                          <div className="live-info-row">
                            <span>Available Again</span>
                            <strong>
                              {room.nextBusyStart === "23:59"
                                ? `${formatTime12(room.nextAvailable)} onwards`
                                : `${formatTime12(room.nextAvailable)} - ${formatTime12(
                                    room.nextBusyStart
                                  )}`}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="wir-view-btn"
                onClick={() => navigate("/clerk/schedule-view-academic-schedule")}
              >
                View Full Schedule
              </button>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="wir-modal-overlay">
            <div className="wir-modal">
              <div className="wir-modal-icon">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <h3 className="wir-modal-title">Are you sure?</h3>
              <p className="wir-modal-text">
                Do you want to proceed<br />with this operation?
              </p>
              <button className="wir-modal-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="wir-modal-confirm"
                disabled={savingReservation}
                onClick={handleConfirm}
              >
                {savingReservation ? (
                  <>
                    <span className="small-spinner"></span>
                    Saving...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

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