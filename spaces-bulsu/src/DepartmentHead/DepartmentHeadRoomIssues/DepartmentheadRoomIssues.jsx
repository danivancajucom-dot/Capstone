import { useState, useEffect } from "react";
import "../../Components/IssueReportCard/issue-report-card.css";
import "./room-issues.css";
import IssueReportCard from "../../Components/IssueReportCard/IssueReportCard";
import Toast from "../../Popup/Toast/Toast";
import { auth, db } from "../../firebase";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  serverTimestamp, getDoc,
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";

export default function DepartmentHeadRoomIssues() {
  const [issues, setIssues]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [busy, setBusy]           = useState(false);

  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3500);
  };

  useEffect(() => {
    const q = query(collection(db, "roomIssues"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const acknowledge = async (issue) => {
    setBusy(true);
    try {
      const user = auth.currentUser;
      const snap = await getDoc(doc(db, "users", user.uid));
      const ud = snap.exists() ? snap.data() : {};
      const name = `${ud.firstName || ""} ${ud.lastName || ""}`.trim() || user.email;

      await updateDoc(doc(db, "roomIssues", issue.id), {
        status: "Acknowledged",
        acknowledgedBy: name,
        acknowledgedAt: serverTimestamp(),
      });

      await logActivity({
        user: name, role: ud.role,
        action: "Acknowledged room issue",
        actionType: "edit",
        target: `${issue.roomName} • ${issue.category}`,
        status: "Success",
      });

      showToast("success", "Acknowledged", "The issue has been acknowledged.");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed", err.message);
    } finally { setBusy(false); }
  };

  const filtered = issues.filter(i => {
    if (activeTab === "open"     && i.status === "Resolved") return false;
    if (activeTab === "resolved" && i.status !== "Resolved") return false;
    if (activeTab === "urgent"   && i.severity !== "Urgent") return false;
    if (search) {
      const s = search.toLowerCase();
      return (i.roomName || "").toLowerCase().includes(s)
          || (i.reporterName || "").toLowerCase().includes(s)
          || (i.category || "").toLowerCase().includes(s);
    }
    return true;
  });

  const counts = {
    all: issues.length,
    open: issues.filter(i => i.status !== "Resolved").length,
    resolved: issues.filter(i => i.status === "Resolved").length,
    urgent: issues.filter(i => i.severity === "Urgent" && i.status !== "Resolved").length,
  };

  return (
    <>
      <div className="ri-page">
        <div className="ri-header">
          <div>
            <h1>Room Issue Monitoring</h1>
            <p>Monitor issues reported by faculty and staff across all CICT rooms.</p>
          </div>
        </div>

        <div className="ri-toolbar">
          <div className="ri-tabs ri-tabs-scroll">
            <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>
              All <span className="ri-tab-count">{counts.all}</span>
            </button>
            <button className={activeTab === "open" ? "active" : ""} onClick={() => setActiveTab("open")}>
              Open <span className="ri-tab-count">{counts.open}</span>
            </button>
            <button className={activeTab === "resolved" ? "active" : ""} onClick={() => setActiveTab("resolved")}>
              Resolved <span className="ri-tab-count">{counts.resolved}</span>
            </button>
            <button className={activeTab === "urgent" ? "active" : ""} onClick={() => setActiveTab("urgent")}>
              Urgent <span className="ri-tab-count ri-tab-count-urgent">{counts.urgent}</span>
            </button>
          </div>

          <div className="ri-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search room, reporter, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="ri-empty"><i className="fa-solid fa-circle-notch fa-spin" /><p>Loading issues...</p></div>
        ) : filtered.length === 0 ? (
          <div className="ri-empty">
            <i className="fa-regular fa-clipboard" />
            <h3>No issues found</h3>
            <p>Nothing matches the current filter.</p>
          </div>
        ) : (
          <div className="ri-list">
            {filtered.map(issue => (
              <IssueReportCard
                key={issue.id}
                issue={issue}
                role="admin"
                busy={busy}
                onAcknowledge={acknowledge}
              />
            ))}
          </div>
        )}
      </div>

      <Toast
        show={toast.show} type={toast.type} title={toast.title} message={toast.message}
        onClose={() => setToast(p => ({ ...p, show: false }))}
      />
    </>
  );
}