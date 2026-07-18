import React, { useState,useEffect } from 'react';
import './department-head-activity-log.css';
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";
const tabs = ['All Activities', 'System Changes', 'Security Events'];

const ITEMS_PER_PAGE = 10;

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

  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // { ids: [...] }
  const [deleting, setDeleting] = useState(false);


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

  // -----------------------------------------------------------------
  // PAGINATION (10 per page, based on the actually filtered logs)
  // -----------------------------------------------------------------

  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;

  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // i-reset ang page (at ang selection) tuwing magpapalit ng tab
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab]);

  // i-clamp ang currentPage kung bumaba ang totalPages (hal. after delete)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  const renderPageNumbers = () => {
    const pages = [];
    const start = Math.max(1, safePage - 1);
    const end = Math.min(totalPages, start + 2);

    for (let i = start; i <= end; i++) pages.push(i);

    return pages;
  };

  const pageNumbers = renderPageNumbers();

  // -----------------------------------------------------------------
  // SELECTION
  // -----------------------------------------------------------------

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const allOnPageSelected =
    paginatedLogs.length > 0 &&
    paginatedLogs.every((l) => selectedIds.includes(l.id));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedLogs.some((l) => l.id === id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...paginatedLogs.map((l) => l.id)]),
      ]);
    }
  };

  // -----------------------------------------------------------------
  // DELETE
  // -----------------------------------------------------------------

  const requestDeleteSingle = (id) => setDeleteTarget({ ids: [id] });
  const requestDeleteSelected = () => setDeleteTarget({ ids: selectedIds });

  const confirmDelete = async () => {

    if (!deleteTarget || deleteTarget.ids.length === 0) return;

    setDeleting(true);

    try {

      if (deleteTarget.ids.length === 1) {

        await deleteDoc(doc(db, "activityLogs", deleteTarget.ids[0]));

      } else {

        const batch = writeBatch(db);

        deleteTarget.ids.forEach((id) => {
          batch.delete(doc(db, "activityLogs", id));
        });

        await batch.commit();

      }

      setSelectedIds((prev) =>
        prev.filter((id) => !deleteTarget.ids.includes(id))
      );

      showToast(
        `Deleted ${deleteTarget.ids.length} log${
          deleteTarget.ids.length > 1 ? "s" : ""
        }.`,
        "success"
      );

    } catch (err) {

      console.error(err);

      showToast("Failed to delete log(s).", "error");

    } finally {

      setDeleting(false);
      setDeleteTarget(null);

    }

  };

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
          {selectedIds.length > 0 && (
            <button
              className="action-btn outline"
              style={{ color: "#dc2626", borderColor: "#dc2626" }}
              onClick={requestDeleteSelected}
            >
              <i className="fa-solid fa-trash"></i>
              Delete Selected ({selectedIds.length})
            </button>
          )}

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
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  aria-label="Select all on this page"
                />
              </th>
              <th>USER</th>
              <th>ACTION</th>
              <th>TARGET</th>
              <th>DATE & TIME</th>
              <th>STATUS</th>
              <th style={{ width: 60 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                  No activity logs found.
                </td>
              </tr>
            )}

            {paginatedLogs.map((log) => {
              const date = log.timestamp?.toDate?.().toLocaleDateString?.() || "N/A";
              const time = log.timestamp?.toDate?.().toLocaleTimeString?.([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "";

              return (
                <tr key={log.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(log.id)}
                      onChange={() => toggleSelect(log.id)}
                      aria-label={`Select log ${log.id}`}
                    />
                  </td>

                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {(log.user || "")
                          .split(" ")
                          .filter(Boolean)
                          .map(n => n[0])
                          .join("")
                          .toUpperCase()}
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

                  <td>
                    <button
                      type="button"
                      onClick={() => requestDeleteSingle(log.id)}
                      aria-label="Delete log entry"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9ca3af",
                        fontSize: 15,
                        padding: "6px 8px",
                        borderRadius: 6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="log-pagination">
        <span className="pagination-info">
          Showing {totalItems === 0 ? 0 : startIndex + 1} to{" "}
          {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} of {totalItems} activities
        </span>

        <div className="pagination-controls">
          <button
            className="page-btn"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>

          {pageNumbers[0] > 1 && (
            <>
              <button className="page-btn" onClick={() => setCurrentPage(1)}>1</button>
              {pageNumbers[0] > 2 && <span className="page-ellipsis">...</span>}
            </>
          )}

          {pageNumbers.map(p => (
            <button
              key={p}
              className={`page-btn ${safePage === p ? 'active' : ''}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="page-ellipsis">...</span>
              )}
              <button className="page-btn" onClick={() => setCurrentPage(totalPages)}>
                {totalPages}
              </button>
            </>
          )}

          <button
            className="page-btn"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "28px 26px",
              width: "100%",
              maxWidth: 360,
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                margin: "0 auto 14px",
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "#1E2430" }}>
              Delete {deleteTarget.ids.length > 1 ? `${deleteTarget.ids.length} logs` : "this log"}?
            </h3>

            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#64748B" }}>
              This action is permanent and cannot be undone.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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