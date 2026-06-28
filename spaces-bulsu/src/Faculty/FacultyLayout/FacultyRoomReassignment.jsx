import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebase";
import "./faculty-room-reassignment.css";

export default function FacultyRoomReassignment() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const loadAssignment = async () => {

      try {

        const snap = await getDoc(
          doc(db, "roomReassignments", id)
        );

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

  }, [id]);

  const rejectAssignment = async () => {

    try {

      await updateDoc(
        doc(db, "roomReassignments", assignment.id),
        {
          status: "rejected",
          rejectedAt: serverTimestamp()
        }
      );

      alert("Room reassignment rejected.");

      navigate("/faculty");

    } catch (err) {

      console.log(err);

    }

  };

  const approveAssignment = async () => {

    try {

      await updateDoc(
        doc(db, "roomReassignments", assignment.id),
        {
          status: "approved",
          approvedAt: serverTimestamp()
        }
      );

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

      </div>

    </div>

  );

}