import "./faculty-approved-reservation-card.css";

function FacultyApprovedReservationCard() {
  return (
    <div className="faculty-approved-card">
      <span className="faculty-approved-badge">APPROVED</span>

      <div className="faculty-approved-image">
        <div className="faculty-approved-image-overlay">
          <div className="faculty-approved-image-left">
            <span className="faculty-approved-room">Room Name</span>
            <span className="faculty-approved-course">Course Name</span>
          </div>
          <div className="faculty-approved-image-right">
            <span className="faculty-approved-datetime">Date | Time</span>
          </div>
        </div>
      </div>

      <button className="faculty-approved-view-btn">View Details</button>
    </div>
  );
}

export default FacultyApprovedReservationCard;