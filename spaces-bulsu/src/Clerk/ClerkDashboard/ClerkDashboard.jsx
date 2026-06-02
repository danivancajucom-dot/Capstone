import { useState } from "react";
import "./clerk-dashboard.css";
import DashboardReleasedRoomCard from "../../Components/DashboardReleasedRoomCard/DashboardReleasedRoomCard";
import UpcomingSchedCard from "../../Components/UpcomingSchedCard/UpcomingSchedCard";
import AvailableRoomCard from "../../Components/AvailableRoomCard/AvailableRoomCard";
import OccupiedRoomCard from "../../Components/OccupiedRoomCard/OccupiedRoomCard";
import MaintenanceRoomCard from "../../Components/MaintenanceRoomCard/MaintenanceRoomCard";
import ReservedRoomCard from "../../Components/ReservedRoomCard/ReservedRoomCard";

function ClerkDashboard() {
  const [activeNav, setActiveNav] = useState("all-rooms");

  return (
    <>
      <div className="container">
      <h1>Clerk Dashboard</h1>

      <div className="clerk-dashboard-boxes">
        <div className="clerk-dashboard-main-box">
          <div className="clerk-nav">
            <div
              className={`clerk-nav-item all-rooms ${activeNav === "all-rooms" ? "active" : ""}`}
              onClick={() => setActiveNav("all-rooms")}
            >All Rooms</div>
            <div
              className={`clerk-nav-item available ${activeNav === "available" ? "active" : ""}`}
              onClick={() => setActiveNav("available")}
            >Available</div>
            <div
              className={`clerk-nav-item occupied ${activeNav === "occupied" ? "active" : ""}`}
              onClick={() => setActiveNav("occupied")}
            >Occupied</div>
            <div
              className={`clerk-nav-item maintenance ${activeNav === "maintenance" ? "active" : ""}`}
              onClick={() => setActiveNav("maintenance")}
            >Maintenance</div>
            <div
              className={`clerk-nav-item reserved ${activeNav === "reserved" ? "active" : ""}`}
              onClick={() => setActiveNav("reserved")}
            >Reserved</div>
          </div>
           <div className="status-rooms-grid">
              <AvailableRoomCard />
              <AvailableRoomCard />
              <OccupiedRoomCard/>
              <ReservedRoomCard/>
              <MaintenanceRoomCard/>
              <MaintenanceRoomCard/>
            </div>
            
           <div className="clerk-load-more">
    <button className="clerk-load-more-btn">Load More</button>
  </div>
        </div>

        <div className="clerk-dashboard-right">
          <div className="clerk-dashboard-side-box">
            <div className="clerk-side-box-header">
              <div className="clerk-side-box-title">
                <i className="fa-regular fa-circle-check clerk-side-icon"></i>
                <span>Released Rooms</span>
              </div>
              <button className="clerk-view-all-btn">View All</button>
            </div>
            <DashboardReleasedRoomCard/>
          </div>

          <div className="clerk-upcoming-box">
            <div className="clerk-upcoming-header">
              <div className="clerk-upcoming-title">
                <i className="fa-regular fa-calendar clerk-upcoming-icon"></i>
                <span>Upcoming Schedule</span>
              </div>
            </div>

            <UpcomingSchedCard />

            <div className="clerk-upcoming-footer">
              <button className="clerk-view-schedule-btn">View Full Schedule</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>

  );
}

export default ClerkDashboard;