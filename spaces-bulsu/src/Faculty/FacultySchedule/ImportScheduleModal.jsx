import { useState, useRef } from "react";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";
import "./import-schedule-modal.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ─── helpers ──────────────────────────────────────────────────────

async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows.map((row, index) => {
    const normalized = {};
    Object.keys(row).forEach((key) => {
      normalized[key.toLowerCase().trim()] = row[key];
    });

    const startTime =
      normalized["start time"] || normalized["starttime"] || normalized["start_time"] || "";
    const endTime =
      normalized["end time"] || normalized["endtime"] || normalized["end_time"] || "";

    return {
      id: index + 1,
      subject: normalized["subject"] || "",
      section: normalized["section"] || "",
      faculty: normalized["faculty"] || "",
      day: normalized["day"] || "",
      startTime,
      endTime,
      time: startTime && endTime ? `${startTime} - ${endTime}` : "",
      room: normalized["room"] || "",
    };
  });
}

async function extractRawText(file) {
  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return fullText;
  } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    let allText = "";
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      allText += XLSX.utils.sheet_to_csv(sheet) + "\n";
    });
    return allText;
  } else {
    throw new Error("Unsupported file type");
  }
}

// ─── helpers for term ranking ────────────────────────────────────

const semesterRank = (sem = "") => {
  const s = sem.toLowerCase();
  if (s.includes("2nd")) return 2;
  if (s.includes("1st")) return 1;
  return 0;
};

const schoolYearStart = (sy = "") => {
  const match = sy.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
};

const normalizeName = (name = "") =>
  name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export default function ImportScheduleModal({ show, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });

  const fileInputRef = useRef(null);

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type === "application/pdf" || selected.name.endsWith(".xlsx") || selected.name.endsWith(".xls"))) {
      setFile(selected);
    } else {
      showToast("error", "Invalid File", "Please upload a PDF or Excel file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type === "application/pdf" || dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      setFile(dropped);
    } else {
      showToast("error", "Invalid File", "Please upload a PDF or Excel file.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Get faculty's latest term from their room schedules ──────

  const getFacultyLatestTerm = async (facultyName) => {
    const normalizedFaculty = normalizeName(facultyName);
    let latestSemester = "1st Semester";
    let latestSchoolYear = "";
    let latestRank = -1;

    // Get all rooms
    const roomsSnap = await getDocs(collection(db, "rooms"));

    for (const roomDoc of roomsSnap.docs) {
      const schedulesSnap = await getDocs(collection(db, "rooms", roomDoc.id, "schedules"));

      schedulesSnap.forEach(doc => {
        const data = doc.data();
        if (!data.faculty) return;

        const normalizedScheduleFaculty = normalizeName(data.faculty);
        if (normalizedScheduleFaculty !== normalizedFaculty) return;

        if (data.semester && data.schoolYear) {
          const rank = schoolYearStart(data.schoolYear) * 10 + semesterRank(data.semester);
          if (rank > latestRank) {
            latestRank = rank;
            latestSemester = data.semester;
            latestSchoolYear = data.schoolYear;
          }
        }
      });
    }

    // If no existing schedules, use current year
    if (!latestSchoolYear) {
      const currentYear = new Date().getFullYear();
      latestSchoolYear = `${currentYear}-${currentYear + 1}`;
      latestSemester = "1st Semester";
    }

    return { semester: latestSemester, schoolYear: latestSchoolYear };
  };

  // ─── PROCESS ────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!file) {
      showToast("error", "No File", "Please select a file to upload.");
      return;
    }

    setLoading(true);
    setProgress("Processing file...");

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        showToast("error", "Not Logged In", "Please log in again.");
        setLoading(false);
        return;
      }

      // Get faculty details
      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!userSnap.exists()) {
        showToast("error", "User Not Found", "Your profile could not be found.");
        setLoading(false);
        return;
      }
      const userData = userSnap.data();
      const facultyName = `${userData.firstName} ${userData.lastName}`;

      // Parse file
      let schedules = [];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        schedules = await parseExcelFile(file);
      } else {
        const rawText = await extractRawText(file);
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${apiUrl}/api/extract-schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText,
            room: "",
            semester: "",
            schoolYear: "",
          }),
        });
        if (!response.ok) throw new Error("AI extraction failed.");
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "Extraction failed.");
        schedules = data.schedules || [];
      }

      if (schedules.length === 0) {
        showToast("error", "No Schedules Found", "Could not extract any schedules from the file.");
        setLoading(false);
        return;
      }

      setProgress(`Processing ${schedules.length} schedule entries...`);

      // ─── Get faculty's latest term ─────────────────────────────
      const { semester: facultySemester, schoolYear: facultySchoolYear } =
        await getFacultyLatestTerm(facultyName);

      // ─── PROCESS EACH SCHEDULE ──────────────────────────────────
      let added = 0;
      let skipped = 0;
      let onlineAdded = 0;

      for (const item of schedules) {
        const roomName = item.room?.trim();

        // ── CASE 1: Has a room → save to room's schedules ──
        if (roomName) {
          // Find room document
          const roomQuery = query(collection(db, "rooms"), where("roomName", "==", roomName));
          const roomSnap = await getDocs(roomQuery);
          if (roomSnap.empty) {
            console.warn(`Room "${roomName}" not found. Skipping.`);
            continue;
          }
          const roomDoc = roomSnap.docs[0];
          const roomId = roomDoc.id;

          // Determine the latest semester & school year for this room
          const existingSchedSnap = await getDocs(collection(db, "rooms", roomId, "schedules"));
          let latestSemester = "1st Semester";
          let latestSchoolYear = "";
          let latestRank = -1;

          existingSchedSnap.forEach(doc => {
            const data = doc.data();
            if (data.semester && data.schoolYear) {
              const rank = schoolYearStart(data.schoolYear) * 10 + semesterRank(data.semester);
              if (rank > latestRank) {
                latestRank = rank;
                latestSemester = data.semester;
                latestSchoolYear = data.schoolYear;
              }
            }
          });

          if (!latestSchoolYear) {
            const currentYear = new Date().getFullYear();
            latestSchoolYear = `${currentYear}-${currentYear + 1}`;
            latestSemester = "1st Semester";
          }

          // Check for duplicates
          const duplicateQuery = query(
            collection(db, "rooms", roomId, "schedules"),
            where("semester", "==", latestSemester),
            where("schoolYear", "==", latestSchoolYear),
            where("subject", "==", item.subject || ""),
            where("day", "==", item.day || ""),
            where("startTime", "==", item.startTime || ""),
            where("endTime", "==", item.endTime || "")
          );
          const dupSnap = await getDocs(duplicateQuery);
          if (!dupSnap.empty) {
            skipped++;
            continue;
          }

          // Add to room
          await addDoc(collection(db, "rooms", roomId, "schedules"), {
            subject: item.subject || "",
            section: item.section || "",
            faculty: facultyName,
            day: item.day || "",
            startTime: item.startTime || "",
            endTime: item.endTime || "",
            semester: latestSemester,
            schoolYear: latestSchoolYear,
            createdAt: serverTimestamp(),
          });
          added++;
        }

        // ── CASE 2: NO room → ONLINE CLASS ──
        else {
          // Save to faculty's personal schedule collection
          await addDoc(collection(db, "facultySchedules"), {
            userId: firebaseUser.uid,
            facultyName: facultyName,
            subject: item.subject || "",
            section: item.section || "",
            day: item.day || "",
            startTime: item.startTime || "",
            endTime: item.endTime || "",
            semester: facultySemester,
            schoolYear: facultySchoolYear,
            isOnline: true,
            createdAt: serverTimestamp(),
          });
          onlineAdded++;
        }
      }

      setProgress(`Done: ${added} room schedules added, ${onlineAdded} online classes added, ${skipped} duplicates skipped.`);
      showToast(
        "success",
        "Import Complete",
        `${added} room schedules + ${onlineAdded} online classes added. ${skipped} duplicates skipped.`
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error(error);
      showToast("error", "Import Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="ism-overlay" onClick={onClose}>
      <div className="ism-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ism-header">
          <h3>Import Schedule</h3>
          <button className="ism-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="ism-body">
          <p>
            Upload a PDF or Excel file containing your class schedule.
            <br />
            <strong>Schedules without a room</strong> will be saved as <strong>Online Classes</strong>.
          </p>

          <div
            className={`ism-dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.xlsx,.xls"
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: "none" }}
            />

            {file ? (
              <div className="ism-file-info">
                <div className="ism-file-icon">
                  {file.type === "application/pdf" ? (
                    <i className="fa-regular fa-file-pdf" />
                  ) : (
                    <i className="fa-regular fa-file-excel" />
                  )}
                </div>
                <div className="ism-file-details">
                  <span className="ism-file-name">{file.name}</span>
                  <span className="ism-file-size">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button className="ism-remove-file" onClick={removeFile}>
                  <i className="fa-solid fa-times" />
                </button>
              </div>
            ) : (
              <div className="ism-drop-placeholder" onClick={() => fileInputRef.current?.click()}>
                <i className="fa-solid fa-cloud-upload-alt" />
                <span>Click to browse or drag file here</span>
                <small>PDF, XLSX, XLS supported</small>
              </div>
            )}
          </div>

          {loading && (
            <div className="ism-progress">
              <i className="fa-solid fa-spinner fa-spin" />
              <span>{progress}</span>
            </div>
          )}
        </div>

        <div className="ism-footer">
          <button className="ism-cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="ism-import-btn"
            onClick={handleProcess}
            disabled={loading || !file}
          >
            {loading ? "Processing..." : "Import"}
          </button>
        </div>

        {toast.show && (
          <div className={`ism-toast ${toast.type}`}>
            <i className={toast.type === "error" ? "fa-solid fa-circle-exclamation" : "fa-solid fa-circle-check"} />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}