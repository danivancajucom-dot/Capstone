import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import ScheduleCard from "../../../Components/ScheduleCard/ScheduleCard";
import "./room-management-view-affected-schedule.css";
import ClassDetailsCard from "../../../Components/ClassDetailsCard/ClassDetailsCard";

function RoomManagementViewAffectedSchedule() {
  const navigate = useNavigate();

  return (
    <div className="vas-master-sched">
      <div className="vas-schedule-hero">
        <h1>Room Name</h1>
      </div>

      <div className="vas-schedule-box">
        <div className="vas-box-header">
          <div className="vas-week-navigation">
            <i className="fa-solid fa-chevron-left" />
            <span>October 21 - 23, 2026</span>
            <i className="fa-solid fa-chevron-right" />
          </div>
        </div>

        <div className="vas-days-container">
          <div className="vas-day">
            <span className="vas-day-name">MON</span>
            <span className="vas-day-date">21</span>
          </div>
          <div className="vas-day">
            <span className="vas-day-name">TUE</span>
            <span className="vas-day-date">22</span>
          </div>
          <div className="vas-day">
            <span className="vas-day-name">WED</span>
            <span className="vas-day-date">23</span>
          </div>
          <div className="vas-day">
            <span className="vas-day-name">THU</span>
            <span className="vas-day-date">24</span>
          </div>
          <div className="vas-day">
            <span className="vas-day-name">FRI</span>
            <span className="vas-day-date">25</span>
          </div>
          <div className="vas-day">
            <span className="vas-day-name">SAT</span>
            <span className="vas-day-date">26</span>
          </div>
          <div className="vas-day">
            <span className="vas-day-name">SUN</span>
            <span className="vas-day-date">27</span>
          </div>
        </div>

        <hr className="vas-days-divider" />

        <div className="vas-schedule-container">
          <div className="vas-time-column">
            <div className="vas-time-slot">07 AM</div>
            <div className="vas-time-slot">08 AM</div>
            <div className="vas-time-slot">09 AM</div>
            <div className="vas-time-slot">10 AM</div>
            <div className="vas-time-slot">11 AM</div>
            <div className="vas-time-slot">12 PM</div>
            <div className="vas-time-slot">01 PM</div>
            <div className="vas-time-slot">02 PM</div>
            <div className="vas-time-slot">03 PM</div>
            <div className="vas-time-slot">04 PM</div>
            <div className="vas-time-slot">05 PM</div>
            <div className="vas-time-slot">06 PM</div>
            <div className="vas-time-slot">07 PM</div>
            <div className="vas-time-slot">08 PM</div>
          </div>
         <ScheduleCard />
      </div>

 <div className="class-details-container">
          <ClassDetailsCard />
        </div>

        </div>
      <div className="vas-back-btn-container">
        <button
          type="button"
          className="vas-back-btn"
          onClick={() => navigate("/department-head/room-management")}
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default RoomManagementViewAffectedSchedule;