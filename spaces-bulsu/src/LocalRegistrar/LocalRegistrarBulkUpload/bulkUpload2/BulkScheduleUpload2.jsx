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

  const workbook = XLSX.read(buffer, {
    type: "array"
  });

  const sheet =
    workbook.Sheets[
      workbook.SheetNames[0]
    ];

  const rows =
    XLSX.utils.sheet_to_json(sheet);

  return rows.map((row, index) => ({
    id: index + 1,
    subject:
      row.Subject ||
      row.subject ||
      "",
    section:
      row.Section ||
      row.section ||
      "",
    faculty:
      row.Faculty ||
      row.faculty ||
      "",
    day:
      row.Day ||
      row.day ||
      "",
    time:
      row.Time ||
      row.time ||
      ""
  }));
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

  const handleProcess = async () => {

  if (!file) {
    alert("Please upload a file.");
    return;
  }

  setLoading(true);

  try {

    // =====================================
    // EXCEL FILE
    // =====================================

    if (
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls")
    ) {

      const schedules =
        await parseExcelFile(file);

      navigate(
        "/local-registrar/bulk-upload-3",
        {
          state: {
            semester,
            schoolYear,
            room,
            schedules
          }
        }
      );

      return;
    }

    // =====================================
    // PDF FILE
    // =====================================

    const rawText =
      await extractRawText(file);

    const response =
      await fetch(
        "http://localhost:5000/api/extract-schedule",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            room,
            semester,
            schoolYear,
            rawText
          })
        }
      );

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(
        data.message ||
        "AI extraction failed"
      );
    }

    navigate(
      "/local-registrar/bulk-upload-3",
      {
        state: {
          semester,
          schoolYear,
          room,
          schedules:
            data.schedules || []
        }
      }
    );

  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "Failed to process schedule."
    );

  } finally {

    setLoading(false);

  }

};

    return (
      <div className="bulk-upload-page">
        <div className="bulk-header">
          <h1>Bulk Schedule Upload</h1>
          <p>
            Upload a PDF or Excel schedule.
          </p>
        </div>
        <div className="form-card">
          <div className="upload-header">
            <p className="upload-title">
              Upload Schedule File
            </p>
            <p className="upload-subtitle">
              PDF or Excel supported
            </p>
          </div>
          <div
            className={`drop-zone ${file ? "has-file" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(
                e.dataTransfer.files[0]
              );
            }}
          >
            <div className="drop-icon">
              <i className="fas fa-file-arrow-up" />
            </div>
            {
              file
                ? <p>{file.name}</p>
                : <p>Select PDF or Excel File</p>
            }
            <label className="browse-btn">
              Browse Files
              <input
                hidden
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={(e) =>
                  handleFile(
                    e.target.files[0]
                  )
                }
              />
            </label>
          </div>

          <div style={{marginTop:"20px"}}>
            <button
              className="btn-next"
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
            <button
              className="btn-back"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
}