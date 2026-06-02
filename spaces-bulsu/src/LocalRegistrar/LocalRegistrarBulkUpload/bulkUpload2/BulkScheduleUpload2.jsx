import { useState } from "react";
import "./bulk-schedule-upload2.css";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

export default function BulkScheduleUpload2() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (selected) => {
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
    } else {
      alert("PDF files only.");
    }
  };

  return (
    <>
        <div className="bulk-upload-page">
      <div className="bulk-header">
        <h1>Bulk Schedule Upload</h1>
        <p>Follow the steps to upload and process schedules.</p>
      </div>

      <div className="stepper">
        {steps.map((step, index) => (
          <div className="step-wrapper" key={step.number}>
            <div className="step-item">
              <div className={`step-circle ${step.number === 1 ? "completed" : ""} ${step.number === 2 ? "active" : ""}`}>
                {step.number === 1 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label ${step.number === 2 ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${step.number === 1 ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </div>

      <div className="form-card">
        <div className="upload-header">
          <p className="upload-title">Upload Schedule File</p>
          <p className="upload-subtitle">Drag and drop your PDF file or click to browse.</p>
        </div>

        <div
          className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        >
          <div className="drop-icon">
            <i className="fas fa-file-arrow-up" />
          </div>

          {file ? (
            <p className="file-name">{file.name}</p>
          ) : (
            <>
              <p className="drop-text">Drag and drop your schedule file here</p>
              <p className="drop-subtext">
                Supports Portable Document Format (.pdf) files.<br />
                Maximum file size is 10MB.
              </p>
            </>
          )}

          <label className="browse-btn">
            <i className="fas fa-plus" />
            Browse Files
            <input type="file" accept=".pdf" hidden onChange={(e) => handleFile(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="bulk-footer step2-footer">
        <button className="btn-back">Back</button>
        <button className="btn-next">Continue</button>
      </div>
    </div>
    </>
  );
}