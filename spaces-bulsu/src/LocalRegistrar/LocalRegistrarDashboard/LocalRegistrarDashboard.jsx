import "./LocalRegistrarDashboard.css";
import { useNavigate } from "react-router-dom";

export default function LocalRegistrarDashboard() {
const navigate = useNavigate();
  return (
    <div className="registrar-dashboard">

      <div className="dashboard-hero">

        <div>
          <h1>Local Registrar Dashboard</h1>
          <p>
            Real-time overview of room schedules and academic allocations.
          </p>
        </div>

        <button className="bulk-upload-btn">
          <i className="fa-solid fa-upload"></i>
          Bulk Upload
        </button>

      </div>

      <div className="dashboard-stats">

        <div className="stat-card">
          <h2>1,244</h2>
          <p>Total Schedules</p>
        </div>

        <div className="stat-card">
          <h2>48</h2>
          <p>Conflicts Found</p>
        </div>

        <div className="stat-card">
          <h2>96%</h2>
          <p>Room Utilization</p>
        </div>

        <div className="stat-card">
          <h2>15</h2>
          <p>Pending Reviews</p>
        </div>

      </div>

      <div className="dashboard-table-card">

        <div className="lr-dashboard-table-header">

          <h2>Activity Log</h2>

          <button
            className="lr-dashboard-view-all-btn"
            onClick={() => navigate("/local-registrar/activity-log")}
          >View All</button>

        </div>

        <div className="table-scroll">

          <table>

            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              <tr>
                <td>June 6, 2026 | 9:00AM</td>
                <td>Generated QR Code</td>
                <td>Prof. Dela Cruz</td>
                <td>
                  <span className="status-chip success">
                    Success
                  </span>
                </td>
              </tr>

              <tr>
                <td>June 6, 2026 | 9:02AM</td>
                <td>Generated QR Code</td>
                <td>Prof. Dela Cruz</td>
                <td>
                  <span className="status-chip failed">
                    Failed
                  </span>
                </td>
              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}