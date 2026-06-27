import "./faculty-reservations.css";
import FacultyPendingReservationCard from "../../Components/FacultyPendingReservationCard/FacultyPendingReservationCard";
import FacultyApprovedReservationCard from "../../Components/FacultyApprovedReservationCard/FacultyApprovedReservationCard";
import FacultyDeniedReservationCard from "../../Components/FacultyDeniedReservationCard/FacultyDeniedReservationCard";
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
  const [activeNav, setActiveNav] = useState("all");
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
  if (activeNav === "all") return true;

  if (activeNav === "pending")
    return reservation.status === "Pending";

  if (activeNav === "approved")
    return reservation.status === "Approved";

  if (activeNav === "denied")
    return reservation.status === "Rejected";

  return true;
});

  return (
    <>
    <div className="container">

      <div className="faculty-reservations-box">
        <div className="faculty-reservations-nav">
          <div
            className={`faculty-nav-item ${activeNav === "all" ? "active" : ""}`}
            onClick={() => setActiveNav("all")}
          >All</div>
          <div
            className={`faculty-nav-item ${activeNav === "pending" ? "active" : ""}`}
            onClick={() => setActiveNav("pending")}
          >Pending</div>
          <div
            className={`faculty-nav-item ${activeNav === "approved" ? "active" : ""}`}
            onClick={() => setActiveNav("approved")}
          >Approved</div>
          <div
            className={`faculty-nav-item ${activeNav === "denied" ? "active" : ""}`}
            onClick={() => setActiveNav("denied")}
          >Denied</div>
        </div>
        {loading ? (

          <div className="faculty-empty-state">

            <div className="faculty-empty-icon loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>

            <h2>Loading Reservations</h2>

            <p>
              Please wait while we retrieve your reservation requests.
            </p>

          </div>

        ) : filteredReservations.length === 0 ? (

          <div className="faculty-empty-state">

            <div className="faculty-empty-icon">
              <i className="fa-regular fa-calendar-xmark"></i>
            </div>

            <h2>
              {activeNav === "all" && "No Reservations Yet"}
              {activeNav === "pending" && "No Pending Reservations"}
              {activeNav === "approved" && "No Approved Reservations"}
              {activeNav === "denied" && "No Denied Reservations"}
            </h2>

            <p>
              {activeNav === "all" &&
                "You haven't submitted any reservation requests yet. Click the button below to reserve a room."}

              {activeNav === "pending" &&
                "There are currently no reservation requests waiting for approval."}

              {activeNav === "approved" &&
                "You don't have any approved reservations yet."}

              {activeNav === "denied" &&
                "You don't have any denied reservation requests."}
            </p>

            {activeNav === "all" && (
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

          filteredReservations.map((reservation) => {
            switch (reservation.status) {
              case "Pending":
                return (
                  <FacultyPendingReservationCard
                    key={reservation.id}
                    reservation={reservation}
                  />
                );

              case "Approved":
                return (
                  <FacultyApprovedReservationCard
                    key={reservation.id}
                    reservation={reservation}
                  />
                );

              case "Rejected":
                return (
                  <FacultyDeniedReservationCard
                    key={reservation.id}
                    reservation={reservation}
                  />
                );

              default:
                return null;
            }
          })

        )}

      </div>


      <button className="faculty-add-btn" onClick={() => navigate("/faculty/submit-reservation")}>
  <i className="fa-solid fa-plus"></i>
</button>
    </div>
    </>

  );
}

export default FacultyReservations;