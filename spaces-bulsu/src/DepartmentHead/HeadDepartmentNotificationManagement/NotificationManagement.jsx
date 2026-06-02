import { useState } from "react";
import "./notification-management.css";
import DepartmentHeadNav from "../../Components/DepartmentHeadNav/DepartmentHeadNav";

const PLACEHOLDER_NOTIFICATIONS = [
  { id: 1, content: "Maintenance Alert: Room SDL3",      group: "All Staff", status: "Requested", readDate: "--",  sentDate: "Today, 10:24AM",      reads: null, unread: null },
  { id: 2, content: "End of Semester Grading Deadline",  group: "Faculty",   status: "Requested", readDate: "--",  sentDate: "Today, 10:00AM",      reads: null, unread: null },
  { id: 3, content: "Automated: Room Conflict Alert",    group: "All Staff", status: "Delivered", readDate: null,  sentDate: "Yesterday, 1:00PM",   reads: 70,   unread: 30  },
  { id: 4, content: "End of Semester Grading Deadline",  group: "Faculty",   status: "Delivered", readDate: null,  sentDate: "Yesterday, 12:01PM",  reads: 68,   unread: 32  },
  { id: 5, content: "Automated: Room Conflict Alert",    group: "All Staff", status: "Delivered", readDate: null,  sentDate: "Yesterday, 7:17AM",   reads: 92,   unread: 8   },
];

export default function NotificationManagement() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [message, setMessage]           = useState("");
  const [recipient, setRecipient]       = useState("All Staff");

  const filters = ["All", "Sent", "Drafts"];

  const filtered = PLACEHOLDER_NOTIFICATIONS.filter(n => {
    if (activeFilter === "Sent")   return n.status === "Delivered";
    if (activeFilter === "Drafts") return n.status === "Draft";
    return true;
  });

  return (
    <>
      <DepartmentHeadNav activePage="notification-management" />
    <div className="nm-page">

      <div className="nm-header">
        <div>
          <h1 className="nm-title">Notification Management</h1>
          <p className="nm-subtitle">Designated workspace for university-wide alerts and professor communication.</p>
        </div>
        <button className="nm-export-btn">
          <i className="fa-solid fa-download" />
          Export Logs
        </button>
      </div>

      <div className="nm-compose-card">
        <div className="nm-compose-header">
          <div className="nm-compose-title">
            <i className="fa-solid fa-pen-to-square" />
            New Announcement
          </div>
          <span className="nm-internal-badge">INTERNAL ONLY</span>
        </div>

        <div className="nm-compose-body">
          <div className="nm-avatar">
            <i className="fa-regular fa-user" />
          </div>
          <textarea
            className="nm-textarea"
            placeholder="Compose a message for the university staff or faculty..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className="nm-compose-footer">
          <div className="nm-compose-tools">
            <button className="nm-tool-btn"><i className="fa-regular fa-image" /></button>
            <button className="nm-tool-btn"><i className="fa-solid fa-paperclip" /></button>
            <button className="nm-tool-btn"><i className="fa-regular fa-calendar" /></button>
            <select
              className="nm-recipient-select"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
            >
              <option>All Staff</option>
              <option>Faculty</option>
              <option>Registrar</option>
              <option>Admin</option>
            </select>
          </div>
          <div className="nm-compose-actions">
            <button className="nm-discard-btn" onClick={() => setMessage("")}>Discard</button>
            <button className="nm-send-btn">
              <i className="fa-solid fa-paper-plane" />
              Send Now
            </button>
          </div>
        </div>
      </div>

      <div className="nm-history-section">
        <div className="nm-history-header">
          <h2 className="nm-history-title">Recent History</h2>
          <div className="nm-filters">
            {filters.map(f => (
              <button
                key={f}
                className={`nm-filter-btn ${activeFilter === f ? "active" : ""}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <table className="nm-table">
          <thead>
            <tr>
              <th>ANNOUNCEMENT CONTENT</th>
              <th>RECIPIENT GROUP</th>
              <th>STATUS</th>
              <th>READ DATE</th>
              <th>SENT DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id}>
                <td className="nm-content-cell">{row.content}</td>
                <td>
                  <span className="nm-group-badge">{row.group}</span>
                </td>
                <td>
                  <span className={`nm-status ${row.status.toLowerCase()}`}>
                    <span className="nm-status-dot" />
                    {row.status}
                  </span>
                </td>
                <td>
                  {row.reads !== null ? (
                    <div className="nm-read-stats">
                      <div className="nm-read-row">
                        <span className="nm-reads">{row.reads}</span>
                        <span className="nm-unread">{row.unread}</span>
                      </div>
                      <div className="nm-read-labels">
                        <span>Reads</span>
                        <span>Unread</span>
                      </div>
                      <div className="nm-read-bar">
                        <div
                          className="nm-read-fill"
                          style={{ width: `${(row.reads / (row.reads + row.unread)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="nm-dash">--</span>
                  )}
                </td>
                <td className="nm-sent-date">{row.sentDate}</td>
                <td>
                  <button className="nm-action-btn">⋮</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="nm-table-footer">
          <span className="nm-count">Showing 1-5 of 42 notifications</span>
          <div className="nm-pagination">
            <button className="nm-page-btn"><i className="fa-solid fa-chevron-left" /></button>
            <button className="nm-page-btn"><i className="fa-solid fa-chevron-right" /></button>
          </div>
        </div>
      </div>
    </div>
    </>

  );
}