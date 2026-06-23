import "./department-head-reservations.css";
import ReservationCard from "../../Components/ReservationCard/ReservationCard";
import ApprovedAndDeniedCard from "../../Components/ApprovedAndDeniedCard/ApprovedAndDeniedCard";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";

function DepartmentHeadReservations() {
  return (
    <div className="dept-reservations">
      <h1>Reservation Requests</h1>

      <div className="dept-white-box-reservations">
  <div className="dept-reservations-nav">
    <div className="dept-reservations-nav-item active">Pending</div>
    <div className="dept-reservations-nav-item">Approved</div>
    <div className="dept-reservations-nav-item">Denied</div>
  </div>
  <hr className="dept-reservations-nav-divider" />

<ReservationCard />
  <div className="dept-load-more-reservations">
    <button className="dept-load-more-btn-reservations">Load More</button>
  </div>
</div>
    </div>
  );
}

export default DepartmentHeadReservations;