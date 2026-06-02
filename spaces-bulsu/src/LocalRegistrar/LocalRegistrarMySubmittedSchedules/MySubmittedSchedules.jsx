import { useState } from "react";
import "./my-submitted-schedules.css";

const schedules = [
  { id: 1, schoolYear: "2026 - 2027", date: "2026-03-05", semester: "1st Semester" },
  { id: 2, schoolYear: "2026 - 2027", date: "2026-03-05", semester: "2nd Semester" },
];

export default function MySubmittedSchedules() {
  const [page, setPage] = useState("submitted");
  const [archived, setArchived] = useState([]);
  const [active, setActive] = useState(schedules);

  function handleArchive(item) {
    setActive(active.filter(s => s.id !== item.id));
    setArchived([...archived, item]);
  }

  function handleRestore(item) {
    setArchived(archived.filter(s => s.id !== item.id));
    setActive([...active, item]);
  }

  if (page === "archived") {
    return (
    <>
          <div className="page">
        <h1>Archived Schedules</h1>
        <div className="list-card">
          {archived.map(s => (
            <div className="schedule-item" key={s.id}>
              <div className="schedule-info">
                <span className="schedule-title">S.Y. {s.schoolYear}</span>
                <span className="schedule-meta"><strong>Date:</strong> {s.date}</span>
                <span className="schedule-meta"><strong>Semester:</strong> {s.semester}</span>
              </div>
              <button className="btn-action" onClick={() => handleRestore(s)}>Restore Schedule</button>
            </div>
          ))}
        </div>
      </div>
    </>
    );
  }

  return (
    <>
        <div className="page">
      <div className="page-header">
        <h1>My Submitted Schedules</h1>
        <span className="view-archived" onClick={() => setPage("archived")}>View Archived Schedules</span>
      </div>
      <div className="list-card">
        {active.map(s => (
          <div className="schedule-item" key={s.id}>
            <div className="schedule-info">
              <span className="schedule-title">S.Y. {s.schoolYear}</span>
              <span className="schedule-meta"><strong>Date:</strong> {s.date}</span>
              <span className="schedule-meta"><strong>Semester:</strong> {s.semester}</span>
            </div>
            <button className="btn-action" onClick={() => handleArchive(s)}>Archive Schedule</button>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}