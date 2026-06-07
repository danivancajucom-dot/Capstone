import "./department-head-conflicts.css";
import ConflictCard from "../../Components/ConflictCard/ConflictCard";
import RoomReassignCard from "../../Components/RoomReassignCard/RoomReassignCard";

function DepartmentHeadConflicts() {
  return (
   <>
   <div className="container">
  <div className="page-header">
    <div>
      <h1>Conflict Monitoring</h1>
      <p>Resolve booking collisions and schedule overlaps within the CICT department.</p>
    </div>
    <button className="export-btn">
      <i className="fa-solid fa-download"></i> Export Report
    </button>
  </div>
  <div className="conflict-boxes">
  <div className="conflict-main-box">
    <div className="conflict-nav">
    <div className="conflict-nav-item active">All Conflicts</div>
    <div className="conflict-nav-item">Resolved</div>
  </div>
  {/* example langg */}
  <ConflictCard /> 
  </div>
  <div className="conflict-side-box">
    <div className="side-box-header">
  <i className="fa-solid fa-lightbulb side-box-icon"></i>
  <span className="side-box-title">Smart Alternatives</span>
</div>
 {/* example langg */}
    <RoomReassignCard />
  <div className="auto-resolve">
    <div className="auto-resolve-header">
      <span className="auto-resolve-title">Auto-resolve conflicts</span>
      <label className="toggle-smart">
        <input type="checkbox" />
        <span className="toggle-slider"></span>
      </label>
    </div>
    <p className="auto-resolve-desc">Enable this to let SpaceS AI automatically propose and notify stakeholders of room changes for minor overlaps.</p>
      </div>
     </div>
    </div>
</div>

    </>

  );
}

export default DepartmentHeadConflicts;