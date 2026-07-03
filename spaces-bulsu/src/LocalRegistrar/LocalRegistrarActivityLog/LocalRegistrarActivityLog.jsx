import "./local-registrar-activity-log.css";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function LocalRegistrarActivityLog() {

  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {

    setPage(1);

}, [

    dateFilter,

    actionFilter,

    statusFilter,

]);

const LR_ACTIONS = [

      "Uploaded Schedule",
      "Archived Schedule",
      "Restored Schedule",

      "Generated QR Code",
      "Downloaded QR Code",
      "Downloaded All QR ZIP",

  ];

  const loadLogs = async () => {

    try {

      const q = query(
        collection(db, "activityLogs"),
        orderBy("timestamp", "desc")
      );

      const snap = await getDocs(q);

      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLogs(data);

    } catch (err) {
      console.error(err);
    }

  };

  const filteredLogs = useMemo(() => {

    let data = logs.filter(log => {

    return (

        log.role === "Local Registrar" &&

        LR_ACTIONS.includes(log.action)

    );

});

      

  const ACTION_FILTERS = {

    upload: "Uploaded Schedule",

    archive: "Archived Schedule",

    restore: "Restored Schedule",

    generate: "Generated QR Code",

    download: "Downloaded QR Code",

    zip: "Downloaded All QR ZIP",

};

    if (statusFilter) {
      data = data.filter(
        l => l.status?.toLowerCase() === statusFilter
      );
    }

    if (actionFilter) {

        data = data.filter(

            log =>

                log.action === ACTION_FILTERS[actionFilter]

        );

    }

    if (dateFilter) {

      const now = new Date();

      data = data.filter(log => {

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

  }, [logs, statusFilter, actionFilter, dateFilter]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  const displayedLogs = filteredLogs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const totalToday = logs.filter(log => {

    if (!log.timestamp) return false;

    return (
      log.role === "Local Registrar" &&
      log.timestamp.toDate().toDateString() === new Date().toDateString()
    );

  }).length;

  return (

    <div className="lr-activity-log">

      <div className="lr-al-page-header">

      <div>

        <button
          className="back-btn"
          onClick={() => navigate("/local-registrar")}
        >
          <i className="fa-solid fa-arrow-left"></i>
          Back
        </button>

        <h1>Activity Log</h1>

        <p>
          Track and monitor all actions performed by the Local Registrar.
        </p>

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
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            >

              <option value="">Date Range</option>

              <option value="today">
                Today
              </option>

              <option value="this-week">
                This Week
              </option>

              <option value="this-month">
                This Month
              </option>

            </select>

          </div>

          <div className="dropdown-log">

            <select
              className="dropdown-logs"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >

              <option value="">Action</option>

              <option value="upload">
              Uploaded Schedule
              </option>

              <option value="archive">
              Archived Schedule
              </option>

              <option value="restore">
              Restored Schedule
              </option>

              <option value="generate">
              Generated QR Code
              </option>

              <option value="download">
              Downloaded QR Code
              </option>

              <option value="zip">
              Downloaded All QR ZIP
              </option>

            </select>

          </div>

          <div className="dropdown-log">

            <select
              className="dropdown-logs"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >

              <option value="">
                Status
              </option>

              <option value="success">
                SUCCESS
              </option>

              <option value="failed">
                FAILED
              </option>

            </select>

          </div>

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

              {displayedLogs.map(log => (

                <tr key={log.id}>

                  <td>

                    {log.timestamp
                      ?.toDate()
                      .toLocaleString()}

                  </td>

                  <td>

                    {log.action}

                  </td>

                  <td>

                    {log.user}

                  </td>

                  <td>

                    <span
                      className={`status-chip ${
                        log.status === "SUCCESS"
                          ? "success"
                          : "failed"
                      }`}
                    >

                      {log.status}

                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <div className="log-pagination">

          <span className="log-showing">

            Showing {displayedLogs.length} of {filteredLogs.length}

          </span>

          <div className="log-pagination-controls">

            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >

              <i className="fa-solid fa-chevron-left"/>

            </button>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >

              <i className="fa-solid fa-chevron-right"/>

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}