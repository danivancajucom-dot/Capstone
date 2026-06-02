import { useState } from "react";
import "./clerk-schedule.css";
import ScheduleCard from "../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../Components/ClassDetailsCard/ClassDetailsCard";

function ClerkSchedule() {
  const [semester, setSemester] = useState("");
  const [schoolYear, setSchoolYear] = useState("");

  return (
    <>
    <div className="container">
          <i className="fa-solid fa-arrow-left back-arrow"></i>
      <div className="clerk-schedule-top">
        <div className="clerk-schedule-dropdowns">
          <div className="room-dropdown-wrapper">
            <select
              className="room-dropdown"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{ color: semester === "" ? "#64748B" : "#000000" }}
            >
              <option value="" disabled hidden>Select Semester</option>
              <option value="1st">1st Semester</option>
              <option value="2nd">2nd Semester</option>
            </select>
            <i className="fa-solid fa-angle-down room-dropdown-icon"></i>
          </div>
          <div className="room-dropdown-wrapper">
            <select
              className="room-dropdown"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              style={{ color: schoolYear === "" ? "#64748B" : "#000000" }}
            >
              <option value="" disabled hidden>Select School Year</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
            <i className="fa-solid fa-angle-down room-dropdown-icon"></i>
          </div>
        </div>
      </div>

      <div className="clerk-schedule-box">
        <div className="box-header">
          <div className="week-navigation">
            <i className="fa-solid fa-chevron-left"></i>
            <span>May 4 - 10, 2026</span>
            <i className="fa-solid fa-chevron-right"></i>
          </div>

          <div className="room-dropdown-wrapper">
            <select className="room-dropdown" defaultValue="A1">
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="A3">A3</option>
              <option value="A4">A4</option>
              <option value="IT13">IT13</option>
              <option value="IT14">IT14</option>
              <option value="IT1">IT1</option>
              <option value="IT2">IT2</option>
              <option value="SDL1">SDL1</option>
              <option value="SDL2">SDL2</option>
              <option value="SDL3">SDL3</option>
              <option value="SDL4">SDL4</option>
              <option value="Smart Prog Lab 1">Smart Prog Lab 1</option>
              <option value="Smart Prog Lab 2">Smart Prog Lab 2</option>
              <option value="Smart Prog Lab 3">Smart Prog Lab 3</option>
              <option value="CT6">CT6</option>
              <option value="CT7">CT7</option>
              <option value="CT8">CT8</option>
              <option value="ACAD1">ACAD1</option>
              <option value="AVR">AVR</option>
              <option value="CISCO LAB1">CISCO LAB1</option>
              <option value="CISCO LAB2">CISCO LAB2</option>
            </select>
            <i className="fa-solid fa-angle-down room-dropdown-icon"></i>
          </div>
        </div>

        <div className="days-container">
          <div className="day">
            <span className="day-name">MON</span>
            <span className="day-date">4</span>
          </div>
          <div className="day">
            <span className="day-name">TUE</span>
            <span className="day-date">5</span>
          </div>
          <div className="day">
            <span className="day-name">WED</span>
            <span className="day-date">6</span>
          </div>
          <div className="day">
            <span className="day-name">THU</span>
            <span className="day-date">7</span>
          </div>
          <div className="day">
            <span className="day-name">FRI</span>
            <span className="day-date">8</span>
          </div>
          <div className="day">
            <span className="day-name">SAT</span>
            <span className="day-date">9</span>
          </div>
          <div className="day">
            <span className="day-name">SUN</span>
            <span className="day-date">10</span>
          </div>
        </div>

        <hr className="days-divider" />

        <div className="schedule-container">
          <div className="time-column">
            <div className="time-slot">07 AM</div>
            <div className="time-slot">08 AM</div>
            <div className="time-slot">09 AM</div>
            <div className="time-slot">10 AM</div>
            <div className="time-slot">11 AM</div>
            <div className="time-slot">12 PM</div>
            <div className="time-slot">01 PM</div>
            <div className="time-slot">02 PM</div>
            <div className="time-slot">03 PM</div>
            <div className="time-slot">04 PM</div>
            <div className="time-slot">05 PM</div>
            <div className="time-slot">06 PM</div>
            <div className="time-slot">07 PM</div>
            <div className="time-slot">08 PM</div>
          </div>
          <ScheduleCard />
        </div>

        <div className="class-details-container">
          <ClassDetailsCard />
        </div>
      </div>
    </div>
    </>

  );
}

export default ClerkSchedule;