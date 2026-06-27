import "./faculty-pending-reservation-card.css";

function FacultyPendingReservationCard({ reservation }) {
  return (
    <div className="faculty-pending-card">
      <span className="faculty-pending-badge">PENDING</span>

      <div className="faculty-pending-image">
        <div className="faculty-pending-image-overlay">
          <div className="faculty-pending-image-left">
            <span className="faculty-pending-room">
              {reservation.roomName}
            </span>

            <span className="faculty-pending-course">
              {reservation.courseTitle}
            </span>
          </div>

          <div className="faculty-pending-image-right">
            <span className="faculty-pending-datetime">
              {reservation.date} | {reservation.startTime} - {reservation.endTime}
            </span>
          </div>
        </div>
      </div>

      <button className="faculty-pending-view-btn">
        View Details
      </button>
    </div>
  );
}

export default FacultyPendingReservationCard;