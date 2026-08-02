import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./clerk-reservations.css";
import ReservationCard from "../../Components/ReservationCard/ReservationCard";
import ApprovedAndDeniedCard from "../../Components/ApprovedAndDeniedCard/ApprovedAndDeniedCard";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

const TABS = ["Pending", "Approved", "Denied", "Cancelled"];
const PAGE_SIZE = 8;

// ─── Helpers ───────────────────────────────────────────────────────────
const normalizeStatus = (status) => status?.toLowerCase().trim() || "";
const normalizeRoom = (name) => name?.toLowerCase().trim().replace(/\s+/g, '') || "";

// ─── Empty icon (SVG) ──────────────────────────────────────────────────
const EmptyIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="16" rx="2" stroke="#CBD5E1" strokeWidth="1.5" />
    <path d="M3 9H21" stroke="#CBD5E1" strokeWidth="1.5" />
    <path d="M8 3V6" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 3V6" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 13.5L10.5 16L15.5 11" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Skeleton card placeholder ────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="clerk-skeleton-card">
      <div className="clerk-skeleton-line clerk-skeleton-title" />
      <div className="clerk-skeleton-line clerk-skeleton-subtitle" />
      <div className="clerk-skeleton-row">
        <div className="clerk-skeleton-pill" />
        <div className="clerk-skeleton-pill" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────
function EmptyState({ label }) {
  return (
    <div className="clerk-empty-state">
      <EmptyIcon />
      <p className="clerk-empty-title">No {label} reservations</p>
      <p className="clerk-empty-subtitle">
        Requests will show up here as soon as they come in.
      </p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────
function ClerkReservations() {
  const [activeTab, setActiveTab] = useState("Pending");
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ─── Filter/sort state ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const q = query(collection(db, "reservationRequests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  // ─── Status mapping ──────────────────────────────────────────────────
  const statusMap = {
    Pending: "pending",
    Approved: "approved",
    Denied: "rejected",
    Cancelled: "cancelled",
  };

  // ─── Step 1: Filter by tab (status) ─────────────────────────────────
  const tabFiltered = reservations.filter(
    (r) => normalizeStatus(r.status) === statusMap[activeTab]
  );

  // ─── Step 2: Apply search, room, date filters ──────────────────────
  const trimmedSearch = searchTerm.trim().toLowerCase();

  const filtered = tabFiltered.filter((r) => {
    // Search by faculty/requester name
    const name = (r.facultyName || r.requesterName || "").toLowerCase();
    if (trimmedSearch && !name.includes(trimmedSearch)) return false;

    // Room filter – normalize both sides
    const roomNameNormalized = normalizeRoom(r.roomName);
    const filterRoomNormalized = normalizeRoom(filterRoom);
    if (filterRoom && roomNameNormalized !== filterRoomNormalized) return false;

    // Date filter
    if (filterDate && r.date !== filterDate) return false;

    return true;
  });

  // ─── Step 3: Sort ──────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case "date":
        aVal = a.date || "";
        bVal = b.date || "";
        break;
      case "room":
        aVal = normalizeRoom(a.roomName);
        bVal = normalizeRoom(b.roomName);
        break;
      case "faculty":
        aVal = (a.facultyName || a.requesterName || "").toLowerCase();
        bVal = (b.facultyName || b.requesterName || "").toLowerCase();
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // ─── Step 4: Paginate ──────────────────────────────────────────────
  const visibleReservations = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  // ─── Counts for tabs (unfiltered) ──────────────────────────────────
  const counts = {
    Pending: reservations.filter((r) => normalizeStatus(r.status) === "pending").length,
    Approved: reservations.filter((r) => normalizeStatus(r.status) === "approved").length,
    Denied: reservations.filter((r) => normalizeStatus(r.status) === "rejected").length,
    Cancelled: reservations.filter((r) => normalizeStatus(r.status) === "cancelled").length,
  };

  // ─── Unique room names for filter dropdown (normalized, display original) ──
  const roomMap = new Map();
  reservations.forEach((r) => {
    const original = (r.roomName || "").trim();
    if (!original) return;
    const normalized = normalizeRoom(original);
    if (!roomMap.has(normalized)) {
      roomMap.set(normalized, original);
    }
  });
  // Convert to array of { original, normalized } for the dropdown
  const roomOptions = Array.from(roomMap.entries()).map(([normalized, original]) => ({
    normalized,
    original,
  }));

  // ─── Clear all filters ──────────────────────────────────────────────
  const clearFilters = () => {
    setSearchTerm("");
    setFilterRoom("");
    setFilterDate("");
    setSortBy("date");
    setSortOrder("desc");
  };

  // ─── Render list ────────────────────────────────────────────────────
  const renderList = () => {
    if (loading) {
      return Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />);
    }

    if (sorted.length === 0) {
      return <EmptyState label={activeTab.toLowerCase()} />;
    }

    if (activeTab === "Pending") {
      return visibleReservations.map((reservation) => (
        <ReservationCard
          key={reservation.id}
          reservation={reservation}
          basePath="/clerk/view-online-reservation"
        />
      ));
    }

    let viewPath;
    if (activeTab === "Approved") {
      viewPath = "/clerk/view-reservation-approved";
    } else if (activeTab === "Denied") {
      viewPath = "/clerk/view-reservation-denied";
    } else {
      viewPath = "/clerk/view-reservation-cancelled";
    }

    return visibleReservations.map((reservation) => (
      <ApprovedAndDeniedCard
        key={reservation.id}
        reservation={reservation}
        onClick={() => navigate(viewPath, { state: { reservation } })}
      />
    ));
  };

  const isGridTab = activeTab !== "Pending";
  const isEmpty = !loading && sorted.length === 0;

  return (
    <div className="clerk-reservations">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="clerk-reservations-header">
        <h1>Reservation Requests</h1>
        <p className="clerk-reservations-subtitle">
          Review, approve, and track room reservation requests from your department.
        </p>
      </div>

      {/* ─── Filter Bar (outside white box) ──────────────────── */}
      <div className="clerk-filter-bar-outer">
        <div className="clerk-filter-row">
          <div className="clerk-filter-group">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search by faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="clerk-filter-input"
            />
          </div>

          <div className="clerk-filter-group">
            <i className="fa-solid fa-building"></i>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="clerk-filter-select"
            >
              <option value="">All Rooms</option>
              {roomOptions.map(({ normalized, original }) => (
                <option key={normalized} value={normalized}>
                  {original}
                </option>
              ))}
            </select>
          </div>

          <div className="clerk-filter-group">
            <i className="fa-regular fa-calendar"></i>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="clerk-filter-input"
            />
          </div>

          <div className="clerk-filter-group clerk-sort-group">
            <i className="fa-solid fa-arrow-up-wide-short"></i>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="clerk-filter-select"
            >
              <option value="date">Sort by Date</option>
              <option value="room">Sort by Room</option>
              <option value="faculty">Sort by Faculty</option>
            </select>
            <button
              className="clerk-sort-order-btn"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              <i className={`fa-solid fa-arrow-${sortOrder === "asc" ? "up" : "down"}`}></i>
            </button>
          </div>

          <button className="clerk-clear-filters-btn" onClick={clearFilters}>
            <i className="fa-solid fa-rotate-left"></i> Clear
          </button>
        </div>

        {/* Active filters summary */}
        {(searchTerm || filterRoom || filterDate) && (
          <div className="clerk-filter-summary">
            <span>Active filters:</span>
            {searchTerm && <span className="clerk-filter-tag">Faculty: {searchTerm}</span>}
            {filterRoom && (
              <span className="clerk-filter-tag">
                Room: {roomOptions.find(o => o.normalized === filterRoom)?.original || filterRoom}
              </span>
            )}
            {filterDate && <span className="clerk-filter-tag">Date: {filterDate}</span>}
            <span className="clerk-filter-result-count">
              {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ─── White box with tabs + content ────────────────────── */}
      <div className="clerk-white-box-reservations">
        <div className="clerk-reservations-nav">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`clerk-reservations-nav-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveTab(tab);
              }}
            >
              {tab}
              {!loading && <span className="clerk-reservations-nav-count">{counts[tab]}</span>}
            </div>
          ))}
        </div>
        <hr className="clerk-reservations-nav-divider" />

        <div
          className={`clerk-reservations-content ${
            isGridTab ? "clerk-reservations-content--grid" : ""
          } ${isEmpty ? "clerk-reservations-content--empty" : ""}`}
        >
          {renderList()}
        </div>

        {!loading && hasMore && (
          <div className="clerk-load-more-reservations">
            <button
              className="clerk-load-more-btn-reservations"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load More ({sorted.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClerkReservations;