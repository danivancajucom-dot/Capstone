import React, { useState } from 'react';
import './department-head-activity-log.css';
import { useNavigate } from "react-router-dom";

const tabs = ['All Activities', 'System Changes', 'Security Events'];

const logs = [
  {
    user: 'Juan Dela Cruz',
    role: 'Department Head',
    action: 'Approved Reservation',
    actionType: 'success',
    target: 'Room A1',
    date: 'Oct 21, 2026',
    time: '9:44 AM',
    status: 'SUCCESS',
  },
  {
    user: 'Juan Dela Cruz',
    role: 'Department Head',
    action: 'Updated User Roles',
    actionType: 'edit',
    target: 'User: Juan Dela Cruz',
    date: 'Oct 21, 2026',
    time: '11:00 AM',
    status: 'SUCCESS',
  },
  {
    user: 'Juan Dela Cruz',
    role: 'Faculty',
    action: 'Request Reservation',
    actionType: 'denied',
    target: 'Room SDL1',
    date: 'Oct 21, 2026',
    time: '11:51 AM',
    status: 'DENIED',
  },
  {
    user: 'Juan Dela Cruz',
    role: 'Clerk',
    action: 'Failed Login Attempt',
    actionType: 'failed',
    target: 'Auth: IP 192.168.1.1',
    date: 'Oct 21, 2026',
    time: '3:03 PM',
    status: 'FAILED',
  },
  {
    user: 'Juan Dela Cruz',
    role: 'Department Head',
    action: 'Approved Reservation',
    actionType: 'success',
    target: 'Room CT8',
    date: 'Oct 21, 2026',
    time: '4:00 PM',
    status: 'SUCCESS',
  },
];

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

  return (
    <div className="activity-log">
      {/* PAGE HEADER */}
      <div className="log-page-header">
        <div className="log-title-row">
          <button className="back-btn" onClick={() => navigate("/department-head")}>
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
          <button className="action-btn outline">
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
            <h2 className="log-stat-value">50</h2>
            <span className="log-stat-change green">↑ 12% from yesterday</span>
          </div>
        </div>

        <div className="log-stat-card">
          <div className="log-stat-icon orange">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <p className="log-stat-label">ALERTS FLAGGED</p>
            <h2 className="log-stat-value">2</h2>
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
            {logs.map((log, i) => (
              <tr key={i}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar"></div>
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
                  <p>{log.date}</p>
                  <p className="time">{log.time}</p>
                </td>
                <td>
                  <span className={`status-badge ${log.status.toLowerCase()}`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
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
    </div>
  );
}