import { useState } from "react";
import "./class-details-edit-page.css";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmtTime(h, m) {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}${h < 12 ? "AM" : "PM"}`;
}

/**
 * Props:
 *  item    – { code, faculty, room, section, day, startH, startM, endH, endM }
 *  onBack  – () => void
 *  onSave  – (updatedItem) => void
 */
export default function ClassDetailsEditPage({ item, onBack, onSave }) {
  const baseDate = new Date(2026, 4, 4);
  const cardDate = new Date(baseDate);
  cardDate.setDate(baseDate.getDate() + ((item?.day ?? 1) - 1));
  const dateLabel = `${MONTHS[cardDate.getMonth()]} ${cardDate.getDate()}, ${cardDate.getFullYear()}`;

  const [form, setForm] = useState({
    code:      item?.code      ?? "",
    faculty:   item?.faculty   ?? "",
    section:   item?.section   ?? "BSIT 3F-G2",
    room:      item?.room?.replace("Room ", "") ?? "",
    date:      dateLabel,
    startTime: fmtTime(item?.startH ?? 8, item?.startM ?? 0),
    endTime:   fmtTime(item?.endH   ?? 11, item?.endM  ?? 0),
  });

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => onSave && onSave(form);

  return (
    <div className="bulk-upload-page">

      {/* header */}
      <div className="bulk-header">
        <h1>Bulk Schedule Upload</h1>
        <p>Follow the steps to upload and process schedules.</p>
      </div>

      {/* card */}
      <div className="form-card details-card">
        <h2 className="details-title">Class Details</h2>

        <div className="details-columns">

          {/* left — general info */}
          <div className="details-col">
            <div className="details-section-label">
              <span className="details-section-bar" />
              General Information
            </div>

            <div className="details-field">
              <label>Course Title</label>
              <input
                className="details-input editable"
                value={form.code}
                onChange={handleChange("code")}
              />
            </div>

            <div className="details-field">
              <label>Assigned Faculty</label>
              <input
                className="details-input editable"
                value={form.faculty}
                onChange={handleChange("faculty")}
              />
            </div>

            <div className="details-field">
              <label>Section</label>
              <input
                className="details-input editable"
                value={form.section}
                onChange={handleChange("section")}
              />
            </div>
          </div>

          {/* right — venue & timing */}
          <div className="details-col">
            <div className="details-section-label">
              <span className="details-section-bar" />
              Venue &amp; Timing
            </div>

            <div className="details-field">
              <label>Room</label>
              <input
                className="details-input editable"
                value={form.room}
                onChange={handleChange("room")}
              />
            </div>

            <div className="details-field">
              <label>Date</label>
              <div className="details-input date-input">
                <i className="fa-regular fa-calendar" />
                <input
                  className="date-text-input"
                  value={form.date}
                  onChange={handleChange("date")}
                />
              </div>
            </div>

            <div className="details-row">
              <div className="details-field">
                <label>Start Time</label>
                <input
                  className="details-input editable"
                  value={form.startTime}
                  onChange={handleChange("startTime")}
                />
              </div>
              <div className="details-field">
                <label>End Time</label>
                <input
                  className="details-input editable"
                  value={form.endTime}
                  onChange={handleChange("endTime")}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* footer */}
      <div className="bulk-footer step2-footer">
        <button className="btn-back" onClick={onBack}>Back</button>
        <button className="btn-next" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}