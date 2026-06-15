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
  type = "announcement",
  badge = "",
  sender = "System",
}) => {
  await addDoc(
    collection(db, "notifications"),
    {
      userId,
      title,
      message,
      type,
      badge,
      sender,

      unread: true,
      archived: false,

      createdAt: serverTimestamp(),
    }
  );
};