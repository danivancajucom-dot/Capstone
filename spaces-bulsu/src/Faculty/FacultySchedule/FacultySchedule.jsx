import { useState } from "react";
import "./faculty-schedule.css";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 60;

const CARD_COLORS = [
  { bg: "#EEF2FF", border: "#4F6EF7", text: "#3651D4", timeBg: "#C7D0FA" }, // blue - Academic
  { bg: "#ECFDF5", border: "#34C77B", text: "#1A9E5C", timeBg: "#A7F0CC" }, // green - Institutional
  { bg: "#FFF7ED", border: "#F97316", text: "#C2621A", timeBg: "#FDD9B5" }, // orange - Reservation
];

const LEGEND = [
  { label: "Academic",      color: "#4F6EF7" },
  { label: "Institutional", color: "#34C77B" },
  { label: "Reservation",   color: "#F97316" },
];

const PLACEHOLDER_EVENTS = [
  {
    id: 1, title: "Intro to Programming", location: "Prog Lab 2 | 3rd Floor",
    day: 1, daySpan: 7, startH: 7, startM: 0, endH: 10, endM: 0, colorIdx: 0,
  },
  {
    id: 2, title: "Faculty Senate Meeting", location: "AVR | 4th Floor",
    day: 1, daySpan: 7, startH: 10, startM: 0, endH: 12, endM: 0, colorIdx: 1,
  },
  {
    id: 3, title: "Gender and Society", location: "CT8 | 4th Floor",
    day: 1, daySpan: 4, startH: 12, startM: 0, endH: 15, endM: 0, colorIdx: 0,
  },
  {
    id: 4, title: "Volleyball CICT Week", location: "CT8 | 4th Floor",
    day: 5, daySpan: 3, startH: 13, startM: 0, endH: 15, endM: 0, colorIdx: 2,
  },
];

function fmtHour(h) {
  if (h < 12) return `${String(h).padStart(2,"0")} AM`;
  if (h === 12) return `12 PM`;
  return `${String(h-12).padStart(2,"0")} PM`;
}

function fmtTime(h, m) {
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

export default function WeeklyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);

  const baseMonday = new Date(2026, 9, 19); 
  const weekStart  = new Date(baseMonday);
  weekStart.setDate(baseMonday.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const weekLabel = `${months[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.getDate();
  });

  const todayIdx = 4;

  const totalH = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <>
    <div className="wc-page">

      <div className="wc-legend">
        {LEGEND.map(l => (
          <div className="wc-legend-item" key={l.label}>
            <span className="wc-legend-dot" style={{ background: l.color }} />
            <span className="wc-legend-label">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="wc-card">

        <div className="wc-week-nav">
          <i className="fa-solid fa-chevron-left" onClick={() => setWeekOffset(w => w - 1)} />
          <span className="wc-week-label">{weekLabel}</span>
          <i className="fa-solid fa-chevron-right" onClick={() => setWeekOffset(w => w + 1)} />
        </div>

        <div className="wc-days-header">
          <div className="wc-time-offset" />
          {DAYS.map((d, i) => (
            <div className="wc-day-cell" key={d}>
              <span className="wc-day-name">{d}</span>
              <span className={`wc-day-date ${i === todayIdx ? "today" : ""}`}>
                {dayDates[i]}
              </span>
            </div>
          ))}
        </div>

        <div className="wc-divider" />

        <div className="wc-scroll-area">
          <div className="wc-grid" style={{ height: totalH }}>

            <div className="wc-time-col">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div className="wc-time-slot" key={i}>
                  <span>{fmtHour(START_HOUR + i)}</span>
                </div>
              ))}
            </div>

            <div className="wc-events-layer">

              {DAYS.map((_, i) => (
                <div className="wc-day-col" key={i}>
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, j) => (
                    <div className="wc-hour-line" key={j} style={{ top: j * HOUR_HEIGHT }} />
                  ))}
                </div>
              ))}

              {PLACEHOLDER_EVENTS.map(ev => {
                const color   = CARD_COLORS[ev.colorIdx];
                const topPx   = ((ev.startH - START_HOUR) + ev.startM / 60) * HOUR_HEIGHT;
                const heightPx = ((ev.endH - ev.startH) + (ev.endM - ev.startM) / 60) * HOUR_HEIGHT - 4;
                const leftPct  = ((ev.day - 1) / 7) * 100;
                const widthPct = (ev.daySpan / 7) * 100;

                return (
                  <div
                    key={ev.id}
                    className="wc-event"
                    style={{
                      top:             topPx,
                      height:          heightPx,
                      left:            `${leftPct}%`,
                      width:           `calc(${widthPct}% - 4px)`,
                      backgroundColor: color.bg,
                      borderLeft:      `4px solid ${color.border}`,
                    }}
                  >
                    <div className="wc-event-top">
                      <span className="wc-event-title" style={{ color: color.text }}>{ev.title}</span>
                      <span className="wc-event-time" style={{ background: color.timeBg, color: color.text }}>
                        {fmtTime(ev.startH, ev.startM)}-{fmtTime(ev.endH, ev.endM)}
                      </span>
                    </div>
                    <span className="wc-event-loc" style={{ color: color.text }}>{ev.location}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>

  );
}