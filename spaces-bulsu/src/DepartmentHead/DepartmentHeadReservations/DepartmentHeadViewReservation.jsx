import "./department-head-view-reservation.css";
import DepartmentHeadNav from "../../Components/DepartmentHeadNav/DepartmentHeadNav";

function DepartmentHeadViewReservation() {
  return (
    <>
      <DepartmentHeadNav activePage="reservations" />
    <div className="container">
      <i className="fa-solid fa-arrow-left back-arrow"></i>

      <div className="white-box-view-reservation">
        <div className="reservation-header">
          <div className="reservation-header-left">
            <div className="reservation-profile">
              <i className="fa-solid fa-user"></i>
            </div>
            <span className="reservation-faculty-name">Juan Dela Cruz</span>
          </div>
          <div className="reservation-header-right">
            <button className="deny-request-btn">Deny</button>
            <button className="approve-request-btn">Approve Request</button>
          </div>
        </div>

        <div className="reservation-info-boxes">
          <div className="reservation-info-box">
            <h3 className="info-box-title">Reservation Metadata</h3>
            <div className="info-box-content">
              <p>Requested On: Date | Time</p>
              <p>Status:</p>
            </div>
          </div>

          <div className="reservation-info-box">
            <h3 className="info-box-title">Reservation Details</h3>
            <div className="info-box-content">
              <div className="info-box-details">
                <p>Room Name:</p>
                <p>Room Capacity:</p>
                <p>Course Title:</p>
                <p>Date:</p>
                <p>Start Time:</p>
                <p>Total Duration:</p>
                <p>End Time:</p>
              </div>
            </div>
          </div>
        </div>

        <div className="reservation-info-boxes">
          <div className="reservation-info-box">
            <h3 className="info-box-title">Reservation Purpose</h3>
            <div className="info-box-content">
                <p>Reservation Purpose</p>
            </div>
          </div>

          <div className="reservation-info-box conflict-check-box">
            <h3 className="info-box-title">Conflict Check</h3>
            <div className="info-box-content">
            </div>
          </div>
        </div>

      </div>
    </div>
    </>

  );
}

export default DepartmentHeadViewReservation;