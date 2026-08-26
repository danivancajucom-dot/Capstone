import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./clerk-reservations.css";
import ReservationCard from "../../Components/ReservationCard/ReservationCard";
import ApprovedAndDeniedCard from "../../Components/ApprovedAndDeniedCard/ApprovedAndDeniedCard";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import Toast from "../../Popup/Toast/Toast";

// ─── PDF Libraries & Logos ──────────────────────────────────────────
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import universityLogo from "../../assets/BSU-Logo.png";
import collegeLogo from "../../assets/CICT-Logo.png";

// ─── School Header ──────────────────────────────────────────────────
const SCHOOL_HEADER = {
  universityLogoUrl: universityLogo,
  collegeLogoUrl: collegeLogo,
  universityName: "Bulacan State University",
  collegeName: "College of Information and Communications Technology",
  systemName: "SpaceS CICT",
};

const TABS = ["Pending", "Approved", "Denied", "Cancelled"];
const PAGE_SIZE = 8;

// ─── Helpers ───────────────────────────────────────────────────────────
const normalizeStatus = (status) => status?.toLowerCase().trim() || "";
const normalizeRoom = (name) => name?.toLowerCase().trim().replace(/\s+/g, '') || "";

// ─── Format 12-hour ──────────────────────────────────────────────────
const format12Hour = (time) => {
  if (!time) return "-";
  const [hour, minute] = time.split(":").map(Number);
  if (isNaN(hour) || isNaN(minute)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
};

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

  // ─── Export state ──────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    if (type !== "loading") {
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    }
  };

  // ─── Firestore subscription ────────────────────────────────────────
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
    const name = (r.facultyName || r.requesterName || "").toLowerCase();
    if (trimmedSearch && !name.includes(trimmedSearch)) return false;

    const roomNameNormalized = normalizeRoom(r.roomName);
    const filterRoomNormalized = normalizeRoom(filterRoom);
    if (filterRoom && roomNameNormalized !== filterRoomNormalized) return false;

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

  // ─── Counts for tabs ──────────────────────────────────────────────────
  const counts = {
    Pending: reservations.filter((r) => normalizeStatus(r.status) === "pending").length,
    Approved: reservations.filter((r) => normalizeStatus(r.status) === "approved").length,
    Denied: reservations.filter((r) => normalizeStatus(r.status) === "rejected").length,
    Cancelled: reservations.filter((r) => normalizeStatus(r.status) === "cancelled").length,
  };

  // ─── Unique room names for filter dropdown ──────────────────────────
  const roomMap = new Map();
  reservations.forEach((r) => {
    const original = (r.roomName || "").trim();
    if (!original) return;
    const normalized = normalizeRoom(original);
    if (!roomMap.has(normalized)) {
      roomMap.set(normalized, original);
    }
  });
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

  // ─── EXPORT FUNCTIONS ──────────────────────────────────────────────

  // ── CSV Export ──
  const exportCSV = () => {
    if (sorted.length === 0) {
      showToast("error", "Nothing to Export", "No reservations match your filters.");
      return;
    }

    showToast("loading", "Preparing CSV...", "Please wait.");

    try {
      const headers = [
        "Faculty/Requester",
        "Room",
        "Date",
        "Start Time",
        "End Time",
        "Purpose",
        "Status",
        "Organization",
        "Section",
      ];

      const rows = sorted.map((r) => [
        r.facultyName || r.requesterName || "-",
        r.roomName || "-",
        r.date || "-",
        r.startTime ? format12Hour(r.startTime) : "-",
        r.endTime ? format12Hour(r.endTime) : "-",
        r.customPurpose || r.purpose || r.courseTitle || "-",
        r.status || "-",
        r.organizationName || r.attendees?.organization || "-",
        r.yearSectionGroup || r.attendees?.yearSectionGroup || "-",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reservations-${activeTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("success", "CSV Downloaded", `${sorted.length} reservations exported.`);
    } catch (err) {
      console.error("CSV export failed:", err);
      showToast("error", "Export Failed", "Could not generate CSV.");
    }
    setExportMenuOpen(false);
  };

  // ── PDF Export ──
  const exportPDF = () => {
    if (sorted.length === 0) {
      showToast("error", "Nothing to Export", "No reservations match your filters.");
      return;
    }

    showToast("loading", "Generating PDF...", "Please wait.");

    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 40;
      const logoSize = 40;
      const centerX = pageWidth / 2;

      // ── Letterhead ──
      if (SCHOOL_HEADER.universityLogoUrl) {
        pdf.addImage(SCHOOL_HEADER.universityLogoUrl, "PNG", marginX, 20, logoSize, logoSize);
      }
      if (SCHOOL_HEADER.collegeLogoUrl) {
        pdf.addImage(
          SCHOOL_HEADER.collegeLogoUrl,
          "PNG",
          pageWidth - marginX - logoSize,
          20,
          logoSize,
          logoSize
        );
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(20, 27, 45);
      pdf.text(SCHOOL_HEADER.universityName, centerX, 34, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text(SCHOOL_HEADER.collegeName, centerX, 48, { align: "center" });
      pdf.text(SCHOOL_HEADER.systemName, centerX, 58, { align: "center" });

      pdf.setDrawColor(245, 124, 0);
      pdf.setLineWidth(1.5);
      pdf.line(marginX, 74, pageWidth - marginX, 74);

      // ── Title & Filters ──
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(245, 124, 0);
      pdf.text(`Reservation Report — ${activeTab}`, marginX, 98);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      let filterSummary = "";
      if (searchTerm) filterSummary += `Faculty: ${searchTerm} | `;
      if (filterRoom) {
        const roomName = roomOptions.find(o => o.normalized === filterRoom)?.original || filterRoom;
        filterSummary += `Room: ${roomName} | `;
      }
      if (filterDate) filterSummary += `Date: ${filterDate} | `;
      if (!filterSummary) filterSummary = "All reservations";
      pdf.text(`Filters: ${filterSummary}`, marginX, 112);
      pdf.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - marginX,
        112,
        { align: "right" }
      );

      // ── Table ──
      const tableRows = sorted.map((r) => [
        r.facultyName || r.requesterName || "-",
        r.roomName || "-",
        r.date || "-",
        r.startTime ? format12Hour(r.startTime) : "-",
        r.endTime ? format12Hour(r.endTime) : "-",
        r.customPurpose || r.purpose || r.courseTitle || "-",
        r.status || "-",
        r.organizationName || r.attendees?.organization || "-",
        r.yearSectionGroup || r.attendees?.yearSectionGroup || "-",
      ]);

      autoTable(pdf, {
        startY: 130,
        head: [["Faculty", "Room", "Date", "Start", "End", "Purpose", "Status", "Organization", "Section"]],
        body: tableRows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 7, cellPadding: 4, valign: "middle" },
        headStyles: {
          fillColor: [245, 124, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
        },
        bodyStyles: { textColor: [26, 26, 26] },
        alternateRowStyles: { fillColor: [253, 246, 240] },
        margin: { left: marginX, right: marginX },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 45 },
          2: { cellWidth: 50 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 60 },
          6: { cellWidth: 35 },
          7: { cellWidth: 50 },
          8: { cellWidth: 45 },
        },
      });

      // ── Footer ──
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - marginX,
          pdf.internal.pageSize.getHeight() - 16,
          { align: "right" }
        );
        pdf.text(
          `${SCHOOL_HEADER.systemName} — Confidential`,
          marginX,
          pdf.internal.pageSize.getHeight() - 16
        );
      }

      pdf.save(`reservations-${activeTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);

      showToast("success", "PDF Downloaded", `${sorted.length} reservations exported.`);
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("error", "Export Failed", "Could not generate PDF.");
    }
    setExportMenuOpen(false);
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
        <div className="clerk-reservations-header-top">
          <div>
            <h1>Reservation Requests</h1>
            <p className="clerk-reservations-subtitle">
              Review, approve, and track room reservation requests from your department.
            </p>
          </div>

          {/* ── Export Dropdown ── */}
          <div className="clerk-export-dropdown">
            <button
              className="clerk-export-btn"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={loading || sorted.length === 0}
            >
              <i className="fa-solid fa-download"></i> Export Report
              <i className={`fa-solid fa-chevron-down ${exportMenuOpen ? "rotate" : ""}`}></i>
            </button>
            {exportMenuOpen && (
              <div className="clerk-export-menu">
                <button onClick={exportPDF}>
                  <i className="fa-regular fa-file-pdf"></i> Export as PDF
                </button>
                <button onClick={exportCSV}>
                  <i className="fa-solid fa-file-csv"></i> Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
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

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}

export default ClerkReservations;