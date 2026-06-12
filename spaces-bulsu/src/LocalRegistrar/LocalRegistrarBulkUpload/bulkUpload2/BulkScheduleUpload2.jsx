import { useState } from "react";
import "./bulk-schedule-upload2.css";
import { useNavigate, useLocation } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

// Helper to extract time from string
function timeToMinutes(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);
  if (!match) return null;
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  const meridian = match[3].toUpperCase();
  if (meridian === "PM" && hour !== 12) hour += 12;
  if (meridian === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

// Extract raw text from PDF or Excel
async function extractRawText(file) {
  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    let allText = "";
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      allText += csv + "\n";
    });
    return allText;
  } else {
    throw new Error("Unsupported file type");
  }
}

// Attempt to auto‑parse, but return whatever we can
function autoParseSchedules(rawText) {
  const text = rawText.replace(/\s+/g, " ").trim();
  // Find all time ranges
  const timeRegex = /(\d{1,2}:\d{2}\s?[AP]M)\s*-\s*(\d{1,2}:\d{2}\s?[AP]M)/gi;
  const matches = [];
  let match;
  while ((match = timeRegex.exec(text)) !== null) {
    matches.push({ start: match[1], end: match[2], index: match.index });
  }
  if (matches.length === 0) return [];
  
  const schedules = [];
  let nextId = 1;
  const knownCodes = ["IS 203", "IT 404", "IT 305W", "IT 203", "CC 105", "CC 106"];
  
  for (let m of matches) {
    // Look 150 chars before
    const startIdx = Math.max(0, m.index - 150);
    const context = text.substring(startIdx, m.index + 100);
    let code = "";
    for (let c of knownCodes) {
      if (context.includes(c)) {
        code = c;
        break;
      }
    }
    if (!code) continue;
    const startMin = timeToMinutes(m.start);
    const endMin = timeToMinutes(m.end);
    if (!startMin || !endMin) continue;
    
    schedules.push({
      id: nextId++,
      code: code,
      name: "",
      day: 1,
      startH: Math.floor(startMin / 60),
      startM: startMin % 60,
      endH: Math.floor(endMin / 60),
      endM: endMin % 60,
      faculty: "",
      section: "",
      room: "",
      colorIdx: (nextId - 1) % 10,
    });
  }
  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (let s of schedules) {
    const key = `${s.code}|${s.startH}:${s.startM}|${s.endH}:${s.endM}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }
  return unique;
}

// Editable Table Component inside Step 2
function EditableScheduleTable({ schedules, onUpdate, onNext }) {
  const updateField = (id, field, value) => {
    const updated = schedules.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    onUpdate(updated);
  };

  return (
    <div className="schedule-table-container">
      <h3>Extracted Schedules – Edit if needed</h3>
      <div className="table-responsive">
        <table className="editable-table">
          <thead>
            <tr><th>Code</th><th>Day</th><th>Start</th><th>End</th><th>Section</th><th>Faculty</th><th>Room</th></tr>
          </thead>
          <tbody>
            {schedules.map(s => (
              <tr key={s.id}>
                <td><input value={s.code} onChange={e => updateField(s.id, 'code', e.target.value)} /></td>
                <td>
                  <select value={s.day} onChange={e => updateField(s.id, 'day', parseInt(e.target.value))}>
                    <option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option>
                    <option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option>
                    <option value="7">Sun</option>
                  </select>
                </td>
                <td><input type="time" value={`${s.startH.toString().padStart(2,'0')}:${s.startM.toString().padStart(2,'0')}`} onChange={e => {
                  const [h,m] = e.target.value.split(':');
                  updateField(s.id, 'startH', parseInt(h));
                  updateField(s.id, 'startM', parseInt(m));
                }} /></td>
                <td><input type="time" value={`${s.endH.toString().padStart(2,'0')}:${s.endM.toString().padStart(2,'0')}`} onChange={e => {
                  const [h,m] = e.target.value.split(':');
                  updateField(s.id, 'endH', parseInt(h));
                  updateField(s.id, 'endM', parseInt(m));
                }} /></td>
                <td><input value={s.section} onChange={e => updateField(s.id, 'section', e.target.value)} /></td>
                <td><input value={s.faculty} onChange={e => updateField(s.id, 'faculty', e.target.value)} /></td>
                <td><input value={s.room} onChange={e => updateField(s.id, 'room', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn-next" onClick={onNext}>Continue to Calendar</button>
    </div>
  );
}

export default function BulkScheduleUpload2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { semester, schoolYear, room } = location.state || {};
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState(null);
  const [rawText, setRawText] = useState("");

  const handleFile = (selected) => {
    if (selected && (selected.type === "application/pdf" || selected.name.endsWith(".xlsx") || selected.name.endsWith(".xls"))) {
      setFile(selected);
    } else {
      alert("Please upload a PDF or Excel file.");
    }
  };

  const handleProcess = async () => {
    if (!file) {
      alert("Please upload a file.");
      return;
    }
    setLoading(true);
    try {
      const text = await extractRawText(file);
      setRawText(text);
      const parsed = autoParseSchedules(text);
      if (parsed.length === 0) {
        // If nothing parsed, create one dummy entry
        setSchedules([{
          id: 1, code: "IS 203", name: "", day: 1, startH: 7, startM: 0, endH: 10, endM: 0,
          faculty: "", section: "", room: "", colorIdx: 0
        }]);
      } else {
        setSchedules(parsed);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to read file.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!schedules || schedules.length === 0) {
      alert("No schedules to proceed.");
      return;
    }
    schedules.forEach(s => s.room = room || s.room);
    navigate("/local-registrar/bulk-upload-3", {
      state: { semester, schoolYear, room, schedules },
    });
  };

  if (schedules) {
    return (
      <div className="bulk-upload-page">
        <div className="bulk-header">
          <h1>Bulk Schedule Upload</h1>
          <p>Edit the extracted data before viewing calendar.</p>
        </div>
        <div className="stepper">
          {steps.map((step, index) => (
            <div className="step-wrapper" key={step.number}>
              <div className="step-item">
                <div className={`step-circle ${step.number === 1 ? "completed" : ""} ${step.number === 2 ? "active" : ""}`}>
                  {step.number === 1 ? <i className="fas fa-check" /> : step.number}
                </div>
                <span className={`step-label ${step.number === 2 ? "active" : ""}`}>{step.label}</span>
              </div>
              {index < steps.length - 1 && <div className={`step-line ${step.number === 1 ? "completed" : ""}`} />}
            </div>
          ))}
        </div>
        <div className="form-card">
          <EditableScheduleTable schedules={schedules} onUpdate={setSchedules} onNext={handleNext} />
        </div>
      </div>
    );
  }

  return (
    <div className="bulk-upload-page">
      <div className="bulk-header">
        <h1>Bulk Schedule Upload</h1>
        <p>Upload a PDF or Excel file. You will then edit the extracted data.</p>
      </div>
      <div className="stepper">
        {steps.map((step, index) => (
          <div className="step-wrapper" key={step.number}>
            <div className="step-item">
              <div className={`step-circle ${step.number === 1 ? "completed" : ""} ${step.number === 2 ? "active" : ""}`}>
                {step.number === 1 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label ${step.number === 2 ? "active" : ""}`}>{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className={`step-line ${step.number === 1 ? "completed" : ""}`} />}
          </div>
        ))}
      </div>
      <div className="form-card">
        <div className="upload-header">
          <p className="upload-title">Upload Schedule File</p>
          <p className="upload-subtitle">Drag and drop your PDF or Excel file.</p>
        </div>
        <div
          className={`drop-zone ${file ? "has-file" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        >
          <div className="drop-icon"><i className="fas fa-file-arrow-up" /></div>
          {file ? <p className="file-name">{file.name}</p> : <p>Click or drag file here</p>}
          <label className="browse-btn">
            Browse Files
            <input type="file" accept=".pdf,.xlsx,.xls" hidden onChange={(e) => handleFile(e.target.files[0])} />
          </label>
        </div>
        <button className="btn-next" onClick={handleProcess} disabled={loading} style={{ marginTop: "20px" }}>
          {loading ? "Processing..." : "Extract & Edit"}
        </button>
        <button className="btn-back" onClick={() => navigate(-1)} style={{ marginLeft: "10px" }}>Back</button>
      </div>
    </div>
  );
}