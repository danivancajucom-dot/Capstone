import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const createNotification = async ({
  userId,
  title,
  message,
  imageUrl = null,
  type = "announcement",
  badge = "",
  sender = "System",

  // reservation-related
  reservationId = null,
  ownerType = "",

  // security-related (NEW)
  email = null,
  attemptCount = null,
  reason = null,
  reassignmentId = null,
}) => {
  await addDoc(collection(db, "notifications"), {
    userId,
    ownerType,

    reservationId,
    reassignmentId,

    // security context
    email,
    attemptCount,
    reason,

    title,
    message,

    imageUrl,

    type,

    badge,

    sender,

    unread: true,
    archived: false,

    createdAt: serverTimestamp(),
  });
};
