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

import { auth, db } from "../../firebase";

function DepartmentHeadReassignRoom() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [floor, setFloor] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
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

const loadAvailableRooms = async () => {

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

      alert("Room reassigned successfully!");
      setShowConfirm(false);
      navigate(from);

    } catch (err) {
      alert("Failed to reassign room. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dept-reassign-room">
        <div className="dept-reassign-white-box">
          <h2 className="dept-reassign-title">Reassign Room</h2>

          <div className="dept-reassign-sections">
            <div className="dept-reassign-section">
              <div className="dept-reassign-section-label">
                <span>General Information</span>
              </div>

              <div className="dept-reassign-form-group">
                <label>Course Title</label>
                <input type="text" className="dept-reassign-form-input"value={conflict?.subject || conflict?.schedule?.subject || ""} readOnly />
              </div>

              <div className="dept-reassign-form-group">
                <label>Assigned Faculty</label>
                <input type="text" className="dept-reassign-form-input" value={conflict?.faculty || ""} readOnly />
              </div>

              <div className="dept-reassign-form-group">
                <label>Section</label>
                <input type="text" className="dept-reassign-form-input" value={conflict?.section || ""} readOnly />
              </div>

              <div className="dept-reassign-form-group">
                <label>Date</label>
                <div className="dept-reassign-input-icon-wrapper">
                  <i className="fa-regular fa-calendar dept-reassign-input-icon"></i>
                  <input type="date" className="dept-reassign-form-input" value={conflict?.date || ""} readOnly />
                </div>
              </div>
            </div>

            <div className="dept-reassign-section">
              <div className="dept-reassign-section-label">
                <span>Venue & Timing</span>
              </div>

              <div className="dept-venue-header">
                <span className="dept-venue-title">Available Room Slots</span>
                <div className="dept-dropdown-wrapper-venue">
                  <select
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="dept-dropdown-venue"
                  >
                      <option value="">All Floors</option>
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="3rd Floor">3rd Floor</option>
                      <option value="4th Floor">4th Floor</option>
                  </select>

                  <i className="fa-solid fa-angle-down dept-dropdown-icon-venue"></i>
              </div>

              <div className="available-room-list">

                  {availableRooms.length === 0 && (
                      <div className="no-room">
                          No available room found.
                      </div>
                  )}

                  {availableRooms.map((room) => (

                      <div
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

                          <p>{room.floor}</p>

                      </div>

                  ))}

              </div>
              </div>

              <div className="dept-reassign-time-fields">
                <div className="dept-reassign-form-group">
                  <label>Start Time</label>
                  <input type="text" className="dept-reassign-form-input" value={conflict?.startTime || ""} readOnly />
                </div>

                <div className="dept-reassign-form-group">
                  <label>End Time</label>
                  <input type="text" className="dept-reassign-form-input" value={conflict?.endTime || ""} readOnly />
                </div>
              </div>
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
            disabled={loading}
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