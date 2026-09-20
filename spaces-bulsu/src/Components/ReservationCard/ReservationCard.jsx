import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./reservation-card.css";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";
import {
  doc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";

// ─── Status config: label, icon, css modifier ─────────────────────
const STATUS_CONFIG = {
  pending:   { label: "Pending",   icon: "fa-clock",       modifier: "pending" },
  approved:  { label: "Approved",  icon: "fa-circle-check", modifier: "approved" },
  rejected:  { label: "Denied",    icon: "fa-circle-xmark", modifier: "denied" },
  denied:    { label: "Denied",    icon: "fa-circle-xmark", modifier: "denied" },
  cancelled: { label: "Cancelled", icon: "fa-ban",          modifier: "cancelled" },
};

const getStatusConfig = (status) => {
  const key = status?.toLowerCase().trim() || "pending";
  return STATUS_CONFIG[key] || STATUS_CONFIG.pending;
};

function ReservationCard({
  reservation,
  basePath = "/clerk/view-online-reservation",
  readOnly = false,
}) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDenial, setShowDenial] = useState(false);

  // ─── Room photo state ─────────────────────────────────────────
  const [roomPhoto, setRoomPhoto] = useState(null);

  // ─── Status config para sa badge ──────────────────────────────
  const statusConfig = getStatusConfig(reservation?.status);

  const approveReservation = async () => {
    try {
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        status: "Approved",
      });
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const denyReservation = async (reason) => {
    try {
      await updateDoc(doc(db, "reservationRequests", reservation.id), {
        status: "Rejected",
        denialReason: reason,
      });
      setShowDenial(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Fetch room photo ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchRoomPhoto = async () => {
      if (!reservation) return;

      try {
        let roomData = null;

        // Approach 1: via roomId (fastest)
        if (reservation.roomId) {
          const roomSnap = await getDoc(doc(db, "rooms", reservation.roomId));
          if (roomSnap.exists()) {
            roomData = roomSnap.data();
          }
        }

        // Approach 2: fallback by roomName
        if (!roomData && reservation.roomName) {
          const q = query(
            collection(db, "rooms"),
            where("roomName", "==", reservation.roomName.trim())
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            roomData = snap.docs[0].data();
          }
        }

        if (!roomData) return;

        const photo = roomData.photoUrl;
        if (photo && !cancelled) {
          setRoomPhoto(photo);
        }
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

            {/* ✅ Dynamic status badge — laging lumalabas */}
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

          {/* Actions — Pending lang (kapag hindi readOnly) */}
          {!readOnly && (
            <div className="reservation-actions">
              <button
                className="approve-btn-reservation"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirm(true);
                }}
              >
                <i className="fa-solid fa-circle-check"></i> Approve
              </button>
              <button
                className="deny-btn-reservation"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDenial(true);
                }}
              >
                <i className="fa-solid fa-circle-xmark"></i> Deny
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
          onCancel={() => setShowConfirm(false)}
          onConfirm={approveReservation}
        />
      )}

      {showDenial && (
        <DenialPopup
          onCancel={() => setShowDenial(false)}
          onConfirm={denyReservation}
        />
      )}
    </>
  );
}

export default ReservationCard;