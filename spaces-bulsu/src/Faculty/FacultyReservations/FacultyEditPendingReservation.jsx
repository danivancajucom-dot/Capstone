import { useState, useEffect } from "react";
import "./faculty-edit-pending-reservation.css";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase";

function FacultyEditPendingReservation() {
  const [purpose, setPurpose] = useState("examination");
  const navigate = useNavigate();
  const location = useLocation();
  const [courseTitle, setCourseTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [studentRange, setStudentRange] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const reservation = location.state?.reservation;


  useEffect(() => {
      if (!reservation) return;

      setCourseTitle(reservation.courseTitle);
      setDate(reservation.date);
      setStartTime(reservation.startTime);
      setEndTime(reservation.endTime);
      setPurpose(reservation.purpose);
      setStudentRange(reservation.studentRange);
  }, [reservation]);

  const notifyClerkAndDepartmentHead = async (
  title,
  message,
  reservationId = null
) => {
  try {
    const usersSnap = await getDocs(collection(db, "users"));

    const recipients = usersSnap.docs.filter((d) => {
      const user = d.data();

      return (
        user.role === "clerk" ||
        user.role === "department-head"
      );
    });

    for (const receiver of recipients) {
      const user = receiver.data();

      await addDoc(collection(db, "notifications"), {
        userId: receiver.id,

        ownerType:
          user.role === "clerk"
            ? "clerk"
            : "department-head",

        reservationId,

        title,
        message,

        type: "reservation-request",

        unread: true,
        archived: false,

        badge: "NEW",

        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Notification Error:", err);
  }
};

  const handleSave = async () => {
  try {
    if (!reservation?.id) {
      alert("Reservation not found.");
      return;
    }

    const userSnap = await getDoc(
      doc(db, "users", auth.currentUser.uid)
    );

    let facultyName = "";

    if (userSnap.exists()) {
      const user = userSnap.data();
      facultyName = `${user.firstName} ${user.lastName}`;
    }

    await updateDoc(doc(db, "reservationRequests", reservation.id), {
        courseTitle,
        date,
        startTime,
        endTime,
        purpose,
        studentRange,
        roomId: selectedRoom?.id,
        roomName: selectedRoom?.roomName,
        updatedAt: serverTimestamp(),
    });

    await notifyClerkAndDepartmentHead(
      "Reservation Updated",
      `${facultyName} updated a reservation request.`,
      reservation.id
    );

    alert("Reservation updated successfully.");

    navigate(-1);

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

  return (
    <>
    <div className="container">
      <h1>Reservation Details</h1>

      <div className="faculty-edit-pending-box">
        <div className="faculty-edit-pending-sections">
          <div className="faculty-edit-pending-section">
            <div className="faculty-edit-pending-form-group">
              <label>Course Title</label>
              <input
                type="text"
                className="faculty-edit-pending-input"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
              />
            </div>

            <div className="faculty-edit-pending-form-group">
              <label>Date</label>
              <div className="faculty-edit-pending-icon-wrapper">
                <i
                  className="fa-regular fa-calendar faculty-edit-pending-icon"
                  onClick={() => document.getElementById('edit-date-input').showPicker()}
                ></i>
                <input
                  type="date"
                  id="edit-date-input"
                  className="faculty-edit-pending-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ colorScheme: "light" }}
                />
              </div>
            </div>

            <div className="faculty-edit-pending-time-fields">
              <div className="faculty-edit-pending-form-group">
                <label>Start Time</label>
                <div className="faculty-edit-pending-time-wrapper">
                  <i
                    className="fa-regular fa-clock faculty-edit-pending-time-icon"
                    onClick={() => document.getElementById('edit-start-time').showPicker()}
                  ></i>
                  <input
                    type="time"
                    id="edit-start-time"
                    className="faculty-edit-pending-input faculty-edit-pending-time-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="faculty-edit-pending-form-group">
                <label>End Time</label>
                <div className="faculty-edit-pending-time-wrapper">
                  <i
                    className="fa-regular fa-clock faculty-edit-pending-time-icon"
                    onClick={() => document.getElementById('edit-end-time').showPicker()}
                  ></i>
                  <input
                    type="time"
                    id="edit-end-time"
                    className="faculty-edit-pending-input faculty-edit-pending-time-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="faculty-edit-pending-form-group">
              <label>Purpose of Reservation</label>
              <div className="faculty-edit-pending-dropdown-wrapper">
                <select
                  className="faculty-edit-pending-input faculty-edit-pending-dropdown"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="" disabled hidden>Select Purpose</option>
                  <option value="Hands-on">Hands-On</option>
                  <option value="Lecture">Lecture</option>
                  <option value="Examination">Examination</option>
                </select>
                <i className="fa-solid fa-angle-down faculty-edit-pending-dropdown-icon"></i>
              </div>
            </div>
          </div>

          <div className="faculty-edit-pending-section">
            <div className="faculty-edit-pending-venue-header">
              <span className="faculty-edit-pending-venue-title">Available Room Slots</span>
              <div className="faculty-edit-pending-venue-dropdown-wrapper">
                <select className="faculty-edit-pending-venue-dropdown" defaultValue="">
                  <option value="" disabled hidden>Floor</option>
                  <option value="1st">1st Floor</option>
                  <option value="3rd">3rd Floor</option>
                  <option value="4th">4th Floor</option>
                </select>
                <i className="fa-solid fa-angle-down faculty-edit-pending-venue-dropdown-icon"></i>
              </div>
            </div>

            {purpose === "Hands-on" && (
              <div className="faculty-edit-pending-form-group">
                <label>Available Units/Equipment</label>
                <input
                  type="text"
                  className="faculty-edit-pending-input"
                  placeholder="Enter units/equipment"
                />
              </div>
            )}

            {(purpose === "Lecture" || purpose === "Examination") && (
              <div className="faculty-edit-pending-form-group">
                <label>Estimated Number of Students</label>
                <div className="faculty-edit-pending-dropdown-wrapper">
                  <select
                    className="faculty-edit-pending-input faculty-edit-pending-dropdown"
                    value={studentRange}
                    onChange={(e) => setStudentRange(e.target.value)}
                  >
                    <option value="" disabled hidden>Select Range</option>
                    <option value="30-50">30-50</option>
                    <option value="50-60">50-60</option>
                    <option value="60-80">60-80</option>
                    <option value="80-100">80-100</option>
                  </select>
                  <i className="fa-solid fa-angle-down faculty-edit-pending-dropdown-icon"></i>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="faculty-edit-pending-footer">
        <button className="faculty-edit-pending-back-btn">Back</button>
        <button
            className="faculty-edit-pending-save-btn"
            onClick={handleSave}
        >
            Save
        </button>
      </div>
    </div>
    </>

  );
}

export default FacultyEditPendingReservation;