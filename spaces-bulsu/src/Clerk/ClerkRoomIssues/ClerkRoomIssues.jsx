import { useState, useEffect, useMemo } from "react";
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

const ITEMS_PER_PAGE = 6;

const SORT_OPTIONS = [
  { key: "newest",   label: "Newest First" },
  { key: "oldest",   label: "Oldest First" },
  { key: "severity", label: "Severity (High → Low)" },
];

const SEVERITY_ORDER = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

export default function ClerkRoomIssues() {
  const [issues, setIssues]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [activeTab, setActiveTab]       = useState("all");
  const [search, setSearch]             = useState("");
  const [roomFilter, setRoomFilter]     = useState("");
  const [sortOrder, setSortOrder]       = useState("newest");
  const [currentPage, setCurrentPage]   = useState(1);
  const [busy, setBusy]                 = useState(false);
  const [maintenanceRooms, setMaintenanceRooms] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);

  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3500);
  };

  // ── Load issues ────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "roomIssues"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIssues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Load which rooms are under maintenance ─────────────────
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "rooms"));
      const map = {};
      snap.docs.forEach((d) => {
        const r = d.data();
        if (
          r.maintenance ||
          r.status === "Under Maintenance" ||
          r.roomStatus === "maintenance"
        ) {
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

  // ── Actions ────────────────────────────────────────────────
  const markUnderMaintenance = (issue) => {
    setConfirmAction({
      title: "Mark Room Under Maintenance?",
      message: `This will flag ${issue.roomName} as Under Maintenance. Faculty and students will see this room as unavailable.`,
      onConfirm: async () => {
        setBusy(true);
        try {
          const u = await getCurrentUser();
          await updateDoc(doc(db, "rooms", issue.roomId), {
            status: "Under Maintenance",
            roomStatus: "maintenance",
            maintenance: true,
            maintenanceReason: issue.description || "",
            maintenanceReportId: issue.id,
            maintenanceCategory: issue.category || "",
            maintenanceSetBy: u.name,
            maintenanceSetAt: serverTimestamp(),
          });
          await logActivity({
            user: u.name, role: u.role,
            action: "Marked room under maintenance",
            actionType: "edit",
            target: `${issue.roomName} • ${issue.category || ""}`,
            status: "Success",
          });
          showToast("success", "Room Flagged", `${issue.roomName} is now Under Maintenance.`);
        } catch (err) {
          console.error(err);
          showToast("error", "Update Failed", err.message);
        } finally {
          setBusy(false);
          setConfirmAction(null);
        }
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
            roomStatus: "active",
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
        } finally {
          setBusy(false);
          setConfirmAction(null);
        }
      },
    });
  };

  const markResolved = (issue) => {
    setConfirmAction({
      title: "Mark as Resolved?",
      message: `Mark the ${issue.category} issue in ${issue.roomName} as Resolved?`,
      onConfirm: async () => {
        setBusy(true);
        try {
          const u = await getCurrentUser();
          await updateDoc(doc(db, "roomIssues", issue.id), {
            status: "Resolved",
            resolvedBy: u.name,
            resolvedAt: serverTimestamp(),
          });
          await logActivity({
            user: u.name, role: u.role,
            action: "Marked issue as Resolved",
            actionType: "edit",
            target: `${issue.roomName} • ${issue.category || ""}`,
            status: "Success",
          });
          showToast("success", "Resolved", "Issue marked as resolved.");
        } catch (err) {
          console.error(err);
          showToast("error", "Failed", err.message);
        } finally {
          setBusy(false);
          setConfirmAction(null);
        }
      },
    });
  };

  // ── Counts ─────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all: issues.length,
      pending: issues.filter((i) => i.status === "Pending").length,
      progress: issues.filter(
        (i) => i.status === "Acknowledged" || i.status === "In Progress"
      ).length,
      resolved: issues.filter((i) => i.status === "Resolved").length,
      urgent: issues.filter((i) => i.severity === "Urgent" && i.status !== "Resolved").length,
    }),
    [issues]
  );

  // ── Unique rooms ───────────────────────────────────────────
  const roomOptions = useMemo(() => {
    const set = new Set();
    issues.forEach((i) => {
      if (i.roomName) set.add(i.roomName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [issues]);

  // ── Filter + sort ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...issues];

    if (activeTab === "pending") list = list.filter((i) => i.status === "Pending");
    if (activeTab === "progress")
      list = list.filter((i) => i.status === "In Progress" || i.status === "Acknowledged");
    if (activeTab === "resolved") list = list.filter((i) => i.status === "Resolved");
    if (activeTab === "urgent")
      list = list.filter((i) => i.severity === "Urgent" && i.status !== "Resolved");

    if (roomFilter) list = list.filter((i) => i.roomName === roomFilter);

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.roomName || "").toLowerCase().includes(s) ||
          (i.reporterName || "").toLowerCase().includes(s) ||
          (i.category || "").toLowerCase().includes(s) ||
          (i.description || "").toLowerCase().includes(s)
      );
    }

    if (sortOrder === "newest") {
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } else if (sortOrder === "oldest") {
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    } else if (sortOrder === "severity") {
      list.sort(
        (a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0)
      );
    }

    return list;
  }, [issues, activeTab, roomFilter, search, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, roomFilter, search, sortOrder]);

  // ── Pagination ─────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const hasActiveFilters = search || roomFilter || sortOrder !== "newest";
  const clearAllFilters = () => {
    setSearch("");
    setRoomFilter("");
    setSortOrder("newest");
  };

  // ── Render ─────────────────────────────────────────────────
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

        {/* TABS */}
        <div className="ri-tabs ri-tabs-scroll">
          <button
            className={activeTab === "all" ? "active" : ""}
            onClick={() => setActiveTab("all")}
          >
            All <span className="ri-tab-count">{counts.all}</span>
          </button>
          <button
            className={activeTab === "pending" ? "active" : ""}
            onClick={() => setActiveTab("pending")}
          >
            Pending <span className="ri-tab-count">{counts.pending}</span>
          </button>
          <button
            className={activeTab === "progress" ? "active" : ""}
            onClick={() => setActiveTab("progress")}
          >
            In Progress <span className="ri-tab-count">{counts.progress}</span>
          </button>
          <button
            className={activeTab === "resolved" ? "active" : ""}
            onClick={() => setActiveTab("resolved")}
          >
            Resolved <span className="ri-tab-count">{counts.resolved}</span>
          </button>
          <button
            className={activeTab === "urgent" ? "active" : ""}
            onClick={() => setActiveTab("urgent")}
          >
            Urgent{" "}
            <span className="ri-tab-count ri-tab-count-urgent">{counts.urgent}</span>
          </button>
        </div>

        {/* TOOLBAR: Search + Room + Sort */}
        <div className="ri-toolbar">
          <div className="ri-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search room, reporter, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="ri-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          <div className="ri-filters">
            <div className="ri-select">
              <i className="fa-solid fa-door-open" />
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
              >
                <option value="">All Rooms</option>
                {roomOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-angle-down ri-select-chev" />
            </div>

            <div className="ri-select">
              <i className="fa-solid fa-arrow-down-short-wide" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-angle-down ri-select-chev" />
            </div>

            {hasActiveFilters && (
              <button className="ri-clear-all" onClick={clearAllFilters}>
                <i className="fa-solid fa-filter-circle-xmark" /> Clear
              </button>
            )}
          </div>

          <span className="ri-result-count">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="ri-empty">
            <i className="fa-solid fa-circle-notch fa-spin" />
            <p>Loading issues...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="ri-empty">
            <i className="fa-regular fa-face-smile" />
            <h3>Nothing here</h3>
            <p>No issues match the current filter.</p>
          </div>
        ) : (
          <div className="ri-list">
            {paginated.map((issue) => (
              <IssueReportCard
                key={issue.id}
                issue={issue}
                role="clerk"
                busy={busy}
                roomIsUnderMaintenance={!!maintenanceRooms[issue.roomId]}
                onMarkMaintenance={markUnderMaintenance}
                onRestore={restoreRoom}
                onMarkResolved={markResolved}
              />
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="ri-pagination">
            <span className="ri-page-info">
              Showing {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="ri-page-controls">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={safePage === p ? "active" : ""}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
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
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((p) => ({ ...p, show: false }))}
      />
    </>
  );
}