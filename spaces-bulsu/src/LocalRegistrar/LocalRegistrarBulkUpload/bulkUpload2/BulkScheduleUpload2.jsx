import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";
import "./bulk-schedule-upload2.css";
import Toast from "../../../Popup/Toast/Toast";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

// ---------- helper functions (unchanged) ----------
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

function RoomCard({ roomName, file, onRemove, onFileChange }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
    if (dropped) onFileChange(roomName, dropped);
  };

  return (
    <div className="room-card">
      <div className="room-card-header">
        <span className="room-name">{roomName}</span>
        <button
          type="button"
          className="remove-room-btn"
          onClick={() => onRemove(roomName)}
          aria-label={`Remove ${roomName}`}
        >
          <i className="fas fa-times" />
        </button>
      </div>

      <div
        className={`room-dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.xlsx,.xls"
          onChange={(e) => {
            const selected = e.target.files[0];
            if (selected) onFileChange(roomName, selected);
          }}
          id={`file-${roomName}`}
        />
        <label htmlFor={`file-${roomName}`} className="dropzone-label">
          {file ? (
            <>
              <i className="fas fa-file-circle-check" />
              <span className="file-name">{file.name}</span>
              <span className="dropzone-hint">Click or drop to replace</span>
            </>
          ) : (
            <>
              <i className="fas fa-cloud-upload-alt" />
              <span>Click to browse or drag file here</span>
              <span className="dropzone-hint">PDF, XLSX, XLS</span>
            </>
          )}
        </label>
      </div>
    </div>
  );
}

function AddRoomBox({ availableRooms, onAdd }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = availableRooms.filter((r) =>
    r.roomName.toLowerCase().includes(search.toLowerCase())
  );

  const closeSelecting = () => {
    setIsSelecting(false);
    setSearch("");
  };

  const handlePick = (roomName) => {
    onAdd(roomName);
    closeSelecting();
  };

  if (isSelecting) {
    return (
      <div className="add-room-box selecting">
        <div className="add-room-box-head">
          <span className="add-room-box-label">Select a room to add</span>
          <button
            type="button"
            className="add-room-close-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={closeSelecting}
            aria-label="Cancel"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="add-room-search-wrap">
          <i className="fas fa-magnifying-glass" />
          <input
            type="text"
            autoFocus
            className="add-room-search"
            placeholder="Search room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                closeSelecting();
              } else if (e.key === "Enter" && filtered.length > 0) {
                handlePick(filtered[0].roomName);
              }
            }}
          />
        </div>

        <div className="add-room-list">
          {filtered.length === 0 ? (
            <span className="add-room-empty">No matching rooms</span>
          ) : (
            filtered.map((r) => (
              // onMouseDown (not onClick) so the option is picked before the
              // input's blur can close this box.
              <div
                key={r.id}
                className="add-room-option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(r.roomName);
                }}
              >
                <i className="fas fa-door-closed" />
                {r.roomName}
              </div>
            ))
          )}
        </div>

        <span className="add-room-footnote">Press Esc to cancel, Enter to pick the top result</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="add-room-box"
      onClick={() => setIsSelecting(true)}
      disabled={availableRooms.length === 0}
    >
      <i className="fas fa-plus" />
      <span className="add-room-label">
        {availableRooms.length === 0 ? "All rooms added" : "Add Room"}
      </span>
      <span className="add-room-hint">
        {availableRooms.length === 0
          ? "Nothing left to add"
          : "Select a room to upload its schedule"}
      </span>
    </button>
  );
}

export default function BulkScheduleUpload2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { semester, schoolYear } = location.state || {};

  const [rooms, setRooms] = useState([]);          // all rooms from Firestore
  const [selectedRooms, setSelectedRooms] = useState([]); // { roomName, file }
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
    }
  };

  // Load rooms from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snapshot) => {
      const roomList = snapshot.docs.map((doc) => ({
        id: doc.id,
        roomName: doc.data().roomName,
      }));
      setRooms(roomList);
    });
    return () => unsub();
  }, []);

  const availableRooms = rooms.filter(
    (r) => !selectedRooms.some((sr) => sr.roomName === r.roomName)
  );

  const handleAddRoom = (roomName) => {
    if (selectedRooms.some((r) => r.roomName === roomName)) {
      showToast("error", "Duplicate", "Room already added.");
      return;
    }
    setSelectedRooms([...selectedRooms, { roomName, file: null }]);
  };

  const handleRemoveRoom = (roomName) => {
    setSelectedRooms(selectedRooms.filter((r) => r.roomName !== roomName));
  };

  const handleFileChange = (roomName, file) => {
    setSelectedRooms((prev) =>
      prev.map((r) => (r.roomName === roomName ? { ...r, file } : r))
    );
  };

  const handleProcessAll = async () => {
    const hasFile = selectedRooms.some((r) => r.file !== null);
    if (!hasFile) {
      showToast("error", "Incomplete", "Please attach at least one schedule file.");
      return;
    }

    setLoading(true);
    showToast("loading", "Processing", "Parsing schedule files...");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const roomData = [];

      for (const roomEntry of selectedRooms) {
        const { roomName, file } = roomEntry;
        if (!file) continue;

        let schedules = [];

        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          schedules = await parseExcelFile(file);
        } else {
          // PDF → AI extraction
          const rawText = await extractRawText(file);
          const response = await fetch(`${apiUrl}/api/extract-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: roomName, semester, schoolYear, rawText }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI extraction failed: ${errorText}`);
          }
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.message || "AI extraction failed.");
          }
          schedules = data.schedules || [];
        }

        roomData.push({ room: roomName, schedules });
      }

      navigate("/local-registrar/bulk-upload-3", {
        state: { semester, schoolYear, roomData },
      });
    } catch (error) {
      console.error(error);
      showToast("error", "Processing Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-upload-page-two">
      <div className="bulk-header-two">
        <h1>Bulk Schedule Upload</h1>
        <p>Add rooms and upload schedule files.</p>
      </div>

      <div className="stepper-two">
        {steps.map((step, index) => (
          <div className="step-wrapper-two" key={step.number}>
            <div className="step-item-two">
              <div className={`step-circle-two ${step.number < 2 ? "completed" : ""} ${step.number === 2 ? "active" : ""}`}>
                {step.number < 2 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label-two ${step.number === 2 ? "active" : ""}`}>{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className={`step-line-two ${step.number === 1 ? "completed" : ""}`} />}
          </div>
        ))}
      </div>

      <div className="form-card-two">
        <div className="rooms-title-row">
          <div>
            <div className="upload-title-two">Rooms</div>
            <p className="upload-subtitle-two">
              Add each room, then click its box to upload the class schedule — PDF or Excel.
            </p>
          </div>
          {selectedRooms.length > 0 && (
            <span className="rooms-count-hint">
              {selectedRooms.filter((r) => r.file).length} of {selectedRooms.length} room
              {selectedRooms.length > 1 ? "s" : ""} have a file
            </span>
          )}
        </div>

        {selectedRooms.length === 0 && (
          <p className="room-grid-empty-hint">
            <i className="fas fa-circle-info" /> No rooms added yet. Click the box below to add your first room.
          </p>
        )}

        {/* Room cards grid: each selected room + its own dropzone, plus the Add Room trace box */}
        <div className="room-grid">
          {selectedRooms.map(({ roomName, file }) => (
            <RoomCard
              key={roomName}
              roomName={roomName}
              file={file}
              onRemove={handleRemoveRoom}
              onFileChange={handleFileChange}
            />
          ))}

          <AddRoomBox availableRooms={availableRooms} onAdd={handleAddRoom} />
        </div>

        {selectedRooms.length > 0 && (
          <p className="footer-hint-two">
            You can still add more rooms or swap files before continuing.
          </p>
        )}

        <div className="bulk-footer-two">
          <button className="btn-back-two" onClick={() => navigate(-1)}>Back</button>
          <button
            className="btn-next-two"
            onClick={handleProcessAll}
            disabled={loading || selectedRooms.length === 0}
          >
            {loading ? "Processing..." : "Next"}
          </button>
        </div>
      </div>

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}