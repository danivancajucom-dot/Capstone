import "./department-head-view-reservation.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import { logActivity } from "../../utils/logActivity";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import Toast from "../../Popup/Toast/Toast";

// ─── Helper: find user by name ─────────────────────────────────────────
const findUserByName = async (name) => {
  if (!name) return null;
  const usersSnap = await getDocs(collection(db, "users"));
  const normalized = name.trim().toLowerCase();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim().toLowerCase();
    if (fullName === normalized) return { id: doc.id, ...data };
  }
  return null;
};

function DepartmentHeadViewReservation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const reservation = state?.reservation;

  const [showDenial, setShowDenial] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toastTimeoutRef = useRef(null);

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

  if (!reservation) {
    return (
      <div className="dh-view-reservation">
        <h2>Reservation not found.</h2>
        <button onClick={() => navigate("/department-head/reservations")}>Back</button>
      </div>
    );
  }

  // ─── Notification helpers ──────────────────────────────────────────────

  const notifyReservationDecision = async (
    receiverId,
    ownerType,
    title,
    message,
    reservationId,
    type,
    badge = "INFO"
  ) => {
    if (!receiverId) {
      console.warn("Skipping notification: no receiverId");
      return;
    }
    await addDoc(collection(db, "notifications"), {
      userId: receiverId,
      ownerType,
      reservationId,
      title,
      message,
      type,
      unread: true,
      archived: false,
      badge,
      createdAt: serverTimestamp(),
    });
    console.log(`Notification sent to ${ownerType} (${receiverId})`);
  };

  const notifyAllClerks = async (title, message, reservationId) => {
    const usersSnap = await getDocs(collection(db, "users"));
    const notifications = [];
    usersSnap.forEach((doc) => {
      const role = (doc.data().role || "").toLowerCase().trim();
      if (role === "clerk") {
        notifications.push(
          addDoc(collection(db, "notifications"), {
            userId: doc.id,
            ownerType: "clerk",
            reservationId,
            title,
            message,
            type: "reservation-decision",
            unread: true,
            archived: false,
            badge: "INFO",
            createdAt: serverTimestamp(),
          })
        );
      }
    });
    if (notifications.length > 0) {
      await Promise.all(notifications);
      console.log(`Notified ${notifications.length} clerk(s)`);
    } else {
      console.warn("No clerks found to notify.");
    }
  };

  // ─── Approve ────────────────────────────────────────────────────────────

  const approveReservation = async () => {
    setSubmitting(true);
    showToast("loading", "Processing", "Approving reservation...");

    try {
      // 1. Update reservation
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        status: "Approved",
      });

      // 2. Create event
      await addDoc(collection(db, "events"), {
        roomId: reservation.roomId,
        roomName: reservation.roomName,
        facultyName: reservation.facultyName,
        courseTitle: reservation.courseTitle,
        purpose: reservation.purpose,
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        createdAt: serverTimestamp(),
        source: "Reservation",
      });

      const firebaseUser = auth.currentUser;
      let currentUser = {};
      let deptHeadName = "Department Head";
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          currentUser = userSnap.data();
          deptHeadName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Department Head";
        }
      }

      // 3. Activity log
      await logActivity({
        userId: firebaseUser?.uid || "",
        user: deptHeadName,
        role: "Department Head",
        action: "Approved Reservation",
        actionType: "success",
        target: `${reservation.roomName} - ${reservation.courseTitle}`,
        status: "SUCCESS",
        details: {
          reservationId: reservation.id,
          faculty: reservation.facultyName,
          course: reservation.courseTitle,
          date: reservation.date,
          time: `${reservation.startTime} - ${reservation.endTime}`,
        },
      });

      // ─── 4. Notifications ───────────────────────────────────────────

      // a) Faculty (try reservation.userId, else fallback to name lookup)
      let facultyUserId = reservation.userId;
      if (!facultyUserId && reservation.facultyName) {
        const user = await findUserByName(reservation.facultyName);
        if (user) facultyUserId = user.id;
        else console.warn("Faculty user not found by name:", reservation.facultyName);
      }

      if (facultyUserId) {
        await notifyReservationDecision(
          facultyUserId,
          "faculty",
          "Reservation Approved",
          `Your reservation request for ${reservation.roomName} on ${reservation.date} (${reservation.startTime} - ${reservation.endTime}) has been approved.`,
          reservation.id,
          "reservation-approved",
          "SUCCESS"
        );
      } else {
        console.warn("No faculty userId found, skipping faculty notification.");
      }

      // b) Department head (self)
      if (firebaseUser?.uid) {
        await notifyReservationDecision(
          firebaseUser.uid,
          "department-head",
          "Reservation Approved",
          `You approved ${reservation.facultyName}'s reservation request for ${reservation.roomName}.`,
          reservation.id,
          "reservation-approved",
          "INFO"
        );
      }

      // c) All clerks
      await notifyAllClerks(
        "Reservation Approved",
        `${reservation.facultyName}'s reservation for ${reservation.roomName} was approved by Department Head.`,
        reservation.id
      );

      setShowConfirm(false);
      showToast("success", "Success", "Reservation approved successfully!");

      setTimeout(() => navigate("/department-head/reservations"), 1500);
    } catch (err) {
      console.error("Approve error:", err);
      showToast("error", "Error", err.message || "Failed to approve reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Deny ──────────────────────────────────────────────────────────────

  const denyReservation = async (reason) => {
    setSubmitting(true);
    showToast("loading", "Processing", "Denying reservation...");

    try {
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        status: "Rejected",
        denialReason: reason,
      });

      const firebaseUser = auth.currentUser;
      let currentUser = {};
      let deptHeadName = "Department Head";
      if (firebaseUser) {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userSnap.exists()) {
          currentUser = userSnap.data();
          deptHeadName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Department Head";
        }
      }

      // Activity log
      await logActivity({
        userId: firebaseUser?.uid || "",
        user: deptHeadName,
        role: "Department Head",
        action: "Rejected Reservation",
        actionType: "failed",
        target: `${reservation.roomName} - ${reservation.courseTitle}`,
        status: "FAILED",
        details: {
          reservationId: reservation.id,
          faculty: reservation.facultyName,
          reason,
        },
      });

      // Notifications (same fallback logic)
      let facultyUserId = reservation.userId;
      if (!facultyUserId && reservation.facultyName) {
        const user = await findUserByName(reservation.facultyName);
        if (user) facultyUserId = user.id;
      }

      if (facultyUserId) {
        await notifyReservationDecision(
          facultyUserId,
          "faculty",
          "Reservation Rejected",
          `Your reservation request for ${reservation.roomName} was rejected.\nReason: ${reason}`,
          reservation.id,
          "reservation-rejected",
          "WARNING"
        );
      }

      if (firebaseUser?.uid) {
        await notifyReservationDecision(
          firebaseUser.uid,
          "department-head",
          "Reservation Rejected",
          `You rejected ${reservation.facultyName}'s reservation request.`,
          reservation.id,
          "reservation-rejected",
          "INFO"
        );
      }

      await notifyAllClerks(
        "Reservation Rejected",
        `${reservation.facultyName}'s reservation for ${reservation.roomName} was rejected by Department Head.`,
        reservation.id
      );

      setShowDenial(false);
      showToast("success", "Success", "Reservation denied successfully.");

      setTimeout(() => navigate("/department-head/reservations"), 1500);
    } catch (err) {
      console.error("Deny error:", err);
      showToast("error", "Error", err.message || "Failed to deny reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Duration helper ────────────────────────────────────────────────────

  const getDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const diffMs = new Date().setHours(endHour, endMin, 0) - new Date().setHours(startHour, startMin, 0);
    if (diffMs <= 0) return "N/A";
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours && minutes) return `${hours} hr ${minutes} min`;
    if (hours) return `${hours} hr`;
    return `${minutes} min`;
  };

  const createdDate =
    reservation.createdAt?.seconds
      ? new Date(reservation.createdAt.seconds * 1000)
      : new Date(reservation.createdAt);

  const duration = getDuration(reservation.startTime, reservation.endTime);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="dh-view-reservation">
        <i
          className="fa-solid fa-arrow-left dh-view-reservation-back"
          onClick={() => navigate(-1)}
        ></i>

        <div className="white-box-view-reservation">
          <div className="dh-reservation-header">
            <div className="dh-reservation-header-left">
              <div className="dh-reservation-profile">
                <i className="fa-solid fa-user"></i>
              </div>
              <span className="dh-reservation-faculty-name">
                {reservation.facultyName || reservation.requesterName || "Unknown"}
              </span>
            </div>
            <div className="dh-reservation-header-right">
              <button
                className="dh-deny-request-btn"
                onClick={() => setShowDenial(true)}
                disabled={submitting}
              >
                Deny
              </button>
              <button
                className="dh-approve-request-btn"
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
              >
                Approve Request
              </button>
            </div>
          </div>

          <div className="dh-reservation-info-boxes">
            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Metadata</h3>
              <div className="dh-info-box-content">
                <p>
                  Requested On: {createdDate.toLocaleDateString()} |{" "}
                  {createdDate.toLocaleTimeString()}
                </p>
                <p>Status: {reservation.status}</p>
              </div>
            </div>

            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Details</h3>
              <div className="dh-info-box-content">
                <div className="dh-info-box-details">
                  <p>Room Name: {reservation.roomName}</p>
                  <p>Room Capacity: {reservation.roomCapacity}</p>
                  <p>Course Title: {reservation.courseTitle}</p>
                  <p>Date: {reservation.date}</p>
                  <p>Start Time: {reservation.startTime}</p>
                  <p>Total Duration: {duration}</p>
                  <p>End Time: {reservation.endTime}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dh-reservation-info-boxes">
            <div className="dh-reservation-info-box">
              <h3 className="dh-info-box-title">Reservation Purpose</h3>
              <div className="dh-info-box-content">
                <p>
                  <strong>Audience Type:</strong> {reservation.audienceType}
                </p>

                {reservation.audienceType === "Class" && (
                  <>
                    <p>
                      <strong>Course:</strong> {reservation.attendees?.course}
                    </p>
                    <p>
                      <strong>Year/Section/Group:</strong>{" "}
                      {reservation.attendees?.yearSectionGroup}
                    </p>
                  </>
                )}

                {reservation.audienceType === "Organization" && (
                  <p>
                    <strong>Organization:</strong> {reservation.attendees?.organization}
                  </p>
                )}

                {reservation.audienceType === "Faculty" && (
                  <p>
                    <strong>Attendees:</strong> Faculty Members
                  </p>
                )}

                {reservation.audienceType === "Others" && (
                  <p>
                    <strong>Attendees:</strong> {reservation.attendees?.otherAudience}
                  </p>
                )}
                <p>
                  <strong>Purpose:</strong> {reservation.purpose}
                </p>
              </div>
            </div>

            <div className="dh-reservation-info-box conflict-check-box">
              <h3 className="dh-info-box-title">Conflict Check</h3>
              <div className="dh-info-box-content">
                <p>No conflict detected.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDenial && (
        <DenialPopup
          onCancel={() => setShowDenial(false)}
          onConfirm={denyReservation}
        />
      )}

      {showConfirm && (
        <ConfirmPopup
          onCancel={() => setShowConfirm(false)}
          onConfirm={approveReservation}
        />
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </>
  );
}

export default DepartmentHeadViewReservation;