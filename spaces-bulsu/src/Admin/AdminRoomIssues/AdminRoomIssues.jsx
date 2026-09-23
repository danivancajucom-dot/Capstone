import { useState, useEffect, useMemo } from "react";
import "../../Components/IssueReportCard/issue-report-card.css";
import "./room-issues.css";
import IssueReportCard from "../../Components/IssueReportCard/IssueReportCard";
import Toast from "../../Popup/Toast/Toast";
import { auth, db } from "../../firebase";
import {
  collection, query, orderBy, onSnapshot, getDocs,
  doc, updateDoc, serverTimestamp, getDoc, addDoc,
} from "firebase/firestore";
import { logActivity } from "../../utils/logActivity";

const ITEMS_PER_PAGE = 6;

const SORT_OPTIONS = [
  { key: "newest",   label: "Newest First" },
  { key: "oldest",   label: "Oldest First" },
  { key: "severity", label: "Severity (High → Low)" },
];

const SEVERITY_ORDER = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

// ══════════════════════════════════════════════════════════════
// Inline Confirm Modal — may built-in loading state
// ══════════════════════════════════════════════════════════════
function ConfirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loadingText = "Processing…",
  variant = "primary", // primary | warning | danger | success
  icon = "fa-solid fa-circle-question",
  loading = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div
      className="ri-cm-overlay"
      role="dialog"
      aria-modal="true"
      onClick={() => !loading && onCancel?.()}
    >
      <div
        className={`ri-cm-card ri-cm-${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ri-cm-icon">
          <i className={icon} />
        </div>

        <h3 className="ri-cm-title">{title}</h3>
        {message && <p className="ri-cm-message">{message}</p>}

        <div className="ri-cm-actions">
          <button
            type="button"
            className="ri-cm-btn ri-cm-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className="ri-cm-btn ri-cm-btn-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ri-cm-spinner" />
                <span>{loadingText}</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRoomIssues() {
  const [issues, setIssues]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState("all");
  const [search, setSearch]             = useState("");
  const [roomFilter, setRoomFilter]     = useState("");
  const [sortOrder, setSortOrder]       = useState("newest");
  const [currentPage, setCurrentPage]   = useState(1);
  const [maintenanceRooms, setMaintenanceRooms] = useState({});
  const [busy, setBusy]                 = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Room picker popover state ──────────────────────────────
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");

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

  // ── Notify all clerks ─────────────────────────────────────
  const notifyAllClerks = async (title, message, issue) => {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const jobs = [];
      usersSnap.forEach((d) => {
        const role = (d.data().role || "").toLowerCase().trim();
        if (role === "clerk") {
          jobs.push(
            addDoc(collection(db, "notifications"), {
              userId: d.id,
              ownerType: "clerk",
              issueId: issue.id,
              roomId: issue.roomId,
              roomName: issue.roomName,
              title,
              message,
              type: "issue-update",
              unread: true,
              archived: false,
              badge: "NEW",
              createdAt: serverTimestamp(),
            })
          );
        }
      });
      if (jobs.length) await Promise.all(jobs);
    } catch (err) {
      console.warn("notifyAllClerks failed:", err);
    }
  };

  // ── Notify the faculty reporter ───────────────────────────
  const notifyReporter = async (issue, title, message, badge = "INFO") => {
    if (!issue?.reporterId) return;
    try {
      await addDoc(collection(db, "notifications"), {
        userId: issue.reporterId,
        ownerType: "faculty",
        title,
        message,
        type: "issue-update",
        issueId: issue.id,
        roomName: issue.roomName,
        unread: true,
        archived: false,
        badge,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("notifyReporter failed:", err);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ACKNOWLEDGE — may confirm modal + loading state
  // ══════════════════════════════════════════════════════════════
  const acknowledge = (issue) => {
    if (busy) return;

    setConfirmAction({
      title: "Acknowledge Issue?",
      message: `Acknowledge the ${issue.severity || ""} ${issue.category || "room"} issue in ${issue.roomName}? This will forward it to the Clerk and notify all clerks.`,
      confirmText: "Acknowledge",
      loadingText: "Acknowledging…",
      variant: "primary",
      icon: "fa-solid fa-circle-check",
      onConfirm: async () => {
        setAcknowledgingId(issue.id);
        setBusy(true);
        try {
          const u = await getCurrentUser();

          await updateDoc(doc(db, "roomIssues", issue.id), {
            status: "Acknowledged",
            acknowledgedBy: u.name,
            acknowledgedAt: serverTimestamp(),
          });

          await logActivity({
            user: u.name,
            role: u.role,
            action: "Acknowledged room issue",
            actionType: "edit",
            target: `${issue.roomName} • ${issue.category || ""}`,
            status: "Success",
          });

          await notifyReporter(
            issue,
            "Issue Acknowledged",
            `Your reported issue in ${issue.roomName} (${issue.category || "issue"}) has been acknowledged and forwarded to the Clerk for action.`,
            "INFO"
          );

          await notifyAllClerks(
            "New Acknowledged Issue",
            `${u.name} acknowledged a ${issue.severity || ""} ${issue.category || "room"} issue in ${issue.roomName}. Please review and take action.`,
            issue
          );

          showToast(
            "success",
            "Acknowledged",
            `${issue.roomName} issue forwarded to Clerk. Reporter notified.`
          );
        } catch (err) {
          console.error(err);
          showToast("error", "Failed", err.message || "Could not acknowledge issue.");
        } finally {
          setBusy(false);
          setAcknowledgingId(null);
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
      acknowledged: issues.filter((i) => i.status === "Acknowledged").length,
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

  const filteredRoomOptions = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    if (!q) return roomOptions;
    return roomOptions.filter((r) => r.toLowerCase().includes(q));
  }, [roomOptions, roomSearch]);

  // ── Filter + sort ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...issues];

    if (activeTab === "pending") list = list.filter((i) => i.status === "Pending");
    if (activeTab === "acknowledged") list = list.filter((i) => i.status === "Acknowledged");
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

  return (
    <>
      <div className="ri-page">
        <div className="ri-header">
          <div>
            <h1>Room Issue Monitoring</h1>
            <p>Acknowledge issues reported by faculty and staff. Acknowledged issues are forwarded to the Clerk for action.</p>
          </div>
        </div>

        {/* TABS */}
        <div className="ri-tabs ri-tabs-scroll">
          <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>
            All <span className="ri-tab-count">{counts.all}</span>
          </button>
          <button className={activeTab === "pending" ? "active" : ""} onClick={() => setActiveTab("pending")}>
            Pending <span className="ri-tab-count">{counts.pending}</span>
          </button>
          <button className={activeTab === "acknowledged" ? "active" : ""} onClick={() => setActiveTab("acknowledged")}>
            Acknowledged <span className="ri-tab-count">{counts.acknowledged}</span>
          </button>
          <button className={activeTab === "resolved" ? "active" : ""} onClick={() => setActiveTab("resolved")}>
            Resolved <span className="ri-tab-count">{counts.resolved}</span>
          </button>
          <button className={activeTab === "urgent" ? "active" : ""} onClick={() => setActiveTab("urgent")}>
            Urgent <span className="ri-tab-count ri-tab-count-urgent">{counts.urgent}</span>
          </button>
        </div>

        {/* TOOLBAR */}
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
              <button className="ri-search-clear" onClick={() => setSearch("")} aria-label="Clear">
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          <div className="ri-filters">
            {/* ── ROOM PICKER ── */}
            <div className="ri-roompicker">
              <button
                type="button"
                className={`ri-room-trigger ${showRoomPicker ? "open" : ""}`}
                onClick={() => {
                  setRoomSearch("");
                  setShowRoomPicker((v) => !v);
                }}
              >
                <i className="fa-solid fa-door-open"></i>
                <span className="ri-room-trigger-text">
                  {roomFilter || "All Rooms"}
                </span>
                <i
                  className={`fa-solid fa-chevron-down ri-room-caret ${
                    showRoomPicker ? "open" : ""
                  }`}
                ></i>
              </button>

              {showRoomPicker && (
                <>
                  <div
                    className="ri-room-clickaway"
                    onClick={() => setShowRoomPicker(false)}
                  ></div>
                  <div className="ri-room-popover">
                    <span className="ri-room-popover-arrow"></span>

                    <div className="ri-room-search-wrap">
                      <i className="fa-solid fa-magnifying-glass"></i>
                      <input
                        type="text"
                        className="ri-room-search"
                        placeholder="Search room..."
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        autoFocus
                      />
                      {roomSearch && (
                        <button
                          type="button"
                          className="ri-room-search-clear"
                          onClick={() => setRoomSearch("")}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>

                    <div className="ri-room-list">
                      <button
                        type="button"
                        className={`ri-room-option ${!roomFilter ? "is-active" : ""}`}
                        onClick={() => {
                          setRoomFilter("");
                          setShowRoomPicker(false);
                          setRoomSearch("");
                        }}
                      >
                        <div className="ri-room-option-icon">
                          <i className="fa-solid fa-layer-group"></i>
                        </div>
                        <span className="ri-room-option-name">All Rooms</span>
                        {!roomFilter && (
                          <i className="fa-solid fa-circle-check ri-room-option-check"></i>
                        )}
                      </button>

                      {filteredRoomOptions.length === 0 && roomSearch ? (
                        <div className="ri-room-empty">
                          <i className="fa-regular fa-face-frown"></i>
                          <span>No rooms match.</span>
                        </div>
                      ) : (
                        filteredRoomOptions.map((r) => {
                          const isActive = r === roomFilter;
                          return (
                            <button
                              type="button"
                              key={r}
                              className={`ri-room-option ${isActive ? "is-active" : ""}`}
                              onClick={() => {
                                setRoomFilter(r);
                                setShowRoomPicker(false);
                                setRoomSearch("");
                              }}
                            >
                              <div className="ri-room-option-icon">
                                <i className="fa-solid fa-door-open"></i>
                              </div>
                              <span className="ri-room-option-name">{r}</span>
                              {isActive && (
                                <i className="fa-solid fa-circle-check ri-room-option-check"></i>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── SORT ── */}
            <div className="ri-select">
              <i className="fa-solid fa-arrow-down-short-wide" />
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                {SORT_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
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
            <i className="fa-regular fa-clipboard" />
            <h3>No issues found</h3>
            <p>Nothing matches the current filter.</p>
          </div>
        ) : (
          <div className="ri-list">
            {paginated.map((issue) => (
              <IssueReportCard
                key={issue.id}
                issue={issue}
                role="admin"
                busy={busy}
                acknowledging={acknowledgingId === issue.id}
                roomIsUnderMaintenance={!!maintenanceRooms[issue.roomId]}
                onAcknowledge={acknowledge}
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

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          loadingText={confirmAction.loadingText}
          variant={confirmAction.variant}
          icon={confirmAction.icon}
          loading={busy}
          onCancel={() => !busy && setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
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