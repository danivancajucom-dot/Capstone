import { useState, useRef, useEffect } from "react";
import "./bulk-schedule-upload1.css";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

const semesters = [];
const schoolYears = [];

function CustomDropdown({ placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className={`custom-select ${open ? "open" : ""}`} ref={ref}>
      <div className="custom-select__trigger" onClick={() => options.length > 0 && setOpen(!open)}>
        <span className={value ? "selected-value" : "placeholder"}>
          {value || placeholder}
        </span>
        <i className={`fas fa-chevron-down custom-select__icon ${open ? "rotated" : ""}`} />
      </div>
      {open && options.length > 0 && (
        <div className="custom-select__dropdown">
          {options.map((opt) => (
            <div
              key={opt}
              className={`custom-select__option ${value === opt ? "active" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

export default function BulkScheduleUpload() {
  const [semester, setSemester] = useState("");
  const [schoolYear, setSchoolYear] = useState("");

  const handleNext = () => {
    if (!semester || !schoolYear) {
      alert("Please select both Semester and School Year.");
      return;
    }
    alert(`Proceeding with: ${semester}, ${schoolYear}`);
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
              <div className={`step-circle ${step.number === 1 ? "active" : ""}`}>
                {step.number}
              </div>
              <span className={`step-label ${step.number === 1 ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      <div className="form-card">
        <div className="form-group">
          <label>Semester</label>
          <CustomDropdown
            placeholder="Select Semester"
            options={semesters}
            value={semester}
            onChange={setSemester}
          />
        </div>
        <div className="form-group">
          <label>School Year</label>
          <CustomDropdown
            placeholder="Select School Year"
            options={schoolYears}
            value={schoolYear}
            onChange={setSchoolYear}
          />
        </div>
      </div>

      <div className="bulk-footer" style={{ justifyContent: "flex-end" }}>
        <button className="btn-next" onClick={handleNext}>Next</button>
      </div>
    </div>
    </>
  );
}