import { useState, useEffect } from "react";
import "../../Components/IssueReportCard/issue-report-card.css";
import "./room-issues.css";
import IssueReportCard from "../../Components/IssueReportCard/IssueReportCard";
import SubmitIssueModal from "../../Components/SubmitIssueModal/SubmitIssueModal";
import ConfirmPopup from "../../Popup/ConfirmPopup/ConfirmPopup";
import Toast from "../../Popup/Toast/Toast";
import { auth, db } from "../../firebase";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  serverTimestamp, getDoc, getDocs,
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";

export default function ClerkRoomIssues() {
  const [issues, setIssues]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [busy, setBusy]           = useState(false);
  const [maintenanceRooms, setMaintenanceRooms] = useState({});

  // Confirm popup
  const [confirmAction, setConfirmAction] = useState(null);
  // { title, message, onConfirm }

  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3500);
  };

  // Load issues
  useEffect(() => {
    const q = query(collection(db, "roomIssues"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  // Load rooms to see which are under maintenance
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "rooms"));
      const map = {};
      snap.docs.forEach(d => {
        const r = d.data();
        if (r.maintenance || r.status === "Under Maintenance") {
          map[d.id] = true;
        }
      });
      setMaintenanceRooms(map);
    };
    load();
  }, [issues]);

  const getCurrentUser = async () => {
    const user = auth.currentUser;
    if (!user) return { uid: "", name: "", role: "" };
    const snap = await getDoc(doc(db, "users", user.uid));
    const d = snap.exists() ? snap.data() : {};
    return {
      uid: user.uid,
      name: `${d.firstName || ""} ${d.lastName || ""}`.trim() || user.email,
      role: d.role || "",
    };
  };

  // ── Actions ──────────────────────────────────────────────
  const acknowledge = (issue) => {
    setConfirmAction({
      title: "Acknowledge Issue?",
      message: `Mark the ${issue.category} issue in ${issue.roomName} as acknowledged?`,
      onConfirm: async () => {
        setBusy(true);
        try {
          const u = await getCurrentUser();
          await updateDoc(doc(db, "roomIssues", issue.id), {
            status: "Acknowledged",
            acknowledgedBy: u.name,
            acknowledgedAt: serverTimestamp(),
          });
          await logActivity({
            user: u.name, role: u.role,
            action: "Acknowledged room issue",
            actionType: "edit",
            target: `${issue.roomName} • ${issue.category}`,
            status: "Success",
          });
          showToast("success", "Acknowledged", "The report has been marked as acknowledged.");
        } catch (err) {
          console.error(err);
          showToast("error", "Failed", err.message);
        } finally { setBusy(false); setConfirmAction(null); }
      },
    });
  };

  const setStatus = (issue, newStatus) => {
    setConfirmAction({
      title: `Mark as ${newStatus}?`,
      message: `Update the ${issue.category} issue in ${issue.roomName} to "${newStatus}"?`,
      onConfirm: async () => {
        setBusy(true);
        try {
          const u = await getCurrentUser();
          const updates = { status: newStatus };
          if (newStatus === "Resolved") {
            updates.resolvedBy = u.name;
            updates.resolvedAt = serverTimestamp();
          }
          await updateDoc(doc(db, "roomIssues", issue.id), updates);
          await logActivity({
            user: u.name, role: u.role,
            action: `Marked issue as ${newStatus}`,
            actionType: "edit",
            target: `${issue.roomName} • ${issue.category}`,
            status: "Success",
          });
          showToast("success", "Status Updated", `Issue is now "${newStatus}".`);
        } catch (err) {
          console.error(err);
          showToast("error", "Update Failed", err.message);
        } finally { setBusy(false); setConfirmAction(null); }
      },
    });
  };

  const markUnderMaintenance = (issue) => {
    setConfirmAction({
      title: "Mark Room Under Maintenance?",
      message: `This will flag ${issue.roomName} as Under Maintenance. Students and faculty will see this room as unavailable.`,
      onConfirm: async () => {
        setBusy(true);
        try {
          const u = await getCurrentUser();
          await updateDoc(doc(db, "rooms", issue.roomId), {
            status: "Under Maintenance",
            maintenance: true,
            maintenanceReason: issue.description,
            maintenanceReportId: issue.id,
            maintenanceCategory: issue.category,
            maintenanceSetBy: u.name,
            maintenanceSetAt: serverTimestamp(),
          });
          await logActivity({
            user: u.name, role: u.role,
            action: "Marked room under maintenance",
            actionType: "edit",
            target: `${issue.roomName} • ${issue.category}`,
            status: "Success",
          });
          showToast("success", "Room Flagged", `${issue.roomName} is now Under Maintenance.`);
        } catch (err) {
          console.error(err);
          showToast("error", "Update Failed", err.message);
        } finally { setBusy(false); setConfirmAction(null); }
      },
    });
  };

  const restoreRoom = (issue) => {
    setConfirmAction({
      title: "Restore Room?",
      message: `Remove the Under Maintenance flag from ${issue.roomName}? The room will become available again.`,
      onConfirm: async () => {
        setBusy(true);
        try {
          const u = await getCurrentUser();
          await updateDoc(doc(db, "rooms", issue.roomId), {
            status: "Available",
            maintenance: false,
            maintenanceReason: "",
            maintenanceReportId: "",
            maintenanceRestoredBy: u.name,
            maintenanceRestoredAt: serverTimestamp(),
          });
          await logActivity({
            user: u.name, role: u.role,
            action: "Restored room from maintenance",
            actionType: "edit",
            target: `${issue.roomName}`,
            status: "Success",
          });
          showToast("success", "Room Restored", `${issue.roomName} is now Available.`);
        } catch (err) {
          console.error(err);
          showToast("error", "Update Failed", err.message);
        } finally { setBusy(false); setConfirmAction(null); }
      },
    });
  };

  // Filters
  const filtered = issues.filter(i => {
    if (activeTab === "pending"     && i.status !== "Pending") return false;
    if (activeTab === "progress"    && i.status !== "In Progress" && i.status !== "Acknowledged") return false;
    if (activeTab === "resolved"    && i.status !== "Resolved") return false;
    if (activeTab === "urgent"      && i.severity !== "Urgent") return false;
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
    pending: issues.filter(i => i.status === "Pending").length,
    progress: issues.filter(i => i.status === "Acknowledged" || i.status === "In Progress").length,
    resolved: issues.filter(i => i.status === "Resolved").length,
    urgent: issues.filter(i => i.severity === "Urgent" && i.status !== "Resolved").length,
  };

  return (
    <>
      <div className="ri-page">
        <div className="ri-header">
          <div>
            <h1>Room Issues</h1>
            <p>Manage and resolve classroom issues reported by faculty and staff.</p>
          </div>
          <button className="ri-report-btn" onClick={() => setShowModal(true)}>
            <i className="fa-solid fa-plus" /> Report Issue
          </button>
        </div>

        <div className="ri-toolbar">
          <div className="ri-tabs ri-tabs-scroll">
            <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>
              All <span className="ri-tab-count">{counts.all}</span>
            </button>
            <button className={activeTab === "pending" ? "active" : ""} onClick={() => setActiveTab("pending")}>
              Pending <span className="ri-tab-count">{counts.pending}</span>
            </button>
            <button className={activeTab === "progress" ? "active" : ""} onClick={() => setActiveTab("progress")}>
              In Progress <span className="ri-tab-count">{counts.progress}</span>
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
            <i className="fa-regular fa-face-smile" />
            <h3>Nothing here</h3>
            <p>No issues match the current filter.</p>
          </div>
        ) : (
          <div className="ri-list">
            {filtered.map(issue => (
              <IssueReportCard
                key={issue.id}
                issue={issue}
                role="clerk"
                busy={busy}
                roomIsUnderMaintenance={!!maintenanceRooms[issue.roomId]}
                onAcknowledge={acknowledge}
                onSetStatus={setStatus}
                onMarkMaintenance={markUnderMaintenance}
                onRestore={restoreRoom}
              />
            ))}
          </div>
        )}
      </div>

      <SubmitIssueModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmitted={() => {}}
      />

      {confirmAction && (
        <ConfirmPopup
          title={confirmAction.title}
          message={confirmAction.message}
          onCancel={() => setConfirmAction(null)}
          onConfirm={busy ? null : confirmAction.onConfirm}
        />
      )}

      <Toast
        show={toast.show} type={toast.type} title={toast.title} message={toast.message}
        onClose={() => setToast(p => ({ ...p, show: false }))}
      />
    </>
  );
}