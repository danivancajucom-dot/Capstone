import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./department-head-reservations.css";
import ReservationCard from "../../Components/ReservationCard/ReservationCard";
import ApprovedAndDeniedCard from "../../Components/ApprovedAndDeniedCard/ApprovedAndDeniedCard";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../../firebase";
import DenialPopup from "../../Popup/DenialPopup/DenialPopup";

const TABS = ["Pending", "Approved", "Denied"];
const PAGE_SIZE = 8;

// Simple inline icon set (no extra dependency needed)
const EmptyIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="16" rx="2" stroke="#CBD5E1" strokeWidth="1.5" />
    <path d="M3 9H21" stroke="#CBD5E1" strokeWidth="1.5" />
    <path d="M8 3V6" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 3V6" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 13.5L10.5 16L15.5 11" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Full-screen style loading state, shown while Firestore data is loading
function LoadingState() {
  return (
    <div className="room-empty">
      <i className="fa-solid fa-spinner fa-spin"></i>
      <h2>Loading Reservations</h2>
      <p>Please wait while we retrieve the reservation requests.</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="dept-empty-state">
      <EmptyIcon />
      <p className="dept-empty-title">No {label} reservations</p>
      <p className="dept-empty-subtitle">
        Requests will show up here as soon as they come in.
      </p>
    </div>
  );
}

function DepartmentHeadReservations() {
  const [activeTab, setActiveTab] = useState("Pending");
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const q = query(
      collection(db, "reservationRequests"),
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

  // Reset pagination whenever the tab changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  const statusForTab = {
    Pending: "Pending",
    Approved: "Approved",
    Denied: "Rejected",
  };

  // Approved/Denied cards are compact ticket-stubs, so they lay out
  // in a responsive 2-3 column grid. Pending stays a single column
  // since ReservationCard is a wider, denser layout.
  const isGridTab = activeTab !== "Pending";

  const filteredReservations = reservations.filter(
    (reservation) => reservation.status === statusForTab[activeTab]
  );

  const visibleReservations = filteredReservations.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReservations.length;

  const counts = {
    Pending: reservations.filter((r) => r.status === "Pending").length,
    Approved: reservations.filter((r) => r.status === "Approved").length,
    Denied: reservations.filter((r) => r.status === "Rejected").length,
  };

  const renderList = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (filteredReservations.length === 0) {
      return <EmptyState label={activeTab.toLowerCase()} />;
    }

    if (activeTab === "Pending") {
      return visibleReservations.map((reservation) => (
        <ReservationCard key={reservation.id} reservation={reservation} />
      ));
    }

    return visibleReservations.map((reservation) => (
      <ApprovedAndDeniedCard
        key={reservation.id}
        reservation={reservation}
        onClick={() =>
          navigate(
            activeTab === "Approved"
              ? "/department-head/view-reservation-approved"
              : "/department-head/view-reservation-denied",
            { state: { reservation } }
          )
        }
      />
    ));
  };

  const isEmpty = !loading && filteredReservations.length === 0;

  return (
    <div className="dept-reservations">
      <div className="dept-reservations-header">
        <h1>Reservation Requests</h1>
        <p className="dept-reservations-subtitle">
          Review, approve, and track room reservation requests from your department.
        </p>
      </div>

      <div className="dept-white-box-reservations">
        <div className="dept-reservations-nav">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`dept-reservations-nav-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveTab(tab);
              }}
            >
              {tab}
              {!loading && (
                <span className="dept-reservations-nav-count">{counts[tab]}</span>
              )}
            </div>
          ))}
        </div>
        <hr className="dept-reservations-nav-divider" />

        <div
          className={`dept-reservations-content ${
            isGridTab && !loading ? "dept-reservations-content--grid" : ""
          } ${loading || isEmpty ? "dept-reservations-content--empty" : ""}`}
        >
          {renderList()}
        </div>

        {!loading && hasMore && (
          <div className="dept-load-more-reservations">
            <button
              className="dept-load-more-btn-reservations"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DepartmentHeadReservations;