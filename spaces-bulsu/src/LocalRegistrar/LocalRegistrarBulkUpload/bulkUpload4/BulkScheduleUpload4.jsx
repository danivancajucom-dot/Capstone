import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "./bulk-schedule-upload4.css";

import ConfirmPopup from "../../../Popup/ConfirmPopup/ConfirmPopup";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../../firebase";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

const formatTime12Hour = (time) => {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;

  if (displayHour === 0) displayHour = 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

export default function BulkScheduleUpload4() {
  const location = useLocation();
  const navigate = useNavigate();

  const { semester, schoolYear, room } = location.state || {};
  const rawSchedules = useMemo(() => {
      return location.state?.schedules || [];
  }, [location.state]);

  const [showModal, setShowModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const logActivity = async ({
  userId,
  user,
  role,
  action,
  actionType,
  target,
  status,
}) => {
  try {
    await addDoc(collection(db, "activityLogs"), {
      userId,
      user,
      role,
      action,
      actionType,
      target,
      status,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Activity log error:", err);
  }
};

  const handleConfirm = async () => {

    if(isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    try{
      const { collection, query, where, getDocs, addDoc } =
        await import("firebase/firestore");

      // hanapin ang room document
      const roomQuery = query(
        collection(db, "rooms"),
        where("roomName", "==", room)
      );

      const roomSnapshot = await getDocs(roomQuery);

      if (roomSnapshot.empty) {
        alert("Room not found.");
        return;
      }

      const roomDoc = roomSnapshot.docs[0];
      const roomId = roomDoc.id;

      const currentUser = auth.currentUser;

      let currentUserData = {
        userId: "",
        user: "Unknown User",
        role: "",
      };

      if (currentUser) {
        const userQuery = query(
          collection(db, "users"),
          where("email", "==", currentUser.email)
        );

        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0].data();

          currentUserData = {
            userId: currentUser.uid,
            user: `${userDoc.firstName} ${userDoc.lastName}`,
            role: userDoc.role,
          };
        }
      }

      // save schedules
      for (const schedule of rawSchedules) {
        await addDoc(
          collection(db, "rooms", roomId, "schedules"),
          {
            subject: schedule.subject || "",
            section: schedule.section || "",
            faculty: schedule.faculty || "TBA",

            day: schedule.day || "",

            startTime: schedule.startTime || "",
            endTime: schedule.endTime || "",

            semester,
            schoolYear,

            createdAt: serverTimestamp(),
          }
        );
      }

      await logActivity({
        userId: currentUserData.userId,
        user: currentUserData.user,
        role: currentUserData.role,
        action: "Bulk Uploaded Schedule",
        actionType: "success",
        target: `${rawSchedules.length} schedules for ${room} (${semester}, ${schoolYear})`,
        status: "SUCCESS",
      });

      alert(
        `${rawSchedules.length} schedules uploaded successfully!`
      );

      setSuccessMessage(
          `${rawSchedules.length} schedules uploaded successfully.`
      );

      setTimeout(() => {
          navigate("/local-registrar");
      },1000);

    } catch(error){

        console.error(error);

        setErrorMessage(
            error.message || "Something went wrong."
        );

    }
    finally{

        setIsSaving(false);

    }
  };

  if (!location.state) {
    return (
      <div className="bulk-upload-page-four">
        <h2>No data to confirm.</h2>
        <button onClick={() => navigate("/local-registrar/bulk-upload-2")}>
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="bulk-upload-page-four">

      <div className="bulk-header-four">
        <h1>Bulk Schedule Upload</h1>
        <p>Confirm extracted schedules before saving.</p>
      </div>

      {/* STEP */}
      <div className="stepper-four">
        {steps.map((step, index) => (
          <div className="step-wrapper-four" key={step.number}>
            <div className="step-item-four">
              <div className={`step-circle-four ${step.number < 4 ? "completed" : ""} ${step.number === 4 ? "active" : ""}`}>
                {step.number < 4 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label-four ${step.number === 4 ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && <div className="step-line-four completed" />}
          </div>
        ))}
      </div>

      {/* INFO */}
      <div className="form-card-four">
        <div className="info-card">
          <span className="info-title">Schedule Information</span>

          <div className="info-row">
            <div className="info-group">
              <span className="info-label">Room</span>
              <span className="info-value">{room}</span>
            </div>
            <div className="info-group">
              <span className="info-label">Semester</span>
              <span className="info-value">{semester}</span>
            </div>
            <div className="info-group">
              <span className="info-label">School Year</span>
              <span className="info-value">{schoolYear}</span>
            </div>

          </div>
        </div>

        {/* ✅ FIXED DISPLAY */}
        <div className="bulk4-preview">

          <div className="bulk4-preview-header">

            <h3>
              Extracted Schedules
            </h3>

            <span className="bulk4-count">
              {rawSchedules.length} schedules
            </span>

          </div>

          <div className="bulk4-grid">

            {rawSchedules.map((schedule, index) => (

              <div
                key={index}
                className="bulk4-card"
              >

                <div className="bulk4-card-header">

                  <h4>
                    {schedule.subject}
                  </h4>

                  {schedule.section && (

                    <span className="bulk4-section">

                      {schedule.section}

                    </span>

                  )}

                </div>

                <div className="bulk4-card-body">

                  <div className="bulk4-item">

                    <i className="fa-regular fa-calendar"></i>

                    <span>{schedule.day}</span>

                  </div>

                  <div className="bulk4-item">

                    <i className="fa-regular fa-clock"></i>

                    <span>

                      {formatTime12Hour(schedule.startTime)}

                      {" - "}

                      {formatTime12Hour(schedule.endTime)}

                    </span>

                  </div>

                  <div className="bulk4-item">

                    <i className="fa-regular fa-user"></i>

                    <span>

                      {schedule.faculty || "TBA"}

                    </span>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="bulk-footer-four">
        <button className="btn-back-four" onClick={() => navigate(-1)}>
          Back
        </button>

               <button
          className="btn-confirm-four"
          onClick={() => setShowModal(true)}
        >
          Confirm Upload
        </button>
      </div>

      {/* MODAL */}
      {showModal && (
        <ConfirmPopup
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}

    </div>
  );
}
