import "./local-registrar-activity-log.css";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const ACTION_FILTERS = [
  "Uploaded Schedule",
  "Generated QR Code",
  "Downloaded QR Code",
  "Downloaded All QR ZIP",
];

export default function LocalRegistrarActivityLog() {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();
  const [currentUid, setCurrentUid] = useState(null);

  const [dateFilter, setDateFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [draftDateFilter, setDraftDateFilter] = useState("");
  const [draftActionFilter, setDraftActionFilter] = useState("");
  const [draftStatusFilter, setDraftStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 10;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUid) loadLogs();
  }, [currentUid]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, actionFilter, statusFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Ibalik sa wala lahat ng filter — makikita ulit lahat ng logs.
  const handleResetFilters = () => {
    setDraftDateFilter("");
    setDraftActionFilter("");
    setDraftStatusFilter("");
    setDateFilter("");
    setActionFilter("");
    setStatusFilter("");
  };

  const handleApplyFilters = () => {
    setDateFilter(draftDateFilter);
    setActionFilter(draftActionFilter);
    setStatusFilter(draftStatusFilter);
  };

  const filteredLogs = useMemo(() => {
    let data = logs.filter((log) => log.userId === currentUid);

    if (statusFilter) {
      data = data.filter(
        (l) => l.status?.trim().toLowerCase() === statusFilter.trim().toLowerCase()
      );
    }

    if (actionFilter) {
      data = data.filter((log) => log.action?.trim() === actionFilter);
    }

    if (dateFilter) {
      const now = new Date();
      data = data.filter((log) => {
        if (!log.timestamp) return false;
        const d = log.timestamp.toDate();

        if (dateFilter === "today") {
          return d.toDateString() === now.toDateString();
        }
        if (dateFilter === "this-week") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return d >= weekAgo;
        }
        if (dateFilter === "this-month") {
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
    }

    return data;
  }, [logs, currentUid, statusFilter, actionFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  const displayedLogs = filteredLogs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const totalToday = logs.filter((log) => {
    if (!log.timestamp) return false;
    return (
      log.userId === currentUid &&
      log.timestamp.toDate().toDateString() === new Date().toDateString()
    );
  }).length;

  return (
    <div className="lr-activity-log">
      <div className="lr-al-page-header">
        <div>
          <i
            className="fa-solid fa-arrow-left lr-back-arrow-al"
            onClick={() => navigate("/local-registrar")}
          ></i>
          <h1>Activity Log</h1>
          <p>Track and monitor your own actions as Local Registrar.</p>
        </div>
      </div>

      <div className="summary-boxes">
        <div className="total-actions">
          <span>Total Actions Today</span>
          <h2>{totalToday}</h2>
        </div>
        <div className="log-retention">
          <span>Total Logs</span>
          <h2>{filteredLogs.length}</h2>
        </div>
      </div>

      <div className="white-box-log-lr">
        <div className="log-filters">
          <div className="dropdown-log">
            <select
              className="dropdown-logs"
              value={draftDateFilter}
              onChange={(e) => setDraftDateFilter(e.target.value)}
            >
              <option value="">Date Range</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
            </select>
          </div>

          <div className="dropdown-log">
            <select
              className="dropdown-logs"
              value={draftActionFilter}
              onChange={(e) => setDraftActionFilter(e.target.value)}
            >
              <option value="">Action</option>
              {ACTION_FILTERS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="dropdown-log">
            <select
              className="dropdown-logs"
              value={draftStatusFilter}
              onChange={(e) => setDraftStatusFilter(e.target.value)}
            >
              <option value="">Status</option>
              <option value="success">SUCCESS</option>
              <option value="failed">FAILED</option>
            </select>
          </div>

          <button className="apply-filters-btn" onClick={handleApplyFilters}>
            Apply Filters
          </button>

          <button
            type="button"
            className="reset-filters-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset filters"
          >
            <i className="fa-solid fa-rotate-right" />
          </button>
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
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>
                    Loading logs...
                  </td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.timestamp?.toDate().toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td>{log.user}</td>
                    <td>
                      <span
                        className={`status-chip ${
                          log.status === "SUCCESS" ? "success" : "failed"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="log-pagination">
          <span className="log-showing">
            Showing {displayedLogs.length} of {filteredLogs.length}
          </span>

          <div className="log-pagination-controls">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button
              disabled={page === totalPages || filteredLogs.length === 0}
              onClick={() => setPage(page + 1)}
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}