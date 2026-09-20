import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "./reservation-card.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";
import Toast from "../../Popup/Toast/Toast";
import {
  doc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { logActivity } from "../../utils/logActivity";

// ─── Status config: label, icon, css modifier ─────────────────────
const STATUS_CONFIG = {
  pending:   { label: "Pending",   icon: "fa-clock",        modifier: "pending" },
  approved:  { label: "Approved",  icon: "fa-circle-check", modifier: "approved" },
  rejected:  { label: "Denied",    icon: "fa-circle-xmark", modifier: "denied" },
  denied:    { label: "Denied",    icon: "fa-circle-xmark", modifier: "denied" },
  cancelled: { label: "Cancelled", icon: "fa-ban",          modifier: "cancelled" },
};

const getStatusConfig = (status) => {
  const key = status?.toLowerCase().trim() || "pending";
  return STATUS_CONFIG[key] || STATUS_CONFIG.pending;
};

// ─── Helper: find user by full name (faculty fallback) ────────────
const findUserByName = async (name) => {
  if (!name) return null;
  const usersSnap = await getDocs(collection(db, "users"));
  const normalized = name.trim().toLowerCase();
  for (const d of usersSnap.docs) {
    const data = d.data();
    const fullName = `${data.firstName || ""} ${data.lastName || ""}`
      .trim()
      .toLowerCase();
    if (fullName === normalized) return { id: d.id, ...data };
  }
  return null;
};

// ─── Helper: get current clerk user ───────────────────────────────
const getCurrentUser = async () => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return { uid: "", name: "Clerk", role: "Clerk" };
  const snap = await getDoc(doc(db, "users", firebaseUser.uid));
  const data = snap.exists() ? snap.data() : {};
  return {
    uid: firebaseUser.uid,
    name:
      `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Clerk",
    role: data.role || "Clerk",
  };
};

// ─── Helper: send one notification doc ────────────────────────────
const sendNotification = async ({
  receiverId,
  ownerType,
  title,
  message,
  reservationId,
  type,
  badge = "INFO",
}) => {
  if (!receiverId) return;
  try {
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
  } catch (err) {
    console.warn("Notification failed:", err);
  }
};

// ─── Helper: notify all admins ────────────────────────────────────
const notifyAllAdmins = async (title, message, reservationId) => {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const jobs = [];
    usersSnap.forEach((d) => {
      const role = (d.data().role || "").toLowerCase().trim();
      if (role === "admin") {
        jobs.push(
          addDoc(collection(db, "notifications"), {
            userId: d.id,
            ownerType: "admin",
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
    if (jobs.length) await Promise.all(jobs);
  } catch (err) {
    console.warn("notifyAllAdmins failed:", err);
  }
};

function ReservationCard({
  reservation,
  basePath = "/clerk/view-online-reservation",
  readOnly = false,
}) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDenial, setShowDenial] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Room photo state ─────────────────────────────────────────
  const [roomPhoto, setRoomPhoto] = useState(null);

  // ─── Toast state ──────────────────────────────────────────────
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
        setToast((p) => ({ ...p, show: false }));
        toastTimeoutRef.current = null;
      }, 4000);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const statusConfig = getStatusConfig(reservation?.status);

  // ─── Approve ──────────────────────────────────────────────────
  const approveReservation = async () => {
    setSubmitting(true);
    showToast("loading", "Processing", "Approving reservation...");

    try {
      // 1. Update reservation
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        status: "Approved",
      });

      // 2. Create room event
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

      const me = await getCurrentUser();

      // 3. Activity log
      await logActivity({
        userId: me.uid,
        user: me.name,
        role: me.role,
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

      // ─── 4. Notifications ───────────────────────────────────────
      // a) Faculty
      let facultyUserId = reservation.userId;
      if (!facultyUserId && reservation.facultyName) {
        const u = await findUserByName(reservation.facultyName);
        if (u) facultyUserId = u.id;
      }
      if (facultyUserId) {
        await sendNotification({
          receiverId: facultyUserId,
          ownerType: "faculty",
          title: "Reservation Approved",
          message: `Your reservation request for ${reservation.roomName} on ${reservation.date} (${reservation.startTime} - ${reservation.endTime}) has been approved.`,
          reservationId: reservation.id,
          type: "reservation-approved",
          badge: "SUCCESS",
        });
      }

      // b) Self (clerk)
      if (me.uid) {
        await sendNotification({
          receiverId: me.uid,
          ownerType: "clerk",
          title: "Reservation Approved",
          message: `You approved ${reservation.facultyName}'s reservation request for ${reservation.roomName}.`,
          reservationId: reservation.id,
          type: "reservation-approved",
          badge: "INFO",
        });
      }

      // c) All admins
      await notifyAllAdmins(
        "Reservation Approved",
        `${reservation.facultyName}'s reservation for ${reservation.roomName} was approved by Clerk.`,
        reservation.id
      );

      setShowConfirm(false);
      showToast("success", "Success", "Reservation approved successfully!");
    } catch (err) {
      console.error("Approve error:", err);
      showToast("error", "Error", err.message || "Failed to approve reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Deny ─────────────────────────────────────────────────────
  const denyReservation = async (reason) => {
    setSubmitting(true);
    showToast("loading", "Processing", "Denying reservation...");

    try {
      // 1. Update reservation
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        status: "Rejected",
        denialReason: reason,
      });

      const me = await getCurrentUser();

      // 2. Activity log
      await logActivity({
        userId: me.uid,
        user: me.name,
        role: me.role,
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

      // ─── 3. Notifications ───────────────────────────────────────
      // a) Faculty
      let facultyUserId = reservation.userId;
      if (!facultyUserId && reservation.facultyName) {
        const u = await findUserByName(reservation.facultyName);
        if (u) facultyUserId = u.id;
      }
      if (facultyUserId) {
        await sendNotification({
          receiverId: facultyUserId,
          ownerType: "faculty",
          title: "Reservation Rejected",
          message: `Your reservation request for ${reservation.roomName} was rejected.\nReason: ${reason}`,
          reservationId: reservation.id,
          type: "reservation-rejected",
          badge: "WARNING",
        });
      }

      // b) Self (clerk)
      if (me.uid) {
        await sendNotification({
          receiverId: me.uid,
          ownerType: "clerk",
          title: "Reservation Rejected",
          message: `You rejected ${reservation.facultyName}'s reservation request for ${reservation.roomName}.`,
          reservationId: reservation.id,
          type: "reservation-rejected",
          badge: "INFO",
        });
      }

      // c) All admins
      await notifyAllAdmins(
        "Reservation Rejected",
        `${reservation.facultyName}'s reservation for ${reservation.roomName} was rejected by Clerk.`,
        reservation.id
      );

      setShowDenial(false);
      showToast("success", "Success", "Reservation denied successfully.");
    } catch (err) {
      console.error("Deny error:", err);
      showToast("error", "Error", err.message || "Failed to deny reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Fetch room photo ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchRoomPhoto = async () => {
      if (!reservation) return;
      try {
        let roomData = null;

        if (reservation.roomId) {
          const snap = await getDoc(doc(db, "rooms", reservation.roomId));
          if (snap.exists()) roomData = snap.data();
        }

        if (!roomData && reservation.roomName) {
          const q = query(
            collection(db, "rooms"),
            where("roomName", "==", reservation.roomName.trim())
          );
          const snap = await getDocs(q);
          if (!snap.empty) roomData = snap.docs[0].data();
        }

        if (!roomData) return;
        const photo = roomData.photoUrl;
        if (photo && !cancelled) setRoomPhoto(photo);
      } catch (err) {
        console.error("Failed to fetch room photo:", err);
      }
    };

    fetchRoomPhoto();
    return () => {
      cancelled = true;
    };
  }, [reservation]);

  return (
    <>
      <div
        className="reservation-card"
        onClick={() =>
          navigate(basePath, {
            state: { reservation },
          })
        }
        style={{ cursor: "pointer" }}
      >
        <div className="reservation-card-left">
          <div className="reservation-top-row">
            <span className="reservation-room-badge">
              {reservation.roomName}
            </span>

            <span
              className={`reservation-status-badge ${statusConfig.modifier}`}
            >
              <i className={`fa-solid ${statusConfig.icon}`}></i>
              {statusConfig.label}
            </span>
          </div>

          <h3 className="reservation-name">
            {reservation.facultyName || reservation.requesterName}
          </h3>
          <p className="reservation-time">
            {reservation.startTime} - {reservation.endTime} • {reservation.date}
          </p>
          <div className="reservation-course">
            <i className="fa-solid fa-users"></i>
            <span className="course-title">
              {reservation.courseTitle || "N/A"}
            </span>
          </div>

          {!readOnly && (
            <div className="reservation-actions">
              <button
                className="approve-btn-reservation"
                onClick={(e) => {
                  e.stopPropagation();
                  if (submitting) return;
                  setShowConfirm(true);
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Please wait
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check"></i> Approve
                  </>
                )}
              </button>
              <button
                className="deny-btn-reservation"
                onClick={(e) => {
                  e.stopPropagation();
                  if (submitting) return;
                  setShowDenial(true);
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Please wait
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-xmark"></i> Deny
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="reservation-card-right">
          <span className="reservation-time-ago">
            {reservation.createdAt?.toDate?.().toLocaleDateString()}
          </span>

          <div className="reservation-image">
            {roomPhoto ? (
              <img
                src={roomPhoto}
                alt={reservation.roomName || "Room"}
                onError={() => setRoomPhoto(null)}
              />
            ) : (
              <div className="reservation-image-placeholder">
                <i className="fa-solid fa-door-open"></i>
                <span>{reservation.roomName || "No Room"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmPopup
          onCancel={() => !submitting && setShowConfirm(false)}
          onConfirm={submitting ? null : approveReservation}
        />
      )}

      {showDenial && (
        <DenialPopup
          onCancel={() => !submitting && setShowDenial(false)}
          onConfirm={submitting ? null : denyReservation}
        />
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((p) => ({ ...p, show: false }))}
      />
    </>
  );
}

export default ReservationCard;