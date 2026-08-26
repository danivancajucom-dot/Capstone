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

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export default function ImportScheduleModal({ show, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });

  // ─── Preview state ──────────────────────────────────────────────
  const [extractedSchedules, setExtractedSchedules] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});

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

    if (!latestSchoolYear) {
      const currentYear = new Date().getFullYear();
      latestSchoolYear = `${currentYear}-${currentYear + 1}`;
      latestSemester = "1st Semester";
    }

    return { semester: latestSemester, schoolYear: latestSchoolYear };
  };

  // ─── Validate a single schedule ────────────────────────────────

  const validateSchedule = (item) => {
    const errors = {};
    if (!item.subject || item.subject.trim() === "") {
      errors.subject = "Subject is required";
    }
    if (!item.day || item.day.trim() === "") {
      errors.day = "Day is required";
    }
    if (!item.startTime || item.startTime.trim() === "") {
      errors.startTime = "Start time is required";
    }
    if (!item.endTime || item.endTime.trim() === "") {
      errors.endTime = "End time is required";
    }
    if (item.startTime && item.endTime && item.startTime >= item.endTime) {
      errors.endTime = "End time must be after start time";
    }
    return errors;
  };

  // ─── Validate all schedules ─────────────────────────────────────

  const validateAllSchedules = () => {
    let hasErrors = false;
    const allErrors = {};
    extractedSchedules.forEach((item, index) => {
      const errors = validateSchedule(item);
      if (Object.keys(errors).length > 0) {
        allErrors[index] = errors;
        hasErrors = true;
      }
    });
    setEditErrors(allErrors);
    return !hasErrors;
  };

  // ─── Start extraction ───────────────────────────────────────────

  const handleExtract = async () => {
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

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!userSnap.exists()) {
        showToast("error", "User Not Found", "Your profile could not be found.");
        setLoading(false);
        return;
      }
      const userData = userSnap.data();

      // ✅ Faculty name from logged-in user: "First Last"
      const facultyName = `${userData.firstName} ${userData.lastName}`.trim();

      const { semester: facultySemester, schoolYear: facultySchoolYear } = await getFacultyLatestTerm(facultyName);
      setProgress(`Latest term: ${facultySemester} ${facultySchoolYear}`);

      let schedules = [];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        schedules = await parseExcelFile(file);
      } else {
        const rawText = await extractRawText(file);
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // ✅ Pass faculty name to API
        const response = await fetch(`${apiUrl}/api/extract-online-schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText,
            semester: facultySemester,
            schoolYear: facultySchoolYear,
            faculty: facultyName, // ✅ sends logged-in faculty name
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "AI extraction failed.");
        }
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "Extraction failed.");
        schedules = data.schedules || [];
      }

      if (schedules.length === 0) {
        showToast("error", "No Schedules Found", "Could not extract any schedules from the file.");
        setLoading(false);
        return;
      }

      // Ensure faculty field is set to the logged-in user's name
      const processedSchedules = schedules.map((s, index) => ({
        ...s,
        faculty: s.faculty || facultyName,
        _id: index,
        _facultyName: facultyName,
        _semester: facultySemester,
        _schoolYear: facultySchoolYear,
      }));

      setExtractedSchedules(processedSchedules);
      setShowPreview(true);
      setLoading(false);
      setProgress(`Extracted ${schedules.length} schedules. Review and confirm.`);

    } catch (error) {
      console.error(error);
      showToast("error", "Extraction Failed", error.message);
      setLoading(false);
    }
  };

  // ─── Edit schedule ──────────────────────────────────────────────

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditForm({ ...extractedSchedules[index] });
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
    setEditErrors({});
  };

  const saveEdit = () => {
    if (!editForm) return;

    const errors = validateSchedule(editForm);
    if (Object.keys(errors).length > 0) {
      setEditErrors({ [editingIndex]: errors });
      showToast("error", "Validation Error", "Please fix the errors before saving.");
      return;
    }

    const updated = [...extractedSchedules];
    updated[editingIndex] = { ...editForm };
    setExtractedSchedules(updated);
    setEditingIndex(null);
    setEditForm(null);
    setEditErrors({});
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (editErrors[editingIndex] && editErrors[editingIndex][field]) {
      const newErrors = { ...editErrors };
      delete newErrors[editingIndex][field];
      if (Object.keys(newErrors[editingIndex]).length === 0) {
        delete newErrors[editingIndex];
      }
      setEditErrors(newErrors);
    }
  };

  // ─── Confirm and save ────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!validateAllSchedules()) {
      showToast("error", "Validation Error", "Please fix all errors before saving.");
      return;
    }

    setLoading(true);
    setProgress("Saving schedules...");

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        showToast("error", "Not Logged In", "Please log in again.");
        setLoading(false);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!userSnap.exists()) {
        showToast("error", "User Not Found", "Your profile could not be found.");
        setLoading(false);
        return;
      }
      const userData = userSnap.data();
      const facultyName = `${userData.firstName} ${userData.lastName}`.trim();

      let added = 0;
      let skipped = 0;
      let onlineAdded = 0;

      for (const item of extractedSchedules) {
        const roomName = item.room?.trim();

        // ── CASE 1: Has a room → save to room's schedules ──
        if (roomName) {
          const roomQuery = query(collection(db, "rooms"), where("roomName", "==", roomName));
          const roomSnap = await getDocs(roomQuery);
          if (roomSnap.empty) {
            console.warn(`Room "${roomName}" not found. Skipping.`);
            continue;
          }
          const roomDoc = roomSnap.docs[0];
          const roomId = roomDoc.id;

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
          const sem = item._semester || "1st Semester";
          const sy = item._schoolYear || "";

          await addDoc(collection(db, "facultySchedules"), {
            userId: firebaseUser.uid,
            facultyName: facultyName,
            subject: item.subject || "",
            section: item.section || "",
            day: item.day || "",
            startTime: item.startTime || "",
            endTime: item.endTime || "",
            semester: sem,
            schoolYear: sy,
            isOnline: true,
            createdAt: serverTimestamp(),
          });
          onlineAdded++;
        }
      }

      setProgress(`Done: ${added} room schedules, ${onlineAdded} online classes, ${skipped} skipped.`);
      showToast(
        "success",
        "Import Complete",
        `${added} room schedules + ${onlineAdded} online classes added. ${skipped} duplicates skipped.`
      );

      setTimeout(() => {
        onSuccess();
        setShowPreview(false);
        setExtractedSchedules([]);
        setFile(null);
        onClose();
      }, 2000);

    } catch (error) {
      console.error(error);
      showToast("error", "Save Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Go back to upload ───────────────────────────────────────────

  const handleBack = () => {
    setShowPreview(false);
    setExtractedSchedules([]);
    setLoading(false);
    setEditingIndex(null);
    setEditForm(null);
    setEditErrors({});
  };

  if (!show) return null;

  // ─── Render: Upload view ─────────────────────────────────────────

  if (!showPreview) {
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
              onClick={handleExtract}
              disabled={loading || !file}
            >
              {loading ? "Extracting..." : "Extract & Preview"}
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

  // ─── Render: Preview view ────────────────────────────────────────

  return (
    <div className="ism-overlay" onClick={onClose}>
      <div className="ism-modal ism-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ism-header">
          <h3>Preview Extracted Schedules</h3>
          <button className="ism-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="ism-body ism-preview-body">
          <p>
            Review the extracted schedules below. Click <strong>Edit</strong> to make changes.
            <br />
            <span className="ism-preview-count">{extractedSchedules.length} schedule(s) extracted</span>
          </p>

          <div className="ism-preview-list">
            {extractedSchedules.map((item, index) => {
              const hasErrors = editErrors[index] && Object.keys(editErrors[index]).length > 0;
              return (
                <div key={item._id || index} className={`ism-preview-item ${hasErrors ? "has-error" : ""}`}>
                  {editingIndex === index ? (
                    // ─── Edit mode ───────────────────────────────────
                    <div className="ism-edit-form">
                      <div className="ism-edit-row">
                        <div className="ism-edit-field">
                          <label>Subject <span className="ism-required">*</span></label>
                          <input
                            value={editForm?.subject || ""}
                            onChange={(e) => handleEditChange("subject", e.target.value)}
                            className={editErrors[index]?.subject ? "ism-error" : ""}
                          />
                          {editErrors[index]?.subject && (
                            <span className="ism-error-text">{editErrors[index].subject}</span>
                          )}
                        </div>
                        <div className="ism-edit-field">
                          <label>Section</label>
                          <input
                            value={editForm?.section || ""}
                            onChange={(e) => handleEditChange("section", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="ism-edit-row">
                        <div className="ism-edit-field">
                          <label>Day <span className="ism-required">*</span></label>
                          <select
                            value={editForm?.day || ""}
                            onChange={(e) => handleEditChange("day", e.target.value)}
                            className={editErrors[index]?.day ? "ism-error" : ""}
                          >
                            <option value="">Select Day</option>
                            {DAYS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          {editErrors[index]?.day && (
                            <span className="ism-error-text">{editErrors[index].day}</span>
                          )}
                        </div>
                        <div className="ism-edit-field">
                          <label>Faculty</label>
                          <input
                            value={editForm?.faculty || ""}
                            onChange={(e) => handleEditChange("faculty", e.target.value)}
                            readOnly
                            style={{ background: "#f3f4f6", cursor: "not-allowed" }}
                          />
                        </div>
                      </div>
                      <div className="ism-edit-row">
                        <div className="ism-edit-field">
                          <label>Start Time <span className="ism-required">*</span></label>
                          <input
                            type="time"
                            value={editForm?.startTime || ""}
                            onChange={(e) => handleEditChange("startTime", e.target.value)}
                            className={editErrors[index]?.startTime ? "ism-error" : ""}
                          />
                          {editErrors[index]?.startTime && (
                            <span className="ism-error-text">{editErrors[index].startTime}</span>
                          )}
                        </div>
                        <div className="ism-edit-field">
                          <label>End Time <span className="ism-required">*</span></label>
                          <input
                            type="time"
                            value={editForm?.endTime || ""}
                            onChange={(e) => handleEditChange("endTime", e.target.value)}
                            className={editErrors[index]?.endTime ? "ism-error" : ""}
                          />
                          {editErrors[index]?.endTime && (
                            <span className="ism-error-text">{editErrors[index].endTime}</span>
                          )}
                        </div>
                      </div>
                      <div className="ism-edit-row">
                        <div className="ism-edit-field">
                          <label>Room (leave empty for online)</label>
                          <input
                            value={editForm?.room || ""}
                            onChange={(e) => handleEditChange("room", e.target.value)}
                            placeholder="Room name or leave empty"
                          />
                        </div>
                      </div>
                      <div className="ism-edit-actions">
                        <button className="ism-edit-cancel" onClick={cancelEdit}>Cancel</button>
                        <button className="ism-edit-save" onClick={saveEdit}>Save Changes</button>
                      </div>
                    </div>
                  ) : (
                    // ─── View mode ───────────────────────────────────
                    <>
                      <div className="ism-preview-info">
                        <div className="ism-preview-subject">
                          <strong>{item.subject || "Untitled"}</strong>
                          {item.section && <span className="ism-preview-section">{item.section}</span>}
                          {hasErrors && (
                            <span className="ism-error-badge">
                              <i className="fa-solid fa-circle-exclamation" /> Has errors
                            </span>
                          )}
                        </div>
                        <div className="ism-preview-details">
                          <span><i className="fa-regular fa-calendar" /> {item.day || "—"}</span>
                          <span><i className="fa-regular fa-clock" /> {item.startTime || "—"} - {item.endTime || "—"}</span>
                          <span><i className="fa-regular fa-user" /> {item.faculty || "TBA"}</span>
                          {item.room ? (
                            <span className="ism-preview-room"><i className="fa-solid fa-door-closed" /> {item.room}</span>
                          ) : (
                            <span className="ism-preview-online"><i className="fa-solid fa-wifi" /> Online</span>
                          )}
                        </div>
                      </div>
                      <button
                        className="ism-preview-edit"
                        onClick={() => startEdit(index)}
                        title="Edit this schedule"
                      >
                        <i className="fa-solid fa-pen" /> Edit
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="ism-progress">
              <i className="fa-solid fa-spinner fa-spin" />
              <span>{progress}</span>
            </div>
          )}
        </div>

        <div className="ism-footer ism-preview-footer">
          <button className="ism-cancel-btn" onClick={handleBack} disabled={loading}>
            <i className="fa-solid fa-arrow-left" /> Back
          </button>
          <button
            className="ism-import-btn"
            onClick={handleConfirm}
            disabled={loading || extractedSchedules.length === 0}
          >
            {loading ? "Saving..." : `Confirm & Save (${extractedSchedules.length})`}
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