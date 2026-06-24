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

async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  return rows.map((row, index) => ({
    id: index + 1,
    subject: row.Subject || row.subject || "",
    section: row.Section || row.section || "",
    faculty: row.Faculty || row.faculty || "",
    day: row.Day || row.day || "",
    time: row.Time || row.time || "",
  }));
}

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

export default function BulkScheduleUpload2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { semester, schoolYear, room } = location.state || {};
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (selected) => {
    if (selected && (selected.type === "application/pdf" || selected.name.endsWith(".xlsx") || selected.name.endsWith(".xls"))) {
      setFile(selected);
    } else {
      alert("Please upload a PDF or Excel file.");
    }
  };

  const clearFile = () => {
    setFile(null);
  };

  const handleProcess = async () => {
    if (!file) {
      alert("Please upload a file.");
      return;
    }

    setLoading(true);

    try {
      // Excel path
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const schedules = await parseExcelFile(file);
        navigate("/local-registrar/bulk-upload-3", {
          state: { semester, schoolYear, room, schedules },
        });
        return;
      }

      // PDF path
      const rawText = await extractRawText(file);
      const response = await fetch("http://localhost:5000/api/extract-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, semester, schoolYear, rawText }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.message && (data.message.includes("503") || data.message.includes("UNAVAILABLE"))) {
          alert("The AI service is currently busy. Please try again in a few minutes.");
        } else {
          alert(data.message || "AI extraction failed.");
        }
        return;
      }

      navigate("/local-registrar/bulk-upload-3", {
        state: {
          semester,
          schoolYear,
          room,
          schedules: data.schedules || [],
        },
      });
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to process schedule.");
    } finally {
      setLoading(false);
    }
  };

    return (
      <div className="bulk-upload-page-two">
        <div className="bulk-header-two">
          <h1>Bulk Schedule Upload</h1>
          <p>
            Upload a PDF or Excel schedule.
          </p>
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
          <div className="upload-header">
            <div className="upload-title-two">
              Upload Schedule File
            </div>
            <div className="upload-subtitle-two">
              PDF or Excel supported
            </div>
          </div>
          <div
            className={`drop-zone-two ${file ? "has-file" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(
                e.dataTransfer.files[0]
              );
            }}
          >
            <div className="drop-icon-two">
              <i className="fas fa-file-arrow-up" />
            </div>
            {
              file
                ? <div className="drop-filename-two">{file.name}</div>
                : <div className="drop-placeholder-two">Select PDF or Excel File</div>
            }
            <label className="browse-btn-two">
              Browse Files
              <input
                hidden
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </label>
        
        </div>

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
            <button
              className="btn-back-two"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <button
              className="btn-next-two"
              disabled={loading}
              onClick={handleProcess}
            >
              {
                loading
                  ? "Processing..."
                  : file?.name.endsWith(".xlsx") ||
                    file?.name.endsWith(".xls")
                  ? "Import Excel"
                  : "Process with AI"
              }
            </button>
          </div>
        </div>
      </div>
    );
}