import { useState } from "react";
import "./bulk-schedule-upload3.css";

import ScheduleCard from "../../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../../Components/ClassDetailsCard/ClassDetailsCard";
import ClassDetailsPage from "../../../Components/ClassDetailsPage/ClassDetailsPage";

const steps = [
  { number: 1, label: "SETUP" },
  { number: 2, label: "UPLOAD" },
  { number: 3, label: "CALENDAR VIEW" },
  { number: 4, label: "CONFIRM" },
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 60;

const PLACEHOLDER_SCHEDULES = [
  { id: 1, code: "SUBJ 101", name: "Subject Name Here", day: 1, startH: 7,  startM: 0,  endH: 10, endM: 0,  faculty: "Faculty Name", room: "Room A1", colorIdx: 0 },
  { id: 2, code: "SUBJ 102", name: "Subject Name Here", day: 1, startH: 12, startM: 0,  endH: 15, endM: 0,  faculty: "Faculty Name", room: "Room A1", colorIdx: 1 },
  { id: 3, code: "SUBJ 103", name: "Subject Name Here", day: 2, startH: 9,  startM: 0,  endH: 12, endM: 0,  faculty: "Faculty Name", room: "Room A1", colorIdx: 2 },
  { id: 4, code: "SUBJ 104", name: "Subject Name Here", day: 3, startH: 8,  startM: 0,  endH: 11, endM: 0,  faculty: "Faculty Name", room: "Room A1", colorIdx: 3 },
  { id: 5, code: "SUBJ 105", name: "Subject Name Here", day: 4, startH: 7,  startM: 0,  endH: 10, endM: 0,  faculty: "Faculty Name", room: "Room A1", colorIdx: 4 },
  { id: 6, code: "SUBJ 106", name: "Subject Name Here", day: 5, startH: 13, startM: 0,  endH: 16, endM: 0,  faculty: "Faculty Name", room: "Room A1", colorIdx: 5 },
  { id: 7, code: "SUBJ 107", name: "Subject Name Here", day: 6, startH: 8,  startM: 30, endH: 11, endM: 30, faculty: "Faculty Name", room: "Room A1", colorIdx: 0 },
];

export default function BulkScheduleUpload3() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewingItem, setViewingItem]   = useState(null); // for ClassDetailsPage
  const [weekOffset, setWeekOffset]     = useState(0);

  const baseDate  = new Date(2026, 4, 4);
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const weekLabel  = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} \u2013 ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.getDate();
  });

  const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  if (viewingItem) {
    return (
      <>
        <ClassDetailsPage
          item={viewingItem}
          weekStart={weekStart}
          onBack={() => setViewingItem(null)}
          onEdit={() => {/* TODO */}}
        />
      </>
    );
  }

  return (
    <>
      <LocalRegistrarNav activePage="dashboard" />
      <div className="bulk-upload-page">

        <div className="bulk-header">
          <h1>Bulk Schedule Upload</h1>
          <p>Follow the steps to upload and process schedules.</p>
        </div>

      <div className="stepper">
        {steps.map((step, index) => (
          <div className="step-wrapper" key={step.number}>
            <div className="step-item">
              <div className={`step-circle ${step.number < 3 ? "completed" : ""} ${step.number === 3 ? "active" : ""}`}>
                {step.number < 3 ? <i className="fas fa-check" /> : step.number}
              </div>
              <span className={`step-label ${step.number === 3 ? "active" : ""}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${step.number < 3 ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </div>

      <div className="form-card calendar-card">

        <div className="calendar-header">
          <div className="week-nav">
            <i className="fa-solid fa-chevron-left"  onClick={() => setWeekOffset(w => w - 1)} />
            <span>{weekLabel}</span>
            <i className="fa-solid fa-chevron-right" onClick={() => setWeekOffset(w => w + 1)} />
          </div>
          <div className="room-pill">Room A1 <span className="caret">&#9660;</span></div>
        </div>

        <div className="days-header">
          <div className="time-offset" />
          {DAYS.map((d, i) => (
            <div className="day-cell" key={d}>
              <span className="day-name">{d}</span>
              <span className="day-date">{dayDates[i]}</span>
            </div>
          ))}
        </div>

        <hr className="days-divider" />

        <div className="scroll-area">
          <div className="cal-grid" style={{ height: totalGridHeight }}>

            <div className="time-col">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
                const h = START_HOUR + i;
                const label = h < 12   ? `${String(h).padStart(2,"0")} AM`
                            : h === 12 ? "12 PM"
                            : `${String(h - 12).padStart(2,"0")} PM`;
                return (
                  <div className="time-slot" key={h}>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>

            {DAYS.map((_, dayIdx) => {
              const dayItems = PLACEHOLDER_SCHEDULES.filter(s => s.day === dayIdx + 1);
              return (
                <div className="day-col" key={dayIdx} style={{ height: totalGridHeight }}>
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                    <div className="hour-line" key={i} style={{ top: i * HOUR_HEIGHT }} />
                  ))}
                  {dayItems.map(item => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      startHour={START_HOUR}
                      hourHeight={HOUR_HEIGHT}
                      onClick={setSelectedItem}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedItem && (
        <ClassDetailsCard
          item={selectedItem}
          weekStart={weekStart}
          onClose={() => setSelectedItem(null)}
          onViewDetails={(item) => {
            setSelectedItem(null);
            setViewingItem(item);
          }}
        />
      )}

      <div className="bulk-footer step2-footer">
        <button className="btn-back">Back</button>
        <button className="btn-next">Continue</button>
      </div>
    </div>
  </>
  );
}