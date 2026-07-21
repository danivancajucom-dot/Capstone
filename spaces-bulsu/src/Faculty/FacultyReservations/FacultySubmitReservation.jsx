// ============================================================
// FILE: FacultySubmitReservation.jsx (FIXED – activity log & notifications)
// ============================================================
import { useState, useEffect } from "react";
import "./faculty-submit-reservation.css";
import Toast from "../../Popup/Toast/Toast";
import { auth, db } from "../../firebase";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

function FacultySubmitReservation() {
  const [purpose, setPurpose] = useState("");
  const [courseTitle, setCourseTitle] = useState("");

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [selectedFloor, setSelectedFloor] = useState("");

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [studentRange, setStudentRange] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [course, setCourse] = useState("");
  const [yearSectionGroup, setYearSectionGroup] = useState("");
  const [organization, setOrganization] = useState("");
  const [customPurposeText, setCustomPurposeText] = useState("");
  const [loading, setLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const [releasedKeys, setReleasedKeys] = useState(new Set());

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    }
  };

  const EQUIPMENT_OPTIONS = [
    { id: "projector", label: "Projector", icon: "📽" },
    { id: "tvDisplay", label: "TV Display", icon: "📺" },
    { id: "ac", label: "AC", icon: "❄️" },
    { id: "computer", label: "Computer", icon: "💻" },
    { id: "smartBoard", label: "Smart Board", icon: "🖊" },
  ];

  const toggleEquipment = (id) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    loadAvailableRooms();
  }, [
    date,
    startTime,
    endTime,
    selectedFloor,
    purpose,
    selectedEquipment,
    studentRange,
  ]);

  const convertToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const isToday = (selectedDate) => {
    if (!selectedDate) return false;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return selectedDate === `${yyyy}-${mm}-${dd}`;
  };

  const getCurrentMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  const getMinimumCapacity = (range) => {
    switch (range) {
      case "30-50": return 30;
      case "50-60": return 50;
      case "60-80": return 60;
      case "80-100": return 80;
      default: return 0;
    }
  };

  const isOverlapping = (start1, end1, start2, end2) => {
    const s1 = convertToMinutes(start1);
    const e1 = convertToMinutes(end1);
    const s2 = convertToMinutes(start2);
    const e2 = convertToMinutes(end2);
    return s1 < e2 && e1 > s2;
  };

  const getDay = (date) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[new Date(date).getDay()];
  };

  const loadAvailableRooms = async () => {
    if (!date || !startTime || !endTime) {
      setRooms([]);
      return;
    }

    setLoading(true);

    try {
      const roomSnapshot = await getDocs(collection(db, "rooms"));
      const activitySnapshot = await getDocs(collection(db, "events"));
      const requestSnapshot = await getDocs(
        collection(db, "reservationRequests")
      );

      const releaseSnap = await getDocs(collection(db, "roomReleases"));
      const releaseMap = new Map();

      releaseSnap.docs.forEach((d) => {
        const r = d.data();
        if (r.date !== date) return;
        const key = `${r.scheduleId}_${r.date}`;
        if (!releaseMap.has(r.roomId)) {
          releaseMap.set(r.roomId, new Set());
        }
        releaseMap.get(r.roomId).add(key);
      });

      const roomList = [];

      for (const roomDoc of roomSnapshot.docs) {
        const room = {
          id: roomDoc.id,
          ...roomDoc.data(),
        };

        // Floor filter
        if (selectedFloor) {
          const roomFloor = String(room.floor).toLowerCase();
          const selected = selectedFloor.toLowerCase();
          if (!roomFloor.includes(selected)) continue;
        }

        // Equipment filter (only for Hands-on)
        if (purpose === "Hands-on" && selectedEquipment.length > 0) {
          const roomEquipment = Object.entries(room.equipment || {})
            .filter(([key, value]) => value === true)
            .map(([key]) => key.toLowerCase());

          const hasAllEquipment = selectedEquipment.every((eq) =>
            roomEquipment.includes(eq.toLowerCase())
          );

          if (!hasAllEquipment) continue;
        }

        // Capacity filter (only for Lecture & Examination)
        if ((purpose === "Lecture" || purpose === "Examination") && studentRange) {
          const requiredCapacity = getMinimumCapacity(studentRange);
          if (Number(room.capacity || 0) < requiredCapacity) continue;
        }

        // Maintenance check
        const underMaintenance = isRoomUnderMaintenance(
          room,
          date,
          startTime,
          endTime
        );

        if (underMaintenance) {
          roomList.push({
            ...room,
            available: false,
            maintenance: true,
          });
          continue;
        }

        let occupied = false;

        // Class schedules (skip released)
        const scheduleSnapshot = await getDocs(
          collection(db, "rooms", room.id, "schedules")
        );
        const releasesForRoom = releaseMap.get(room.id) || new Set();

        occupied = scheduleSnapshot.docs.some((doc) => {
          const sched = doc.data();
          if (sched.initialized) return false;
          if (sched.day !== getDay(date)) return false;

          const releaseKey = `${doc.id}_${date}`;
          if (releasesForRoom.has(releaseKey)) return false;

          return isOverlapping(
            startTime,
            endTime,
            sched.startTime,
            sched.endTime
          );
        });

        // Room activities
        if (!occupied) {
          occupied = activitySnapshot.docs.some((doc) => {
            const event = doc.data();
            if (event.roomId !== room.id) return false;
            if (event.date !== date) return false;
            if (event.status === "Cancelled") return false;
            return isOverlapping(
              startTime,
              endTime,
              event.startTime,
              event.endTime
            );
          });
        }

        // Pending reservations (exclude Rejected)
        if (!occupied) {
          occupied = requestSnapshot.docs.some((doc) => {
            const req = doc.data();
            if (req.roomId !== room.id) return false;
            if (req.date !== date) return false;
            if (req.status === "Rejected") return false;
            return isOverlapping(
              startTime,
              endTime,
              req.startTime,
              req.endTime
            );
          });
        }

        roomList.push({
          ...room,
          available: !occupied,
          maintenance: false,
        });
      }

      setRooms(roomList);
    } catch (err) {
      console.error(err);
      showToast("error", "Error", "Unable to load rooms.");
    }

    setLoading(false);
  };

  const validate = () => {
    if (!courseTitle) return "Course title is required.";
    if (!date) return "Select a reservation date.";
    if (!audienceType) return "Select audience type.";

    // Class-specific validation
    if (audienceType === "Class") {
      if (!course) return "Enter course.";
      if (!yearSectionGroup) return "Enter Year / Section Group.";
      if (!["Lecture", "Hands-on", "Examination"].includes(purpose)) {
        return "Select a valid purpose for Class (Lecture, Hands-on, Examination).";
      }
      if (purpose === "Hands-on" && selectedEquipment.length === 0) {
        return "Select at least one required equipment.";
      }
      if ((purpose === "Lecture" || purpose === "Examination") && !studentRange) {
        return "Select the estimated number of students.";
      }
    }

    // Organization-specific validation
    if (audienceType === "Organization") {
      if (!organization) return "Enter organization name.";
      if (!["Workshop", "Training", "Meeting", "Other Activity"].includes(purpose)) {
        return "Select a valid purpose for Organization (Workshop, Training, Meeting, Other Activity).";
      }
      if (purpose === "Other Activity" && !customPurposeText.trim()) {
        return "Please specify the activity.";
      }
      if (!studentRange) {
        return "Select the estimated number of attendees.";
      }
    }

    // Time validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return "You cannot reserve a past date.";
    }

    if (!startTime) return "Select a start time.";
    if (!endTime) return "Select an end time.";

    const start = convertToMinutes(startTime);
    const end = convertToMinutes(endTime);

    if (start < 420) return "Reservations can only start from 7:00 AM.";
    if (end > 1200) return "Reservations must end before 8:00 PM.";
    if (start >= end) return "End time must be after start time.";

    if (isToday(date)) {
      const now = getCurrentMinutes();
      if (start <= now) {
        return "You cannot reserve a past time today.";
      }
    }

    if (!selectedRoom) return "Select an available room.";
    if (selectedRoom.maintenance)
      return "This room is under maintenance during the selected time.";

    return null;
  };

  // ─── NOTIFICATION HELPER (ownerType normalized) ────────────────────

  const notifyClerkAndDepartmentHead = async (title, message, reservationId) => {
    const usersSnap = await getDocs(collection(db, "users"));
    const notifications = [];

    usersSnap.forEach((userDoc) => {
      const user = userDoc.data();
      const role = (user.role || "").toLowerCase().trim();

      let ownerType = "";
      if (role === "clerk") ownerType = "clerk";
      else if (role.includes("department") && role.includes("head")) ownerType = "department-head";
      else return; // skip others

      notifications.push(
        addDoc(collection(db, "notifications"), {
          userId: userDoc.id,
          ownerType, // ← MUST be "clerk" or "department-head"
          reservationId,
          title,
          message,
          type: "reservation-request",
          unread: true,
          archived: false,
          badge: "NEW",
          createdAt: serverTimestamp(),
        })
      );
    });

    await Promise.all(notifications);
  };

  // ─── MAIN SUBMIT ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      showToast("error", "Validation Error", error);
      return;
    }

    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    let facultyName = "";
    let userData = {};
    if (userSnap.exists()) {
      userData = userSnap.data();
      facultyName = `${userData.firstName} ${userData.lastName}`;
    }

    let finalPurpose = purpose;
    if (purpose === "Other Activity") {
      finalPurpose = customPurposeText.trim() || "Other Activity";
    }

    try {
      showToast("loading", "Submitting", "Please wait...");

      // 1. Create reservation request
      const reservationRef = await addDoc(
        collection(db, "reservationRequests"),
        {
          userId: auth.currentUser.uid,
          facultyName,

          roomId: selectedRoom.id,
          roomName: selectedRoom.roomName,

          audienceType,

          attendees: {
            course,
            yearSectionGroup,
            organization,
            customPurpose: customPurposeText,
          },

          courseTitle,
          purpose: finalPurpose,

          requiredEquipment: selectedEquipment,
          studentRange,

          date,
          startTime,
          endTime,

          status: "Pending",

          createdAt: serverTimestamp(),
        }
      );

      // 2. Notify clerks & department heads (ownerType normalized)
      await notifyClerkAndDepartmentHead(
        "New Reservation Request",
        `${facultyName} submitted a reservation request for "${courseTitle}" in ${selectedRoom.roomName} on ${date} from ${startTime} to ${endTime}.`,
        reservationRef.id
      );

      // 3. Notify faculty (self)
      await addDoc(collection(db, "notifications"), {
        userId: auth.currentUser.uid,
        ownerType: "faculty",
        reservationId: reservationRef.id,
        title: "Reservation Submitted",
        message: `Your reservation request for ${selectedRoom.roomName} on ${date} (${startTime} - ${endTime}) has been submitted successfully and is waiting for approval.`,
        type: "reservation-submitted",
        unread: true,
        archived: false,
        badge: "INFO",
        createdAt: serverTimestamp(),
      });

      // 4. ACTIVITY LOG – direct write with exact fields dashboard expects
      await addDoc(collection(db, "activityLogs"), {
        timestamp: serverTimestamp(),
        action: "Submitted Reservation Request",
        actionType: "success",
        user: facultyName,
        role: "Faculty",
        target: `${selectedRoom.roomName} | ${courseTitle}`,
        status: "SUCCESS",
        details: {
          courseTitle,
          room: selectedRoom.roomName,
          date,
          startTime,
          endTime,
          purpose: finalPurpose,
          audienceType,
        },
        userId: auth.currentUser.uid,
      });

      setShowConfirm(false);

      showToast(
        "success",
        "Reservation Submitted",
        "Your reservation request has been sent for approval."
      );

      // Reset form
      setCourseTitle("");
      setAudienceType("");
      setCourse("");
      setYearSectionGroup("");
      setOrganization("");
      setCustomPurposeText("");
      setPurpose("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setSelectedRoom(null);
      setRooms([]);
      setSelectedEquipment([]);
      setStudentRange("");
    } catch (err) {
      console.error(err);
      showToast("error", "Firestore Error", err.message);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <div className="container">
        <div className="faculty-submit-header">
          <h1>Reservation Request</h1>
          <p>Submit a reservation request for approval.</p>
        </div>

        <div className="faculty-submit-box">
          <div className="faculty-submit-sections">
            {/* LEFT SIDE */}
            <div className="faculty-submit-section">
              {/* COURSE TITLE */}
              <div className="faculty-submit-form-group">
                <label>Course Title</label>
                <input
                  className="faculty-submit-input"
                  placeholder="Enter course title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                />
              </div>

              {/* AUDIENCE TYPE */}
              <div className="faculty-submit-form-group">
                <label>Audience Type</label>
                <div className="faculty-submit-dropdown-wrapper">
                  <select
                    className="faculty-submit-input faculty-submit-dropdown"
                    value={audienceType}
                    onChange={(e) => {
                      setAudienceType(e.target.value);
                      setPurpose(""); // reset purpose when audience changes
                      setSelectedEquipment([]);
                      setStudentRange("");
                      setCourse("");
                      setYearSectionGroup("");
                      setOrganization("");
                      setCustomPurposeText("");
                    }}
                  >
                    <option value="">Select Audience</option>
                    <option value="Class">Class</option>
                    <option value="Organization">Organization</option>
                  </select>
                  <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>
                </div>

                {/* CLASS FIELDS */}
                {audienceType === "Class" && (
                  <>
                    <div className="faculty-submit-form-group">
                      <label>Course</label>
                      <input
                        className="faculty-submit-input"
                        placeholder="BSIT"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                      />
                    </div>
                    <div className="faculty-submit-form-group">
                      <label>Year / Section Group</label>
                      <input
                        className="faculty-submit-input"
                        placeholder="Ex. 3F-G2"
                        value={yearSectionGroup}
                        onChange={(e) => setYearSectionGroup(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* ORGANIZATION FIELDS */}
                {audienceType === "Organization" && (
                  <div className="faculty-submit-form-group">
                    <label>Organization Name</label>
                    <input
                      className="faculty-submit-input"
                      placeholder="Computer Society"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* PURPOSE */}
              <div className="faculty-submit-form-group">
                <label>Purpose</label>
                <div className="faculty-submit-dropdown-wrapper">
                  <select
                    className="faculty-submit-input faculty-submit-dropdown"
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      setSelectedEquipment([]);
                      setStudentRange("");
                      setCustomPurposeText("");
                    }}
                  >
                    <option value="">Select Purpose</option>
                    {audienceType === "Class" && (
                      <>
                        <option value="Lecture">Lecture</option>
                        <option value="Hands-on">Hands-on</option>
                        <option value="Examination">Examination</option>
                      </>
                    )}
                    {audienceType === "Organization" && (
                      <>
                        <option value="Workshop">Workshop</option>
                        <option value="Training">Training</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Other Activity">Other Activity</option>
                      </>
                    )}
                  </select>
                  <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>
                </div>
              </div>

              {/* CLASS SUB‑OPTIONS */}
              {audienceType === "Class" && purpose === "Hands-on" && (
                <div className="faculty-submit-form-group">
                  <label>Required Equipment</label>
                  <div className="equipment-grid">
                    {EQUIPMENT_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`equipment-card ${
                          selectedEquipment.includes(item.id) ? "selected" : ""
                        }`}
                        onClick={() => toggleEquipment(item.id)}
                      >
                        <span className="equipment-icon">{item.icon}</span>
                        <span className="equipment-name">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CLASS: Lecture / Examination -> studentRange */}
              {audienceType === "Class" &&
                (purpose === "Lecture" || purpose === "Examination") && (
                  <div className="faculty-submit-form-group">
                    <label>Estimated Number of Students</label>
                    <div className="faculty-submit-dropdown-wrapper">
                      <select
                        className="faculty-submit-input faculty-submit-dropdown"
                        value={studentRange}
                        onChange={(e) => setStudentRange(e.target.value)}
                      >
                        <option value="">Select Range</option>
                        <option value="30-50">30 - 50 Students</option>
                        <option value="50-60">50 - 60 Students</option>
                        <option value="60-80">60 - 80 Students</option>
                        <option value="80-100">80 - 100 Students</option>
                      </select>
                      <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>
                    </div>
                  </div>
                )}

              {/* ORGANIZATION: all purposes -> studentRange */}
              {audienceType === "Organization" && purpose && (
                <div className="faculty-submit-form-group">
                  <label>Estimated Number of Attendees</label>
                  <div className="faculty-submit-dropdown-wrapper">
                    <select
                      className="faculty-submit-input faculty-submit-dropdown"
                      value={studentRange}
                      onChange={(e) => setStudentRange(e.target.value)}
                    >
                      <option value="">Select Range</option>
                      <option value="1-30">1 - 30 Persons</option>
                      <option value="31-50">31 - 50 Persons</option>
                      <option value="51-80">51 - 80 Persons</option>
                      <option value="81-100">81 - 100 Persons</option>
                      <option value="101+">101+ Persons</option>
                    </select>
                    <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>
                  </div>
                </div>
              )}

              {/* ORGANIZATION: "Other Activity" -> custom text */}
              {audienceType === "Organization" && purpose === "Other Activity" && (
                <div className="faculty-submit-form-group">
                  <label>Specify Activity</label>
                  <input
                    className="faculty-submit-input"
                    placeholder="Describe the activity..."
                    value={customPurposeText}
                    onChange={(e) => setCustomPurposeText(e.target.value)}
                  />
                </div>
              )}

              {/* DATE */}
              <div className="faculty-submit-form-group">
                <label>Date</label>
                <div className="faculty-submit-icon-wrapper">
                  <i
                    className="fa-regular fa-calendar faculty-submit-icon"
                    onClick={() =>
                      document.getElementById("date-input").showPicker()
                    }
                  ></i>
                  <input
                    id="date-input"
                    type="date"
                    className="faculty-submit-input"
                    min={new Date().toISOString().split("T")[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* TIME */}
              <div className="faculty-submit-time-fields">
                <div className="faculty-submit-form-group">
                  <label>Start Time</label>
                  <div className="faculty-submit-time-wrapper">
                    <i
                      className="fa-regular fa-clock faculty-submit-time-icon"
                      onClick={() =>
                        document.getElementById("start-input").showPicker()
                      }
                    ></i>
                    <input
                      id="start-input"
                      type="time"
                      className="faculty-submit-input faculty-submit-time-input"
                      min="07:00"
                      max="20:00"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="faculty-submit-form-group">
                  <label>End Time</label>
                  <div className="faculty-submit-time-wrapper">
                    <i
                      className="fa-regular fa-clock faculty-submit-time-icon"
                      onClick={() =>
                        document.getElementById("end-input").showPicker()
                      }
                    ></i>
                    <input
                      id="end-input"
                      type="time"
                      className="faculty-submit-input faculty-submit-time-input"
                      min="07:00"
                      max="20:00"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="faculty-submit-section">
              <div className="faculty-submit-venue-header">
                <span className="faculty-submit-venue-title">Available Rooms</span>
                <div className="faculty-submit-venue-dropdown-wrapper">
                  <select
                    className="faculty-submit-venue-dropdown"
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                  >
                    <option value="">All Floors</option>
                    <option value="1st">1st Floor</option>
                    <option value="3rd">3rd Floor</option>
                    <option value="4th">4th Floor</option>
                  </select>
                  <i className="fa-solid fa-angle-down faculty-submit-venue-dropdown-icon"></i>
                </div>
              </div>

              {loading ? (
                <div className="faculty-loading">Loading available rooms...</div>
              ) : !date || !startTime || !endTime ? (
                <div className="faculty-empty">
                  <i className="fa-regular fa-calendar"></i>
                  <p>Select a date and reservation time first.</p>
                </div>
              ) : rooms.length === 0 ? (
                <div className="faculty-empty">
                  <i className="fa-solid fa-circle-xmark"></i>
                  <p>
                    No rooms match your selected schedule, purpose, equipment, capacity, or floor.
                  </p>
                </div>
              ) : (
                <div className="room-grid">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`
                        room-card
                        ${room.maintenance ? "maintenance" : room.available ? "available" : "occupied"}
                        ${selectedRoom?.id === room.id ? "selected" : ""}
                      `}
                      onClick={() => {
                        if (!room.available || room.maintenance) return;
                        setSelectedRoom(room);
                      }}
                    >
                      <div className="room-name">
                        <i className="fa-solid fa-door-open"></i> {room.roomName}
                      </div>
                      <div className="room-floor">
                        <i className="fa-solid fa-building"></i> {room.floor} Floor
                      </div>
                      {room.capacity && (
                        <div className="room-floor">
                          <i className="fa-solid fa-users"></i> {room.capacity} Seats
                        </div>
                      )}
                      <div className="room-status">
                        <i
                          className={`fa-solid ${
                            room.maintenance
                              ? "fa-triangle-exclamation"
                              : room.available
                              ? "fa-circle-check"
                              : "fa-circle-xmark"
                          }`}
                        ></i>{" "}
                        {room.maintenance
                          ? "Under Maintenance"
                          : room.available
                          ? "Available"
                          : "Occupied"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="faculty-submit-footer">
          <button className="faculty-submit-back-btn" onClick={() => window.history.back()}>
            Back
          </button>
          <button
            className="faculty-submit-confirm-btn"
            onClick={() => {
              const err = validate();
              if (err) {
                showToast("error", "Validation Error", err);
                return;
              }
              setShowConfirm(true);
            }}
          >
            Submit Request
          </button>
        </div>

        {showConfirm && (
          <div className="ra-modal-overlay">
            <div className="ra-modal">
              <h3>Submit Reservation Request?</h3>
              <p>Your reservation will be sent for approval.</p>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                  marginTop: "20px",
                }}
              >
                <button className="ra-modal-cancel" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
                <button className="ra-modal-confirm" onClick={handleSubmit}>
                  Confirm
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
          onClose={() =>
            setToast((prev) => ({
              ...prev,
              show: false,
            }))
          }
        />
      </div>
    </>
  );
}

export default FacultySubmitReservation;