import { useState, useRef, useEffect } from "react";
import "./bulk-schedule-upload1.css";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import Toast from "../../../Popup/Toast/Toast";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

const semesters = ["1st Semester", "2nd Semester"];
const currentYear = new Date().getFullYear();
const schoolYears = [
  `${currentYear}-${currentYear + 1}`,
  `${currentYear + 1}-${currentYear + 2}`,
  `${currentYear + 2}-${currentYear + 3}`,
];

function CustomDropdown({ placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className={`custom-select-one ${open ? "open" : ""}`} ref={ref}>
      <div
        className="custom-select-one__trigger"
        onClick={() => options.length > 0 && setOpen(!open)}
      >
        <span className={value ? "selected-value" : "placeholder"}>
          {value || placeholder}
        </span>
        <i
          className={`fas fa-chevron-down custom-select-one__icon ${open ? "rotated" : ""}`}
        />
      </div>
      {open && options.length > 0 && (
        <div className="custom-select-one__dropdown">
          {options.map((opt, index) => (
            <div
              key={index}
              className={`custom-select-one__option ${value === opt ? "active" : ""}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BulkScheduleUpload() {
  const navigate = useNavigate();
  const [semester, setSemester] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [rooms, setRooms] = useState([]); // array of { id, roomName }
  const [room, setRoom] = useState("");
  const [checking, setChecking] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snapshot) => {
      const roomList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRooms(roomList.map((r) => ({ id: r.id, roomName: r.roomName })));
    });
    return () => unsub();
  }, []);

  const handleNext = async () => {
    if (!semester || !schoolYear || !room) {
      showToast("error", "Incomplete", "Please fill in all fields.");
      return;
    }

    // Find the room ID
    const selectedRoom = rooms.find((r) => r.roomName === room);
    if (!selectedRoom) {
      showToast("error", "Error", "Selected room not found.");
      return;
    }

    setChecking(true);
    showToast("loading", "Checking", "Checking for existing schedules...");

    try {
      // Query schedules for this room, semester, schoolYear
      const schedulesRef = collection(
        db,
        "rooms",
        selectedRoom.id,
        "schedules",
      );
      const q = query(
        schedulesRef,
        where("semester", "==", semester),
        where("schoolYear", "==", schoolYear),
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        showToast(
          "error",
          "Schedules Already Exist",
          `This room already has schedules for ${semester}, ${schoolYear}. Please choose a different room, semester, or school year.`,
        );
        setChecking(false);
        return;
      }

      // No conflicts – proceed
      showToast(
        "success",
        "Ready",
        "No existing schedules found. Proceeding...",
      );
      setTimeout(() => {
        navigate("/local-registrar/bulk-upload-2", {
          state: { semester, schoolYear, room },
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        "Error",
        "Failed to check for existing schedules. Please try again.",
      );
      setChecking(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bulk-upload-page-one">
      <div className="bulk-header-one">
        <h1>Bulk Schedule Upload</h1>
        <p>Follow the steps to upload and process schedules.</p>
      </div>
      <div className="stepper-one">
        {steps.map((step, index) => (
          <div className="step-wrapper-one" key={step.number}>
            <div className="step-item-one">
              <div
                className={`step-circle-one ${step.number === 1 ? "active" : ""}`}
              >
                {step.number}
              </div>
              <span
                className={`step-label-one ${step.number === 1 ? "active" : ""}`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && <div className="step-line-one" />}
          </div>
        ))}
      </div>
      <div className="form-card-one">
        <div className="form-group-one">
          <label>Room</label>
          <CustomDropdown
            placeholder="Select Room"
            options={rooms.map((r) => r.roomName)}
            value={room}
            onChange={setRoom}
          />
        </div>
        <div className="form-group-one">
          <label>Semester</label>
          <CustomDropdown
            placeholder="Select Semester"
            options={semesters}
            value={semester}
            onChange={setSemester}
          />
        </div>
        <div className="form-group-one">
          <label>School Year</label>
          <CustomDropdown
            placeholder="Select School Year"
            options={schoolYears}
            value={schoolYear}
            onChange={setSchoolYear}
          />
        </div>
      </div>
      <div className="bulk-footer-one" style={{ justifyContent: "flex-end" }}>
        <button
          className="btn-next-one"
          onClick={handleNext}
          disabled={checking}
        >
          {checking ? "Checking..." : "Next"}
        </button>
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
