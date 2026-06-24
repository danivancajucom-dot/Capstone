import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./department-head-reservations.css";
import ReservationCard from "../../Components/ReservationCard/ReservationCard";
import ApprovedAndDeniedCard from "../../Components/ApprovedAndDeniedCard/ApprovedAndDeniedCard";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";

function DepartmentHeadReservations() {
  const [activeTab, setActiveTab] = useState("Pending");
  const navigate = useNavigate();

  return (
    <div className="dept-reservations">
      <h1>Reservation Requests</h1>

      <div className="dept-white-box-reservations">
        <div className="dept-reservations-nav">
          {["Pending", "Approved", "Denied"].map((tab) => (
            <div
              key={tab}
              className={`dept-reservations-nav-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>
        <hr className="dept-reservations-nav-divider" />

        {activeTab === "Pending" && (
          <>
            <ReservationCard />
            <div className="dept-load-more-reservations">
              <button className="dept-load-more-btn-reservations">Load More</button>
            </div>
          </>
        )}

        {activeTab === "Approved" && (
          <>
            <ApprovedAndDeniedCard
              onClick={() => navigate("/department-head/view-reservation-approved")}
            />
            <div className="dept-load-more-reservations">
              <button className="dept-load-more-btn-reservations">Load More</button>
            </div>
          </>
        )}

        {activeTab === "Denied" && (
  <>
    <ApprovedAndDeniedCard
      onClick={() => navigate("/department-head/view-reservation-denied")}
    />
    <div className="dept-load-more-reservations">
      <button className="dept-load-more-btn-reservations">Load More</button>
    </div>
  </>
)}
      </div>
    </div>
  );
}

export default DepartmentHeadReservations;