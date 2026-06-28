import "./approved-and-denied-card.css";
import { useNavigate } from "react-router-dom";

function ApprovedAndDeniedCard({ reservation }) {
  const navigate = useNavigate();

  return (
    <div
        className="approved-and-denied-card"
        style={{ cursor: "pointer" }}
        onClick={() =>
            navigate(
                reservation.status === "Approved"
                    ? "/department-head/view-reservation-approved"
                    : "/department-head/view-reservation-denied",
                {
                    state: {
                        reservation,
                    },
                }
            )
        }
    >
      <div className="status-card-left">
        <span className="status-room-badge">{reservation.roomName}</span>
        <h3 className="status-name">{reservation.facultyName}</h3>
        <p className="status-time">{reservation.startTime} - {reservation.endTime} • {reservation.date}</p>
        <div className="status-course">
          <i className="fa-solid fa-users"></i>
          <span className="course-title">{reservation.courseTitle}</span>
        </div>
      </div>

      <div className="status-card-right">
        <span className="status-time-ago">{reservation.createdAt?.toDate?.().toLocaleDateString()}</span>
        <div className="status-image"></div>
      </div>
    </div>
  );
}

export default ApprovedAndDeniedCard;