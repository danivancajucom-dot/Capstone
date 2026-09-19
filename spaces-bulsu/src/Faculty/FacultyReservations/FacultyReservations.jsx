import "./faculty-reservations.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

// ─── Helper: normalize status case-insensitively ──────────────────────
const normalizeStatus = (status) => status?.toLowerCase().trim() || "";

const ITEMS_PER_PAGE = 5;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest to Oldest", icon: "fa-solid fa-arrow-down-long" },
  { value: "oldest", label: "Oldest to Newest", icon: "fa-solid fa-arrow-up-long" },
];

function FacultyReservations() {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Search + Filter ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // ─── Load More ────────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "reservationRequests"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReservations(list);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Close the filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset visible items whenever tab, search or sort changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeTab, searchTerm, sortOrder]);

  // ── Filter (status tab + search) ─────────────────────────────────
  const filteredReservations = reservations
    .filter((res) => {
      const status = normalizeStatus(res.status);

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "pending" && status === "pending") ||
        (activeTab === "approved" && status === "approved") ||
        (activeTab === "denied" && status === "rejected") ||
        (activeTab === "cancelled" && status === "cancelled");

      if (!matchesTab) return false;

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const searchableFields = [
        res.roomName,
        res.courseTitle,
        res.purpose,
        res.date,
        res.facultyName,
      ];

      return searchableFields.some((field) =>
        String(field || "").toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

  // ── Visible slice for load-more ──────────────────────────────────
  const visibleReservations = filteredReservations.slice(0, visibleCount);
  const hasMore = filteredReservations.length > visibleCount;
  const remainingCount = filteredReservations.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortOrder)?.label || "Sort";

  // ── Render helpers ─────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const map = {
      Pending: { label: "Pending", className: "pending" },
      Approved: { label: "Approved", className: "approved" },
      Rejected: { label: "Denied", className: "denied" },
      Cancelled: { label: "Cancelled", className: "cancelled" },
    };
    return map[status] || { label: status, className: "" };
  };

  const getStatusIcon = (status) => {
    if (status === "Pending") return "fa-regular fa-clock";
    if (status === "Approved") return "fa-regular fa-circle-check";
    if (status === "Rejected") return "fa-regular fa-circle-xmark";
    if (status === "Cancelled") return "fa-solid fa-ban";
    return "fa-regular fa-circle";
  };

  const getStatusColor = (status) => {
    if (status === "Pending") return "#f59e0b";
    if (status === "Approved") return "#22c55e";
    if (status === "Rejected") return "#ef4444";
    if (status === "Cancelled") return "#6b7280";
    return "#64748b";
  };

  const getViewRoute = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === "pending") return "/faculty/view-pending-reservation";
    if (normalized === "approved") return "/faculty/view-approved-reservation";
    if (normalized === "rejected") return "/faculty/view-denied-reservation";
    if (normalized === "cancelled") return "/faculty/view-cancelled-reservation";
    return "/faculty/view-reservation";
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="faculty-reservations-page">
      <div className="faculty-reservations-header">
        <h1>My Reservations</h1>
        <p className="faculty-reservations-subtitle">
          View and track all your room reservation requests.
        </p>
      </div>

      <div className="faculty-reservations-box">
        

        {/* ── Search + Filter ───────────────────────────────────── */}
        <div className="faculty-reservations-toolbar">
          <div className="faculty-search-container">
            <i className="fa-solid fa-magnifying-glass faculty-search-icon"></i>
            <input
              type="text"
              className="faculty-search-input"
              placeholder="Search your reservations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="faculty-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="faculty-filter-wrap" ref={filterRef}>
            <button
              type="button"
              className={`faculty-filter-btn ${filterOpen ? "open" : ""}`}
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="Filter and sort"
            >
              <i className="fa-solid fa-sliders"></i>
              <span>Filter</span>
              <i className="fa-solid fa-chevron-down faculty-filter-caret"></i>
            </button>

            {filterOpen && (
              <div className="faculty-filter-menu" role="menu">
                <div className="faculty-filter-menu-head">
                  <i className="fa-solid fa-arrow-down-wide-short"></i>
                  <span>Sort by</span>
                </div>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitem"
                    className={`faculty-filter-option ${
                      sortOrder === opt.value ? "active" : ""
                    }`}
                    onClick={() => {
                      setSortOrder(opt.value);
                      setFilterOpen(false);
                    }}
                  >
                    <i className={opt.icon}></i>
                    <span>{opt.label}</span>
                    {sortOrder === opt.value && (
                      <i className="fa-solid fa-check faculty-filter-check"></i>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="faculty-reservations-nav">
          {["all", "pending", "approved", "denied", "cancelled"].map((tab) => (
            <div
              key={tab}
              className={`faculty-nav-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveTab(tab);
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>

      

        <hr className="faculty-reservations-divider" />

        {/* ── Content ────────────────────────────────────────────── */}
        {loading ? (
          <div className="faculty-empty-state">
            <div className="faculty-empty-icon loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
            <h2>Loading Reservations</h2>
            <p>Please wait while we retrieve your reservation requests.</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="faculty-empty-state">
            <div className="faculty-empty-icon">
              <i className="fa-regular fa-calendar-xmark"></i>
            </div>
            <h2>
              {searchTerm
                ? "No Matching Reservations"
                : activeTab === "all"
                ? "No Reservations Yet"
                : activeTab === "pending"
                ? "No Pending Reservations"
                : activeTab === "approved"
                ? "No Approved Reservations"
                : activeTab === "denied"
                ? "No Denied Reservations"
                : "No Cancelled Reservations"}
            </h2>
            <p>
              {searchTerm
                ? "Try a different keyword or clear your search."
                : activeTab === "all"
                ? "You haven't submitted any reservation requests yet. Click the button below to reserve a room."
                : activeTab === "pending"
                ? "There are currently no reservation requests waiting for approval."
                : activeTab === "approved"
                ? "You don't have any approved reservations yet."
                : activeTab === "denied"
                ? "You don't have any denied reservation requests."
                : "You don't have any cancelled reservations."}
            </p>
            {activeTab === "all" && !searchTerm && (
              <button
                className="faculty-empty-btn"
                onClick={() => navigate("/faculty/submit-reservation")}
              >
                <i className="fa-solid fa-plus"></i>
                Create Reservation
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="faculty-reservations-list">
              {visibleReservations.map((reservation) => {
                const statusInfo = getStatusBadge(reservation.status);
                const statusIcon = getStatusIcon(reservation.status);
                const statusColor = getStatusColor(reservation.status);
                const viewRoute = getViewRoute(reservation.status);

                return (
                  <div
                    key={reservation.id}
                    className={`faculty-reservation-card ${statusInfo.className}`}
                    onClick={() =>
                      navigate(viewRoute, { state: { reservation } })
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigate(viewRoute, { state: { reservation } });
                      }
                    }}
                  >
                    <div className="faculty-res-card-header">
                      <div className="faculty-res-card-user">
                        <div className="faculty-res-avatar">
                          {reservation.facultyName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <span className="faculty-res-name">
                            {reservation.facultyName || "Unknown Faculty"}
                          </span>
                          <span className="faculty-res-room">
                            {reservation.roomName}
                          </span>
                        </div>
                      </div>
                      <div
                        className="faculty-res-status-badge"
                        style={{ backgroundColor: statusColor }}
                      >
                        <i className={statusIcon}></i>
                        {statusInfo.label}
                      </div>
                    </div>

                    <div className="faculty-res-card-body">
                      <div className="faculty-res-detail-row">
                        <i className="fa-regular fa-calendar"></i>
                        <span>{reservation.date}</span>
                      </div>
                      <div className="faculty-res-detail-row">
                        <i className="fa-regular fa-clock"></i>
                        <span>
                          {reservation.startTime} – {reservation.endTime}
                        </span>
                      </div>
                      <div className="faculty-res-detail-row">
                        <i className="fa-solid fa-book"></i>
                        <span>{reservation.courseTitle || "N/A"}</span>
                      </div>
                      {reservation.purpose && (
                        <div className="faculty-res-detail-row">
                          <i className="fa-solid fa-tag"></i>
                          <span>{reservation.purpose}</span>
                        </div>
                      )}
                    </div>

                    <div className="faculty-res-card-footer">
                      <span className="faculty-res-view-indicator">
                        View Details
                        <i className="fa-solid fa-chevron-right"></i>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Load More ─────────────────────────────────────── */}
            {hasMore ? (
              <div className="faculty-load-more-wrap">
                <button
                  className="faculty-load-more-btn"
                  onClick={handleLoadMore}
                >
                  <i className="fa-solid fa-arrow-down"></i>
                  Load More
                  <span className="faculty-load-more-count">
                    {remainingCount} remaining
                  </span>
                </button>
              </div>
            ) : (
              filteredReservations.length > ITEMS_PER_PAGE && (
                <div className="faculty-load-more-wrap">
                  <span className="faculty-end-hint">
                    <i className="fa-solid fa-check"></i>
                    You've reached the end — {filteredReservations.length} total
                  </span>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* ── Floating Add Button ───────────────────────────────── */}
      <button
        className="faculty-add-btn"
        onClick={() => navigate("/faculty/submit-reservation")}
      >
        <i className="fa-solid fa-plus"></i>
      </button>
    </div>
  );
}

export default FacultyReservations;