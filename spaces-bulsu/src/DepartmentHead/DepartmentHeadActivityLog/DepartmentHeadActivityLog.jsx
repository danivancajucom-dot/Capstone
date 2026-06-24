import React, { useState,useEffect } from 'react';
import './department-head-activity-log.css';
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";
const tabs = ['All Activities', 'System Changes', 'Security Events'];

const actionIcon = (type) => {
  switch (type) {
    case 'success':  return <i className="fa-solid fa-circle-check action-icon green"></i>;
    case 'edit':     return <i className="fa-solid fa-pen action-icon blue"></i>;
    case 'denied':   return <i className="fa-solid fa-circle-xmark action-icon red"></i>;
    case 'failed':   return <i className="fa-solid fa-circle-xmark action-icon red"></i>;
    default:         return <i className="fa-solid fa-circle action-icon gray"></i>;
  }
};

export default function DepartmentHeadActivityLog() {
  const [activeTab, setActiveTab] = useState('All Activities');
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const [userRole, setUserRole] = useState('All Roles');
  const [actionType, setActionType] = useState('All Actions');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);


  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "loading",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });

    if (type !== "loading") {
      setTimeout(() => {
        setToast({ show: false, message: "", type: "loading" });
      }, 2500);
    }
  };

  const filteredLogs = logs.filter((log) => {
  if (activeTab === "All Activities") return true;

  if (activeTab === "System Changes") {
    return log.actionType === "edit" || log.actionType === "success";
  }

  if (activeTab === "Security Events") {
    return log.actionType === "failed" || log.actionType === "denied";
  }

  return true;
});

 const exportCSV = async () => {
    try {
      showToast("Exporting CSV...", "loading");

      await new Promise(res => setTimeout(res, 800));

      const headers = ["User", "Role", "Action", "Target", "Date", "Status"];

      const rows = logs.map(log => {
        const date = log.timestamp?.toDate?.().toLocaleDateString?.() || "";
        return [
          log.user || "",
          log.role || "",
          log.action || "",
          log.target || "",
          date,
          log.status || "",
        ];
      });

      const csv = [headers, ...rows]
        .map(r => r.map(v => `"${v}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "activity_logs.csv";
      a.click();

      showToast("Export successful!", "success");
    } catch (err) {
      console.error(err);
      showToast("Export failed!", "error");
    }
  };

  useEffect(() => {
  const q = query(
    collection(db, "activityLogs"),
    orderBy("timestamp", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setLogs(data);

    // TODAY COUNT
    const today = new Date().toDateString();

    const todayLogs = data.filter((log) =>
      log.timestamp?.toDate?.().toDateString() === today
    );

    setTodayCount(todayLogs.length);

    // ALERTS COUNT
    const alerts = data.filter(
      (log) =>
        log.actionType === "failed" ||
        log.actionType === "denied"
    );

    setAlertCount(alerts.length);
  });

  return () => unsubscribe();
}, []);




  return (
    <div className="activity-log">
      {/* PAGE HEADER */}
      <div className="log-page-header">
        <div className="log-title-row">
          <button className="dh-al-back-btn" onClick={() => navigate("/department-head")}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>

          <div>
            <h1>Activity Log</h1>
            <p className="log-subtitle">
              Secure, read-only audit trail of all actions performed within the FIREFOX environment.
            </p>
          </div>
        </div>

        <div className="log-actions">
          <button className="action-btn outline" onClick={exportCSV}>
            <i className="fa-solid fa-download"></i>
            Export CSV
          </button>

          <button className="action-btn filled">
            <i className="fa-solid fa-print"></i>
            Print Report
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="log-stats">
        <div className="log-stat-card">
          <div className="log-stat-icon blue">
            <i className="fa-solid fa-eye"></i>
          </div>
          <div>
            <p className="log-stat-label">TOTAL ACTIONS TODAY</p>
            <h2 className="log-stat-value">{todayCount}</h2>
            <span className="log-stat-change green">↑ 12% from yesterday</span>
          </div>
        </div>

        <div className="log-stat-card">
          <div className="log-stat-icon orange">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <p className="log-stat-label">ALERTS FLAGGED</p>
            <h2 className="log-stat-value">{alertCount}</h2>
            <span className="log-stat-change gray">Requires manual review</span>
          </div>
        </div>

        <div className="log-stat-card">
          <div className="log-stat-icon orange-alt">
            <i className="fa-solid fa-bars-staggered"></i>
          </div>
          <div>
            <p className="log-stat-label">LOG RETENTION</p>
            <h2 className="log-stat-value">365 <span className="unit">DAYS</span></h2>
            <span className="log-stat-change gray">Not expires: Jan 1, 2026</span>
          </div>
        </div>
      </div>

        <div className="log-content-box">
      {/* TABS */}
      <div className="log-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`log-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div className="log-filters">
        <div className="filter-group">
          <label>DATE RANGE</label>
          <div className="select-wrap">
            <i className="fa-regular fa-calendar"></i>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
            <i className="fa-solid fa-chevron-down chev"></i>
          </div>
        </div>

        <div className="filter-group">
          <label>USER ROLE</label>
          <div className="select-wrap">
            <i className="fa-solid fa-users"></i>
            <select value={userRole} onChange={e => setUserRole(e.target.value)}>
              <option>All Roles</option>
              <option>Department Head</option>
              <option>Faculty</option>
              <option>Clerk</option>
            </select>
            <i className="fa-solid fa-chevron-down chev"></i>
          </div>
        </div>

        <div className="filter-group">
          <label>ACTION TYPE</label>
          <div className="select-wrap">
            <select value={actionType} onChange={e => setActionType(e.target.value)}>
              <option>All Actions</option>
              <option>Approved</option>
              <option>Denied</option>
              <option>Failed</option>
            </select>
            <i className="fa-solid fa-chevron-down chev"></i>
          </div>
        </div>

        <button className="apply-btn">Apply Filters</button>
      </div>

      {/* TABLE */}
      <div className="log-table-wrap">
        <table className="log-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>ACTION</th>
              <th>TARGET</th>
              <th>DATE & TIME</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const date = log.timestamp?.toDate?.().toLocaleDateString?.() || "N/A";
              const time = log.timestamp?.toDate?.().toLocaleTimeString?.([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "";

              return (
                <tr key={log.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {log.user?.split(" ")?.map(n => n[0]).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="user-name">{log.user}</p>
                        <p className="user-role">{log.role}</p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="action-cell">
                      {actionIcon(log.actionType)}
                      <span>{log.action}</span>
                    </div>
                  </td>

                  <td className="target-cell">{log.target}</td>

                  <td className="date-cell">
                    <p>{date}</p>
                    <p className="time">{time}</p>
                  </td>

                  <td>
                    <span className={`status-badge ${log.status?.toLowerCase?.()}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="log-pagination">
        <span className="pagination-info">Showing 1 to 5 of 1,344 activities</span>

        <div className="pagination-controls">
          <button className="page-btn" disabled>Previous</button>
          {[1, 2, 3].map(p => (
            <button
              key={p}
              className={`page-btn ${currentPage === p ? 'active' : ''}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
          <span className="page-ellipsis">...</span>
          <button className="page-btn" onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
        </div>
      </div>
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() =>
          setToast({ show: false, type: "", message: "" })
        }
      />
    </div>

    </div>
  );
}