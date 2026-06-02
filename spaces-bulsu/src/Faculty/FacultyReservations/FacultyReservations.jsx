import { useState } from "react";
import "./faculty-reservations.css";
import FacultyPendingReservationCard from "../../Components/FacultyPendingReservationCard/FacultyPendingReservationCard";
import FacultyApprovedReservationCard from "../../Components/FacultyApprovedReservationCard/FacultyApprovedReservationCard";
import FacultyDeniedReservationCard from "../../Components/FacultyDeniedReservationCard/FacultyDeniedReservationCard";

function FacultyReservations() {
  const [activeNav, setActiveNav] = useState("all");

  return (
    <>
    <div className="container">
      <h1>Faculty Reservations</h1>

      <div className="faculty-reservations-box">
        <div className="faculty-reservations-nav">
          <div
            className={`faculty-nav-item ${activeNav === "all" ? "active" : ""}`}
            onClick={() => setActiveNav("all")}
          >All</div>
          <div
            className={`faculty-nav-item ${activeNav === "pending" ? "active" : ""}`}
            onClick={() => setActiveNav("pending")}
          >Pending</div>
          <div
            className={`faculty-nav-item ${activeNav === "approved" ? "active" : ""}`}
            onClick={() => setActiveNav("approved")}
          >Approved</div>
          <div
            className={`faculty-nav-item ${activeNav === "denied" ? "active" : ""}`}
            onClick={() => setActiveNav("denied")}
          >Denied</div>
        </div>
        <FacultyPendingReservationCard /> 
        <FacultyApprovedReservationCard/>
        <FacultyDeniedReservationCard/>
      </div>
      <button className="faculty-add-btn">
  <i className="fa-solid fa-plus"></i>
</button>
    </div>
    </>

  );
}

export default FacultyReservations;