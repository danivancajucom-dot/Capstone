import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const logActivity = async ({
  user,
  role,
  action,
  actionType,
  target,
  status,
  userId
}) => {
  try {
    await addDoc(collection(db, "activityLogs"), {
      user,
      role,
      action,
      actionType,
      target,
      status,
      userId,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};