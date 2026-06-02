import { useState } from "react";
import "./class-details-page.css";
import ClassDetailsEditPage from "../ClassDetailsEditPage/ClassDetailsEditPage";

function fmtTime(h, m) {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}${h < 12 ? "AM" : "PM"}`;
}

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/**
 * Props:
 *  item       – { code, faculty, room, section, day, startH, startM, endH, endM }
 *  weekStart  – Date object (Monday of current week) for computing the actual date
 *  onBack     – () => void
 *  onEdit     – () => void
 */
export default function ClassDetailsPage({ item, weekStart, onBack, onEdit }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ClassDetailsEditPage
        item={item}
        onBack={() => setEditing(false)}
        onSave={() => setEditing(false)}
      />
    );
  }
  let dateLabel = "Date TBD";
  if (weekStart && item?.day) {
    const cardDate = new Date(weekStart);
    cardDate.setDate(weekStart.getDate() + (item.day - 1));
    dateLabel = `${MONTHS[cardDate.getMonth()]} ${cardDate.getDate()}, ${cardDate.getFullYear()}`;
  }

  return (
    <div className="bulk-upload-page">

      <div className="bulk-header">
        <h1>Bulk Schedule Upload</h1>
        <p>Follow the steps to upload and process schedules.</p>
      </div>

      <div className="form-card details-card">
        <h2 className="details-title">Class Details</h2>

        <div className="details-columns">

          {/* left */}
          <div className="details-col">
            <div className="details-section-label">
              <span className="details-section-bar" />
              General Information
            </div>

            <div className="details-field">
              <label>Course Title</label>
              <div className="details-input">{item?.code || "—"}</div>
            </div>

            <div className="details-field">
              <label>Assigned Faculty</label>
              <div className="details-input">{item?.faculty || "—"}</div>
            </div>

            <div className="details-field">
              <label>Section</label>
              <div className="details-input">{item?.section || "—"}</div>
            </div>
          </div>

          {/* right */}
          <div className="details-col">
            <div className="details-section-label">
              <span className="details-section-bar" />
              Venue &amp; Timing
            </div>

            <div className="details-field">
              <label>Room</label>
              <div className="details-input">{item?.room || "—"}</div>
            </div>

            <div className="details-field">
              <label>Date</label>
              <div className="details-input date-input">
                <i className="fa-regular fa-calendar" />
                {dateLabel}
              </div>
            </div>

            <div className="details-row">
              <div className="details-field">
                <label>Start Time</label>
                <div className="details-input">{fmtTime(item?.startH ?? 0, item?.startM ?? 0)}</div>
              </div>
              <div className="details-field">
                <label>End Time</label>
                <div className="details-input">{fmtTime(item?.endH ?? 0, item?.endM ?? 0)}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="bulk-footer step2-footer">
        <button className="btn-back" onClick={onBack}>Back</button>
        <button className="btn-next" onClick={() => setEditing(true)}>Edit</button>
      </div>
    </div>
  );
}