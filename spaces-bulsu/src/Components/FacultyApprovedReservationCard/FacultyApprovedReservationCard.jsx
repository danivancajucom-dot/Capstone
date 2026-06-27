import "./faculty-approved-reservation-card.css";

function FacultyApprovedReservationCard({ reservation }) {
    return (
    <div className="faculty-approved-card">
      <span className="faculty-approved-badge">APPROVED</span>

      <div className="faculty-approved-image">
        <div className="faculty-approved-image-overlay">
          <div className="faculty-approved-image-left">
            <span className="faculty-approved-room">{reservation.roomName}</span>
            <span className="faculty-approved-course">{reservation.courseTitle}</span>
          </div>
          <div className="faculty-approved-image-right">
            <span className="faculty-approved-datetime">{reservation.date} | {reservation.startTime} - {reservation.endTime}</span>
          </div>
        </div>
      </div>

      <button className="faculty-approved-view-btn">View Details</button>
    </div>
  );
}

export default FacultyApprovedReservationCard;