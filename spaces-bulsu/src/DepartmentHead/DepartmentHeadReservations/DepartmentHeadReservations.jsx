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

function DepartmentHeadReservations() {
  const [activeTab, setActiveTab] = useState("Pending");
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const filteredReservations = reservations.filter((reservation) => {
    if (activeTab === "Pending")
      return reservation.status === "Pending";

    if (activeTab === "Approved")
      return reservation.status === "Approved";

    if (activeTab === "Denied")
      return reservation.status === "Rejected";

    return true;
  });

  return (
    <div className="dept-reservations">
      <h1>Reservation Requests</h1>

      <div className="dept-white-box-reservations">
        <div className="dept-reservations-nav">
          {["Pending", "Approved", "Denied"].map((tab) => (
            <div
              key={tab}
              className={`dept-reservations-nav-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>
        <hr className="dept-reservations-nav-divider" />

        {activeTab === "Pending" && (
          <>
            {loading ? (
              <p>Loading...</p>
            ) : filteredReservations.length === 0 ? (
              <p style={{ textAlign: "center", padding: "30px" }}>
                No pending reservations.
              </p>
            ) : (
              filteredReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                />
              ))
            )}
            <div className="dept-load-more-reservations">
              <button className="dept-load-more-btn-reservations">Load More</button>
            </div>
          </>
        )}

        {activeTab === "Approved" && (
          <>
          {loading ? (
              <p>Loading...</p>
            ) : filteredReservations.length === 0 ? (
              <p style={{ textAlign: "center", padding: "30px" }}>
                No approved reservations.
              </p>
            ) : (
              filteredReservations.map((reservation) => (
                <ApprovedAndDeniedCard
                  key={reservation.id}
                  reservation={reservation}
                  onClick={() => navigate("/department-head/view-reservation-approved")}
                />
              ))
            )}
            <div className="dept-load-more-reservations">
              <button className="dept-load-more-btn-reservations">Load More</button>
            </div>
          </>
        )}

        {activeTab === "Denied" && (
          <>
          {loading ? (
          <p>Loading...</p>
        ) : filteredReservations.length === 0 ? (
          <p style={{ textAlign: "center", padding: "30px" }}>
            No denied reservations.
          </p>
        ) : (
          filteredReservations.map((reservation) => (
            <ApprovedAndDeniedCard
              key={reservation.id}
              reservation={reservation}
              onClick={() => navigate("/department-head/view-reservation-denied")}
            />
          ))
        )}
    <div className="dept-load-more-reservations">
      <button className="dept-load-more-btn-reservations">Load More</button>
    </div>
  </>
)}
      </div>
    </div>
  );
}

export default DepartmentHeadReservations;