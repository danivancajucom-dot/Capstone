import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./bulk-schedule-upload4.css";
import ConfirmPopup from "../../../Popup/ConfirmPopup/ConfirmPopup";
import Toast from "../../../Popup/Toast/Toast";
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

// ─── Normalize name (same as other modules) ──────────────────────────
const normalizeName = (name = "") =>
  name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

// ─── Find user by name ───────────────────────────────────────────────
const findUserByName = async (name) => {
  if (!name) return null;
  const usersSnap = await getDocs(collection(db, "users"));
  const normalizedTarget = normalizeName(name);
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const fullName = normalizeName(
      `${data.lastName || ""}, ${data.firstName || ""}${data.middleInitial ? ` ${data.middleInitial}` : ""}`
    );
    if (fullName === normalizedTarget) {
      return { id: doc.id, ...data };
    }
  }
  return null;
};

// ─── Send notifications ─────────────────────────────────────────────
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

export default function BulkScheduleUpload4() {
  const location = useLocation();
  const navigate = useNavigate();

  const { semester, schoolYear, room } = location.state || {};
  const rawSchedules = useMemo(() => location.state?.schedules || [], [location.state]);

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  // ─── Activity log ─────────────────────────────────────────────────
  const logActivity = async ({ userId, user, role, action, actionType, target, status }) => {
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

  // ─── Confirm upload ──────────────────────────────────────────────
  const handleConfirm = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");
    showToast("loading", "Uploading", "Saving schedules...");

    try {
      // Find room document
      const roomQuery = query(
        collection(db, "rooms"),
        where("roomName", "==", room)
      );
      const roomSnapshot = await getDocs(roomQuery);
      if (roomSnapshot.empty) {
        showToast("error", "Error", "Room not found.");
        return;
      }
      const roomDoc = roomSnapshot.docs[0];
      const roomId = roomDoc.id;

      // Get current user
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

      // Save schedules
      const savedSchedules = [];
      for (const schedule of rawSchedules) {
        const docRef = await addDoc(
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
        savedSchedules.push({ ...schedule, docId: docRef.id });
      }

      // ─── Activity log ──────────────────────────────────────────
      await logActivity({
        userId: currentUserData.userId,
        user: currentUserData.user,
        role: currentUserData.role,
        action: "Uploaded Schedule",
        actionType: "CREATE",
        target: `${rawSchedules.length} schedules for ${room} (${semester}, ${schoolYear})`,
        status: "SUCCESS",
      });

      // ─── Notifications ─────────────────────────────────────────

      // 1. Notify each faculty
      const facultyNotified = [];
      for (const schedule of savedSchedules) {
        const facultyName = schedule.faculty;
        if (!facultyName || facultyName === "TBA") continue;

        const facultyUser = await findUserByName(facultyName);
        if (facultyUser && facultyUser.id) {
          await sendNotification(
            facultyUser.id,
            "faculty",
            "New Schedule Uploaded",
            `A schedule for "${schedule.subject}" (${schedule.day} ${formatTime12Hour(schedule.startTime)}-${formatTime12Hour(schedule.endTime)}) has been uploaded for ${room}.`,
            "schedule-upload",
            "NEW"
          );
          facultyNotified.push(facultyName);
        } else {
          console.warn(`Faculty not found: ${facultyName}`);
        }
      }

      // 2. Notify all department heads
      const deptHeadsSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "department-head"))
      );
      const deptHeadNotifications = [];
      deptHeadsSnap.forEach((doc) => {
        deptHeadNotifications.push(
          sendNotification(
            doc.id,
            "department-head",
            "New Schedule Upload",
            `${currentUserData.user} uploaded ${rawSchedules.length} schedules for ${room} (${semester}, ${schoolYear}).`,
            "schedule-upload",
            "INFO"
          )
        );
      });
      await Promise.all(deptHeadNotifications);

      // 3. Notify local registrar (self)
      if (currentUserData.userId) {
        await sendNotification(
          currentUserData.userId,
          "local-registrar",
          "Schedule Upload Complete",
          `You successfully uploaded ${rawSchedules.length} schedules for ${room} (${semester}, ${schoolYear}).`,
          "schedule-upload",
          "SUCCESS"
        );
      }

      // ─── Success ──────────────────────────────────────────────
      showToast(
        "success",
        "Upload Complete",
        `${rawSchedules.length} schedules uploaded successfully.`
      );

      setTimeout(() => {
        navigate("/local-registrar");
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      showToast("error", "Upload Failed", error.message || "Something went wrong.");
      setErrorMessage(error.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Early return if no data ──────────────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="bulk-upload-page-four">
      <div className="bulk-header-four">
        <h1>Bulk Schedule Upload</h1>
        <p>Confirm extracted schedules before saving.</p>
      </div>

      {/* Stepper */}
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

      {/* Info Card */}
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

        {/* Preview */}
        <div className="bulk4-preview">
          <div className="bulk4-preview-header">
            <h3>Extracted Schedules</h3>
            <span className="bulk4-count">{rawSchedules.length} schedules</span>
          </div>

          <div className="bulk4-grid">
            {rawSchedules.map((schedule, index) => (
              <div key={index} className="bulk4-card">
                <div className="bulk4-card-header">
                  <h4>{schedule.subject}</h4>
                  {schedule.section && (
                    <span className="bulk4-section">{schedule.section}</span>
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
                      {formatTime12Hour(schedule.startTime)} - {formatTime12Hour(schedule.endTime)}
                    </span>
                  </div>
                  <div className="bulk4-item">
                    <i className="fa-regular fa-user"></i>
                    <span>{schedule.faculty || "TBA"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bulk-footer-four">
        <button className="btn-back-four" onClick={() => navigate(-1)}>
          Back
        </button>
        <button className="btn-confirm-four" onClick={() => setShowModal(true)}>
          Confirm Upload
        </button>
      </div>

      {/* Confirm Modal */}
      {showModal && (
        <ConfirmPopup
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}

      {/* Toast */}
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