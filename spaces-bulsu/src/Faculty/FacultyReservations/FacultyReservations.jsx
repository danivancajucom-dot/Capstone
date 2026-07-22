import "./faculty-reservations.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

function FacultyReservations() {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // ── Filter ──────────────────────────────────────────────────────────
  const filteredReservations = reservations.filter((res) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return res.status === "Pending";
    if (activeTab === "approved") return res.status === "Approved";
    if (activeTab === "denied") return res.status === "Rejected";
    return true;
  });

  // ── Render helpers ─────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const map = {
      Pending: { label: "Pending", className: "pending" },
      Approved: { label: "Approved", className: "approved" },
      Rejected: { label: "Denied", className: "denied" },
    };
    return map[status] || { label: status, className: "" };
  };

  const getStatusIcon = (status) => {
    if (status === "Pending") return "fa-regular fa-clock";
    if (status === "Approved") return "fa-regular fa-circle-check";
    if (status === "Rejected") return "fa-regular fa-circle-xmark";
    return "fa-regular fa-circle";
  };

  const getStatusColor = (status) => {
    if (status === "Pending") return "#f59e0b";
    if (status === "Approved") return "#22c55e";
    if (status === "Rejected") return "#ef4444";
    return "#64748b";
  };

  const getViewRoute = (status) => {
    if (status === "Pending") return "/faculty/view-pending-reservation";
    if (status === "Approved") return "/faculty/view-approved-reservation";
    if (status === "Rejected") return "/faculty/view-denied-reservation";
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
        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="faculty-reservations-nav">
          {["all", "pending", "approved", "denied"].map((tab) => (
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
              {activeTab === "all" && "No Reservations Yet"}
              {activeTab === "pending" && "No Pending Reservations"}
              {activeTab === "approved" && "No Approved Reservations"}
              {activeTab === "denied" && "No Denied Reservations"}
            </h2>
            <p>
              {activeTab === "all" &&
                "You haven't submitted any reservation requests yet. Click the button below to reserve a room."}
              {activeTab === "pending" &&
                "There are currently no reservation requests waiting for approval."}
              {activeTab === "approved" &&
                "You don't have any approved reservations yet."}
              {activeTab === "denied" &&
                "You don't have any denied reservation requests."}
            </p>
            {activeTab === "all" && (
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
          <div className="faculty-reservations-list">
            {filteredReservations.map((reservation) => {
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
                  {/* ── Card Header ───────────────────────────── */}
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

                  {/* ── Card Details ───────────────────────────── */}
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

                  {/* ── Card Footer ────────────────────────────── */}
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