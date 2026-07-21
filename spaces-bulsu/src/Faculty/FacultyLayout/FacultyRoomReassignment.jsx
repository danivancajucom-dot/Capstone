import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";
import { auth } from "../../firebase";
import { db } from "../../firebase";
import "./faculty-room-reassignment.css";


export default function FacultyRoomReassignment() {

  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  const isExpired = () => {

  if (!assignment) return false;

    const scheduleDate = new Date(
      `${assignment.date}T${assignment.endTime}`
    );

    return new Date() > scheduleDate;

  };

  useEffect(() => {

    const loadAssignment = async () => {

      try {

        const snap = await getDoc(
          doc(db, "roomReassignments", assignmentId)
        );

        console.log("exists:", snap.exists());
        if (snap.exists()) {

          setAssignment({
            id: snap.id,
            ...snap.data()
          });

        }

      } catch (err) {

        console.log(err);

      }

      setLoading(false);

    };

    loadAssignment();

  }, [assignmentId]);

    const sendDecisionNotifications = async (decision) => {

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // current faculty
    const facultySnap = await getDoc(
      doc(db, "users", currentUser.uid)
    );

    const faculty = facultySnap.data();

    const facultyName =
      `${faculty.firstName} ${faculty.lastName}`;

    // -----------------------------
    // FACULTY NOTIFICATION
    // -----------------------------

    await addDoc(collection(db, "notifications"), {

      userId: currentUser.uid,

      ownerType: "faculty",

      title: "Room Reassignment",

      message:
        `You ${decision} the room reassignment for ${assignment.courseTitle}.`,

      type: "approved",

      badge: decision.toUpperCase(),

      unread: true,

      archived: false,

      createdAt: serverTimestamp()

    });

    // -----------------------------
    // DEPARTMENT HEAD
    // -----------------------------

    const headQuery = query(

      collection(db, "users"),

      where("role", "==", "Department Head")

    );

    const headSnap = await getDocs(headQuery);

    for (const head of headSnap.docs) {

      await addDoc(collection(db, "notifications"), {

        userId: head.id,

        ownerType: "department-head",

        title: "Faculty Response",

        message:
          `${facultyName} ${decision} the room reassignment request for ${assignment.courseTitle}.`,

        type: "room-reassignment",

        badge: decision.toUpperCase(),

        unread: true,

        archived: false,

        assignmentId: assignment.id,

        createdAt: serverTimestamp()

      });

    }

  };

  const rejectAssignment = async () => {
  try {
    if (isExpired()) {
      alert("This room reassignment has already expired.");
      return;
    }

    await updateDoc(doc(db, "roomReassignments", assignment.id), {
      status: "rejected",
      rejectedAt: serverTimestamp(),
    });

    // BAGO: i-resolve din ang conflict sa events collection
    if (assignment.eventId) {
      await updateDoc(doc(db, "events", assignment.eventId), {
        conflictResolved: true,
      });
    }

    await sendDecisionNotifications("rejected");

    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const userData = userSnap.data();

    await logActivity({
      user: `${userData.firstName} ${userData.lastName}`,
      role: userData.role,
      action: "Rejected room reassignment",
      actionType: "denied",
      target: `${assignment.courseTitle} | ${assignment.oldRoomName} → ${assignment.newRoomName}`,
      status: "Rejected",
    });

    alert("Room reassignment rejected.");

    navigate("/faculty");

  } catch (err) {

    console.log(err);

  }

};

  const approveAssignment = async () => {

  try {
    if (isExpired()) {
        alert("This room reassignment has already expired.");
        return;
    }

    await updateDoc(doc(db, "roomReassignments", assignment.id), {
      status: "approved",
      approvedAt: serverTimestamp(),
    });

    if (assignment.eventId) {
      await updateDoc(doc(db, "events", assignment.eventId), {
        conflictResolved: true,
      });
    }

    await sendDecisionNotifications("accepted");

    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const userData = userSnap.data();

    await logActivity({
      user: `${userData.firstName} ${userData.lastName}`,
      role: userData.role,
      action: "Accepted room reassignment",
      actionType: "success",
      target: `${assignment.courseTitle} | ${assignment.oldRoomName} → ${assignment.newRoomName}`,
      status: "Success",
    });

    alert("Room reassignment accepted.");

    navigate("/faculty");

  } catch (err) {

    console.log(err);

  }

};

  if (loading) {

    return (
      <div className="faculty-room-loading">
        <div className="spinner"></div>
        <p>Loading room reassignment...</p>
      </div>
    );

  }

  if (!assignment) {

    return (
      <div className="faculty-room-loading">
        <h2>Room reassignment not found.</h2>
      </div>
    );

  }

  return (

    <div className="faculty-room-page">

      <div className="faculty-room-card">

        <div className="faculty-room-header">

          <h1>Room Reassignment Request</h1>

          <p>
            The Department Head has proposed a temporary room change for one of your classes.
          </p>

        </div>

        <div className="faculty-room-section">

          <h3>Class Information</h3>

          <div className="faculty-room-grid">

            <div className="info-box">
              <label>Course</label>
              <span>{assignment.courseTitle}</span>
            </div>

            <div className="info-box">
              <label>Section</label>
              <span>{assignment.section}</span>
            </div>

            <div className="info-box">
              <label>Date</label>
              <span>{assignment.date}</span>
            </div>

            <div className="info-box">
              <label>Time</label>
              <span>
                {assignment.startTime} - {assignment.endTime}
              </span>
            </div>

          </div>

        </div>

        <div className="faculty-room-section">

          <h3>Room Change</h3>

          <div className="room-change">

            <div className="room-box">

              <label>Current Room</label>

              <h2>{assignment.oldRoomName}</h2>

            </div>

            <div className="arrow">

              <i className="fa-solid fa-arrow-right"></i>

            </div>

            <div className="room-box new">

              <label>Suggested Room</label>

              <h2>{assignment.newRoomName}</h2>

            </div>

          </div>

        </div>

        <div className="faculty-room-note">

          <i className="fa-solid fa-circle-info"></i>

          <span>

            This reassignment only applies to this scheduled class.
            Your regular weekly room assignment will remain unchanged.

          </span>

        </div>

        {!isExpired() ? (

          <div className="faculty-room-actions">

              <button
                  className="reject-btn"
                  onClick={rejectAssignment}
              >
                  Reject
              </button>

              <button
                  className="approve-btn"
                  onClick={approveAssignment}
              >
                  Accept Room
              </button>

          </div>

          ) : (

          <div
              className="faculty-room-note"
              style={{
                  marginTop:30,
                  background:"#fef2f2",
                  border:"1px solid #fecaca",
                  color:"#991b1b"
              }}
          >
              <i className="fa-solid fa-clock"></i>

              <span>

                  This room reassignment has already ended. The response period is now closed.

              </span>

          </div>

          )}

      </div>

    </div>

  );

}