import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./local-registrar-view-academic-schedule.css";
import LRRoomCard from "../../Components/LRRoomCard/LRRoomCard";

function LocalRegistrarViewAcademicSchedule() {
  const [semester, setSemester] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const navigate = useNavigate();
  return (
    <>
        <div className="lr-academic-schedule">
      <div>
    <h1>Academic Schedule</h1>
    <p>This page allows the local registrar to view classroom schedules by room and filter them by semester, school year, and floor.</p>
  </div>

      <div className="white-box-rooms">
        <div className="filters">
          <div className="dropdown-container">
              <select
                className="dropdown"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{ color: semester === "" ? "#64748B" : "#000000" }}
              >
                <option value="" disabled hidden>Select Semester</option>
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
              </select>
              <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
            </div>

            <div className="dropdown-container">
              <select
                className="dropdown"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                style={{ color: schoolYear === "" ? "#64748B" : "#000000" }}
              >
                <option value="" disabled hidden>Select School Year</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
              <i className="fa-duotone fa-solid fa-angle-down dropdown-icon"></i>
            </div>
        </div>

        <div className="floor-buttons">
          <button className="floor-btn active">All Floors</button>
          <button className="floor-btn">1st Floor</button>
          <button className="floor-btn">3rd Floor</button>
          <button className="floor-btn">4th Floor</button>
        </div>

        <div className="lr-room-cards">
            <LRRoomCard onClick={() => navigate("/local-registrar/room-card")} />
            <LRRoomCard onClick={() => navigate("/local-registrar/room-card")} />
            <LRRoomCard onClick={() => navigate("/local-registrar/room-card")} />
            <LRRoomCard onClick={() => navigate("/local-registrar/room-card")} />
            <LRRoomCard onClick={() => navigate("/local-registrar/room-card")} />
            <LRRoomCard onClick={() => navigate("/local-registrar/room-card")} />
          </div>
      

        <div className="load-more-schedule">
          <button className="load-more-btn-sched">Load More</button>
        </div>
      </div>
    </div>
    </>
  );
}

export default LocalRegistrarViewAcademicSchedule;