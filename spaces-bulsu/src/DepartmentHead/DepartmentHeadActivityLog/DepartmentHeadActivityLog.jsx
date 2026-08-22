import React, { useState, useEffect, useMemo } from 'react';
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
// NEW: PDF libraries and logos
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import universityLogo from "../../assets/BSU-Logo.png";
import collegeLogo from "../../assets/CICT-Logo.png";

const tabs = ['All Activities', 'System Changes', 'Security Events'];
const ITEMS_PER_PAGE = 10;

// NEW: School header constant (same as RoomUsageTracking)
const SCHOOL_HEADER = {
  universityLogoUrl: universityLogo,
  collegeLogoUrl: collegeLogo,
  universityName: "Bulacan State University",
  collegeName: "College of Information and Communications Technology",
  systemName: "SpaceS CICT",
};

const actionIcon = (type) => {
  switch (type) {
    case 'success':  return <i className="fa-solid fa-circle-check action-icon green"></i>;
    case 'edit':     return <i className="fa-solid fa-pen action-icon blue"></i>;
    case 'denied':   return <i className="fa-solid fa-circle-xmark action-icon red"></i>;
    case 'failed':   return <i className="fa-solid fa-circle-xmark action-icon red"></i>;
    default: return <i className="fa-solid fa-bolt action-icon orange"></i>;
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
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  // ─── Fetch logs ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLogs(data);

      // Today count
      const today = new Date().toDateString();
      const todayLogs = data.filter((log) =>
        log.timestamp?.toDate?.().toDateString() === today
      );
      setTodayCount(todayLogs.length);

      // Alert count
      const alerts = data.filter(
        (log) => log.actionType === "failed" || log.actionType === "denied"
      );
      setAlertCount(alerts.length);
    });

    return () => unsubscribe();
  }, []);

  // ─── Filter logic ────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (activeTab === "System Changes") {
      result = result.filter(log => log.actionType === "edit" || log.actionType === "success");
    } else if (activeTab === "Security Events") {
      result = result.filter(log => log.actionType === "failed" || log.actionType === "denied");
    }

    const now = new Date();
    let cutoffDate = null;
    if (dateRange === "Last 7 Days") {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 7);
    } else if (dateRange === "Last 30 Days") {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 30);
    } else if (dateRange === "Last 90 Days") {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 90);
    }
    if (cutoffDate) {
      result = result.filter((log) => {
        const logDate = log.timestamp?.toDate?.();
        return logDate && logDate >= cutoffDate;
      });
    }

    if (userRole !== "All Roles") {
      const roleLower = userRole.toLowerCase();
      result = result.filter((log) =>
        (log.role || "").toLowerCase() === roleLower
      );
    }

    if (actionType !== "All Actions") {
      const actionLower = actionType.toLowerCase();
      let targetType = "";
      if (actionLower === "approved") targetType = "success";
      else if (actionLower === "denied") targetType = "denied";
      else if (actionLower === "failed") targetType = "failed";
      else targetType = actionLower;

      result = result.filter((log) =>
        (log.actionType || "").toLowerCase() === targetType
      );
    }

    return result;
  }, [logs, activeTab, dateRange, userRole, actionType]);

  // ─── Pagination ──────────────────────────────────────────────────────
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, dateRange, userRole, actionType]);

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

  // ─── Selection ──────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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

  // ─── Delete ──────────────────────────────────────────────────────────
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
        `Deleted ${deleteTarget.ids.length} log${deleteTarget.ids.length > 1 ? "s" : ""}.`,
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

  // ─── Export CSV ──────────────────────────────────────────────────────
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

  // ─── NEW: Export PDF ────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      showToast("No logs to export.", "error");
      return;
    }

    showToast("Generating PDF...", "loading");

    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 40;
      const logoSize = 50;
      const centerX = pageWidth / 2;

      // ---- Letterhead ----
      if (SCHOOL_HEADER.universityLogoUrl) {
        pdf.addImage(SCHOOL_HEADER.universityLogoUrl, "PNG", marginX, 22, logoSize, logoSize);
      }
      if (SCHOOL_HEADER.collegeLogoUrl) {
        pdf.addImage(
          SCHOOL_HEADER.collegeLogoUrl,
          "PNG",
          pageWidth - marginX - logoSize,
          22,
          logoSize,
          logoSize
        );
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(20, 27, 45);
      pdf.text(SCHOOL_HEADER.universityName, centerX, 36, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(SCHOOL_HEADER.collegeName, centerX, 50, { align: "center" });
      pdf.text(SCHOOL_HEADER.systemName, centerX, 62, { align: "center" });

      pdf.setDrawColor(245, 124, 0);
      pdf.setLineWidth(1.5);
      pdf.line(marginX, 82, pageWidth - marginX, 82);

      // ---- Title & filters ----
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(245, 124, 0);
      pdf.text("Activity Log Report", marginX, 104);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Filters: ${activeTab} | ${dateRange} | ${userRole} | ${actionType}`, marginX, 120);
      pdf.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - marginX,
        120,
        { align: "right" }
      );

      // ---- Table ----
      const rows = filteredLogs.map((log) => {
        const date = log.timestamp?.toDate?.().toLocaleDateString?.() || "N/A";
        const time = log.timestamp?.toDate?.().toLocaleTimeString?.([], {
          hour: "2-digit",
          minute: "2-digit",
        }) || "";
        return [
          log.user || "-",
          log.role || "-",
          log.action || "-",
          log.target || "-",
          `${date} ${time}`,
          log.status || "-",
        ];
      });

      autoTable(pdf, {
        startY: 134,
        head: [["User", "Role", "Action", "Target", "Date & Time", "Status"]],
        body: rows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8, cellPadding: 5, valign: "middle" },
        headStyles: {
          fillColor: [245, 124, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: { textColor: [26, 26, 26] },
        alternateRowStyles: { fillColor: [253, 246, 240] },
        margin: { left: marginX, right: marginX },
      });

      // ---- Footer ----
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - marginX,
          pdf.internal.pageSize.getHeight() - 20,
          { align: "right" }
        );
        pdf.text(
          `${SCHOOL_HEADER.systemName} — Confidential`,
          marginX,
          pdf.internal.pageSize.getHeight() - 20
        );
      }

      pdf.save(`activity-log-${new Date().toISOString().slice(0,10)}.pdf`);
      showToast("PDF exported successfully!", "success");
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("Failed to generate PDF. Please try again.", "error");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

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
              Secure, read-only audit trail of all actions performed within the SpaceS CICT environment.
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
          {/* Updated PDF button with handler */}
          <button className="action-btn filled" onClick={handleExportPDF}>
            <i className="fa-solid fa-download"></i>
            Export PDF
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

          <button
            className="apply-btn-dph"
            onClick={() => {
              showToast("Filters applied", "success");
            }}
          >
            Apply Filters
          </button>
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