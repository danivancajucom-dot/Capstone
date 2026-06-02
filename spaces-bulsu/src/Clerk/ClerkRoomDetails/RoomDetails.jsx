import "./RoomDetails.css";

export default function RoomDetails({ onBack }) {
  return (
    <>
      <div className="page">
      <div className="details-card">
        <h2>Room Details</h2>

        <div className="details-grid">
          <div className="details-section">
            <div className="section-title">
              <span className="section-bar"></span>
              <span>General Information</span>
            </div>

            <div className="field-group">
              <label>Course Title</label>
              <div className="field-box">Game Development</div>
            </div>

            <div className="field-group">
              <label>Assigned Faculty</label>
              <div className="field-box">Juan Dela Cruz</div>
            </div>

            <div className="field-group">
              <label>Section</label>
              <div className="field-box">BSIT 3F-G2</div>
            </div>
          </div>

          <div className="details-section">
            <div className="section-title">
              <span className="section-bar"></span>
              <span>Venue & Timing</span>
            </div>

            <div className="field-group">
              <label>Room</label>
              <div className="field-box">A2</div>
            </div>

            <div className="field-group">
              <label>Date</label>
              <div className="field-box date-box">
                <i className="fa-regular fa-calendar"></i>
                <span>October 26, 2026</span>
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label>Scheduled Time</label>
                <div className="field-box">10:00 AM - 1:00 PM</div>
              </div>
              <div className="field-group">
                <label>Time Released</label>
                <div className="field-box">12:05 PM</div>
              </div>
            </div>
          </div>
        </div>

        <div className="field-group reason-group">
          <label>Reason for Release</label>
          <div className="field-box reason-box">Activity completed earlier than expected</div>
        </div>
      </div>

      <div className="details-footer">
        <button className="btn-back" onClick={onBack}>Back</button>
      </div>
    </div>
    </>
  );
}