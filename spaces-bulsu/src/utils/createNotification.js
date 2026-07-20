import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export const createNotification = async ({
  userId,
  title,
  message,
  imageUrl = null,
  type = "announcement",
  badge = "",
  sender = "System",

  // bagong fields
  reservationId = null,
  ownerType = "",
}) => {
  await addDoc(collection(db, "notifications"), {
    userId,
    ownerType,

    reservationId,

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