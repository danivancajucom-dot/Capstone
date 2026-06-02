import { useState } from "react";
import "./local-registrar-view-academic-schedule.css";
import RoomCard from "../../Components/RoomCard/RoomCard";

function LocalRegistrarViewAcademicSchedule() {
  const [semester, setSemester] = useState("");
  const [schoolYear, setSchoolYear] = useState("");

  return (
    <>
        <div className="container">
      <h1>Academic Schedule</h1>
      <p>This page allows the local registrar to view classroom schedules by room and filter them by semester, school year, and floor.</p>

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

        <div className="room-cards">
          {/* example lang to ah */}
          <RoomCard />
          <RoomCard />
          <RoomCard />
          <RoomCard />
          <RoomCard />
          <RoomCard />
          <RoomCard />
          <RoomCard />
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