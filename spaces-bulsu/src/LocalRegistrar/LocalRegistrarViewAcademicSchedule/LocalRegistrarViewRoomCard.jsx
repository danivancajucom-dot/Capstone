import "./local-registrar-view-room-card.css";
import ScheduleCard from "../../Components/ScheduleCard/ScheduleCard";
import ClassDetailsCard from "../../Components/ClassDetailsCard/ClassDetailsCard";

function LocalRegistrarViewRoomCard() {
  return (
    <>
        <div className="container">
      <i className="fa-solid fa-arrow-left back-arrow"></i>

    <div className="white-box-view-room">
      <div className="box-header">
    <div className="week-navigation">
    <i className="fa-solid fa-chevron-left"></i>
    <span>May 4 - 10, 2026</span>
    <i className="fa-solid fa-chevron-right"></i>
         </div>
  <span className="room-name">Room Name</span>
        </div>


        <div className="days-container">
  <div className="day">
    <span className="day-name">MON</span>
    <span className="day-date">4</span>
  </div>
  <div className="day">
    <span className="day-name">TUE</span>
    <span className="day-date">5</span>
  </div>
  <div className="day">
    <span className="day-name">WED</span>
    <span className="day-date">6</span>
  </div>
  <div className="day">
    <span className="day-name">THU</span>
    <span className="day-date">7</span>
  </div>
  <div className="day">
    <span className="day-name">FRI</span>
    <span className="day-date">8</span>
  </div>
  <div className="day">
    <span className="day-name">SAT</span>
    <span className="day-date">9</span>
  </div>
  <div className="day">
    <span className="day-name">SUN</span>
    <span className="day-date">10</span>
  </div>
</div>

<hr className="days-divider" />

    <div className="schedule-container">
  <div className="time-column">
    <div className="time-slot">07 AM</div>
    <div className="time-slot">08 AM</div>
    <div className="time-slot">09 AM</div>
    <div className="time-slot">10 AM</div>
    <div className="time-slot">11 AM</div>
    <div className="time-slot">12 PM</div>
    <div className="time-slot">01 PM</div>
    <div className="time-slot">02 PM</div>
    <div className="time-slot">03 PM</div>
    <div className="time-slot">04 PM</div>
    <div className="time-slot">05 PM</div>
    <div className="time-slot">06 PM</div>
    <div className="time-slot">07 PM</div>
    <div className="time-slot">08 PM</div>
  </div>
  {/* example langg para makita cards */}
   <ScheduleCard/>
</div>
<div className="class-details-container">
    <ClassDetailsCard />
  </div>
      </div>
    </div>
    </>
  );
}

export default LocalRegistrarViewRoomCard;