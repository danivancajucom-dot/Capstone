import "./LocalRegistrarDashboard.css";

export default function LocalRegistrarDashboard() {
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

        <div className="table-header">

          <h2>Recently Modified Schedules</h2>

          <button className="view-all-btn">
            View All
          </button>

        </div>

        <div className="table-scroll">

          <table>

            <thead>
              <tr>
                <th>Course</th>
                <th>Room</th>
                <th>Faculty</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              <tr>
                <td>Systems Design</td>
                <td>Prog Lab 2</td>
                <td>Dela Cruz</td>
                <td>9:00AM - 12:00PM</td>
                <td>
                  <span className="status-chip confirmed">
                    Confirmed
                  </span>
                </td>
              </tr>

              <tr>
                <td>Game Development</td>
                <td>SDL2</td>
                <td>Dela Cruz</td>
                <td>8:30AM - 11:30AM</td>
                <td>
                  <span className="status-chip conflict">
                    Conflict
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