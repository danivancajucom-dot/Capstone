import "./department-head-reservations.css";
import ReservationCard from "../../Components/ReservationCard/ReservationCard";
import ApprovedAndDeniedCard from "../../Components/ApprovedAndDeniedCard/ApprovedAndDeniedCard";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";
import DepartmentHeadNav from "../../Components/DepartmentHeadNav/DepartmentHeadNav";

function DepartmentHeadReservations() {
  return (
    <div className="container">
      <DenialPopup />
      <h1>Reservation Requests</h1>

      <DepartmentHeadNav activePage="reservations" />
      <div className="white-box-reservations">
  <div className="reservations-nav">
    <div className="reservations-nav-item active">Pending</div>
    <div className="reservations-nav-item">Approved</div>
    <div className="reservations-nav-item">Denied</div>
  </div>
  <hr className="reservations-nav-divider" />

<ReservationCard />
<ApprovedAndDeniedCard />
  <div className="load-more-reservations">
    <button className="load-more-btn-reservations">Load More</button>
  </div>
</div>
    </div>
  );
}

export default DepartmentHeadReservations;