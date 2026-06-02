import "./faculty-denied-reservation-card.css";

function FacultyDeniedReservationCard() {
  return (
    <div className="faculty-denied-card">
      <span className="faculty-denied-badge">DENIED</span>

      <div className="faculty-denied-image">
        <div className="faculty-denied-image-overlay">
          <div className="faculty-denied-image-left">
            <span className="faculty-denied-room">Room Name</span>
            <span className="faculty-denied-course">Course Name</span>
          </div>
          <div className="faculty-denied-image-right">
            <span className="faculty-denied-datetime">Date | Time</span>
          </div>
        </div>
      </div>
      <div className="faculty-denial-reason">
  <span className="faculty-denial-reason-title">
    <i className="fa-solid fa-circle-exclamation"></i> Reason for Denial:
  </span>
  <p className="faculty-denial-reason-text">Reason...</p>
</div>
    </div>
    
  );
}

export default FacultyDeniedReservationCard;