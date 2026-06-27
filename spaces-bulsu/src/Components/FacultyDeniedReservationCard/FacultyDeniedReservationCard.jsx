import "./faculty-denied-reservation-card.css";

function FacultyDeniedReservationCard({ reservation }) {
  
  return (
    <div className="faculty-denied-card">
      <span className="faculty-denied-badge">DENIED</span>

      <div className="faculty-denied-image">
        <div className="faculty-denied-image-overlay">
          <div className="faculty-denied-image-left">
            <span className="faculty-denied-room">{reservation.roomName}</span>
            <span className="faculty-denied-course">{reservation.courseTitle}</span>
          </div>
          <div className="faculty-denied-image-right">
            <span className="faculty-denied-datetime">{reservation.date} | {reservation.startTime} - {reservation.endTime}</span>
          </div>
        </div>
      </div>
      <div className="faculty-denial-reason">
  <span className="faculty-denial-reason-title">
    <i className="fa-solid fa-circle-exclamation"></i> Reason for Denial:
  </span>
  <p className="faculty-denial-reason-text">
  {reservation.denialReason || "No reason provided."}
</p>
</div>
    </div>
    
  );
}

export default FacultyDeniedReservationCard;