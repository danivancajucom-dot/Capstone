import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
 
const firebaseConfig = {
  apiKey: "AIzaSyAQRQ0DcO-giGzZN46w91TJb2NGZ1S8ykQ",
  authDomain: "spaces-cict.firebaseapp.com",
  projectId: "spaces-cict",
  storageBucket: "spaces-cict.firebasestorage.app",
  messagingSenderId: "268419005346",
  appId: "1:268419005346:web:6c2bb5f113f46ff28890fb",
};
 
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
 
// ── EDIT THIS ──────────────────────────────────────────────────────────────────
const DEPARTMENT_HEAD_UID   = "oI1qt3CV2VPjMrrxHPAOgeigigE3";
const DEPARTMENT_HEAD_EMAIL = "depthead@bulsu.cict"; // same email used in Auth
 
await setDoc(doc(db, "users", DEPARTMENT_HEAD_UID), {
  firstName: "Your",
  lastName:  "Name",
  gender:    "Male",            // or "Female"
  email:     DEPARTMENT_HEAD_EMAIL,
  role:      "Department Head",
  status:    "Active",
  createdAt: new Date().toISOString(),
});
 
console.log("✅ Department Head document created in Firestore.");
 