import "./local-registrar-activity-log.css";

function LocalRegistrarActivityLog() {
  return (
    <>
        <div className="lr-activity-log">
  <div className="lr-al-page-header">
    <div>
      <h1>Activity Log</h1>
      <p>Track and monitor all actions performed in the system.</p>
    </div>
    <div className="header-buttons">
      <button className="export-csv">
        <i className="fa-solid fa-download"></i> Export CSV
      </button>
      <button className="print-btn">
        <i className="fa-solid fa-print"></i> Print Report
      </button>
    </div>
  </div>

  <div className="summary-boxes">  
    <div className="total-actions">
         <span>Total Actions Today</span>
    </div>
    <div className="log-retention">
         <span>Log Retention</span>
    </div> 
  </div>
    <div className="white-box-log-lr">
  <div className="log-filters">
    <div className="dropdown-log">
      <select className="dropdown-logs" defaultValue="">
        <option value="" disabled hidden>Date Range</option>
        <option value="today">Today</option>
        <option value="this-week">This Week</option>
        <option value="this-month">This Month</option>
      </select>
      <i className="fa-solid fa-angle-down dropdown-icon-log"></i>
    </div>

    <div className="dropdown-log">
      <select className="dropdown-logs" defaultValue="">
        <option value="" disabled hidden>Action Type</option>
        <option value="upload">Uploaded Schedule</option>
        <option value="archive">Archived Schedule</option>
        <option value="restore">Restored Schedule</option>
        <option value="generate">Generated QR Code</option>
        <option value="download">Downloaded QR Code</option>
        <option value="zip">Downloaded All ZIP</option>
      </select>
      <i className="fa-solid fa-angle-down dropdown-icon-log"></i>
    </div>

    <div className="dropdown-log">
      <select className="dropdown-logs" defaultValue="">
        <option value="" disabled hidden>Status</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
      </select>
      <i className="fa-solid fa-angle-down dropdown-icon-log"></i>
    </div>

    <button className="apply-filters-btn">Apply Filters</button>
  </div>
        <div className="log-table-wrapper">
  <table className="log-table">
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Action</th>
        <th>Performed By</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
</div>
    <div className="log-pagination">
    <span className="log-showing">Showing 5 of 50 activities</span>
    <div className="log-pagination-controls">
      <i className="fa-solid fa-chevron-left"></i>
      <i className="fa-solid fa-chevron-right"></i>
    </div>
  </div>
</div>

</div>
    </>
  );
}

export default LocalRegistrarActivityLog;