import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./faculty-layout.css";
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function FacultyLayout() {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeNotif = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(data);
    });

    return () => unsubscribeNotif();
  });

  return () => unsubscribeAuth();
}, []);

const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const now = new Date();
  const date = timestamp.toDate();

  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return `${Math.floor(diff / 86400)}d ago`;
};

const markAsRead = async (id) => {
  await updateDoc(doc(db, "notifications", id), {
    unread: false,
  });
};

const archiveNotification = async (id) => {
  await updateDoc(doc(db, "notifications", id), {
    archived: true,
  });
};

const filteredNotifications = notifications.filter((item) => {
  if (activeTab === "unread") {
    return item.unread && !item.archived;
  }

  if (activeTab === "archived") {
    return item.archived;
  }

  return !item.archived;
});

  return (
    <>
      <div className="faculty-layout">

        {/* SIDEBAR */}
        <aside className="faculty-sidebar">

          <div className="faculty-logo">
            <h2>SpaceS</h2>
            <span>Faculty Portal</span>
          </div>

          <nav className="faculty-nav">

            <NavLink end to="/faculty">
              <i className="fa-solid fa-house"></i>
              Dashboard
            </NavLink>

            <NavLink to="/faculty/schedule">
              <i className="fa-solid fa-calendar-days"></i>
              Schedule
            </NavLink>

            <NavLink to="/faculty/rooms">
              <i className="fa-solid fa-building"></i>
              Rooms
            </NavLink>

            <NavLink to="/faculty/reservations">
              <i className="fa-solid fa-bookmark"></i>
              Reservations
            </NavLink>

            <NavLink to="/faculty/profile">
              <i className="fa-solid fa-user"></i>
              Profile
            </NavLink>

          </nav>

        </aside>

        {/* MAIN */}
        <div className="faculty-main">

          <header className="faculty-header">

            <div className="header-search">

              <i className="fa-solid fa-magnifying-glass"></i>

              <input
                type="text"
                placeholder="Search rooms or users..."
              />

            </div>

            <div className="header-actions">

              <div className="notification-container">
                <button
                  className="header-btn"
                  onClick={() => setShowNotifications(true)}
                >
                  <i
                    className={`fa-bell ${
                      notifications.some((n) => n.unread)
                        ? "fa-solid bell-active"
                        : "fa-regular"
                    }`}
                  ></i>

                  {notifications.filter((n) => n.unread).length > 0 && (
                    <span className="notif-count">
                      {notifications.filter((n) => n.unread).length}
                    </span>
                  )}
                </button>
              </div>

              <button
                className="header-btn"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>

            </div>

          </header>

          <main className="faculty-content">
            <Outlet />
          </main>

        </div>

      </div>

      {showNotifications && (
        <>
          <div
            className="notif-overlay"
            onClick={() => setShowNotifications(false)}
          ></div>

          <div className="notif-drawer">

            <div className="notif-top">
              <h2>Notifications</h2>

              <button
                className="notif-close"
                onClick={() => setShowNotifications(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="notif-tabs">

              <button
                className={activeTab === "all" ? "active" : ""}
                onClick={() => setActiveTab("all")}
              >
                All
              </button>

              <button
                className={activeTab === "unread" ? "active" : ""}
                onClick={() => setActiveTab("unread")}
              >
                Unread
              </button>

              <button
                className={activeTab === "archived" ? "active" : ""}
                onClick={() => setActiveTab("archived")}
              >
                Archived
              </button>

            </div>

            <div className="notif-list">

              {filteredNotifications.length === 0 ? (
                <div className="empty-notifications">
                  No notifications found.
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    className={`notif-card ${item.type}`}
                    onClick={() => markAsRead(item.id)}
                  >

                    <div className="notif-icon">

                      {item.type === "schedule" && (
                        <i className="fa-regular fa-calendar"></i>
                      )}

                      {item.type === "urgent" && (
                        <i className="fa-solid fa-exclamation"></i>
                      )}

                      {item.type === "approved" && (
                        <i className="fa-solid fa-check"></i>
                      )}

                    </div>

                    <div className="notif-body">

                      <div className="notif-title-row">

                        <h4>{item.title}</h4>

                        {item.badge && (
                          <span className="notif-badge">
                            {item.badge}
                          </span>
                        )}

                      </div>

                      <p>{item.message}</p>

                      <span className="notif-time">
                        {formatTime(item.createdAt)}
                      </span>

                      {!item.archived && (
                        <div className="notif-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveNotification(item.id);
                            }}
                          >
                            Archive
                          </button>
                        </div>
                      )}

                    </div>

                  </div>
                ))
              )}

            </div>

          </div>
        </>
      )}

      {showLogoutConfirm && (
        <div className="modal-overlay">

          <div className="logout-modal">

            <div className="modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h2>
              Are you sure you want to log out?
            </h2>

            <div className="modal-actions">

              <button
                className="modal-btn cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="modal-btn confirm"
                onClick={() => navigate("/login")}
              >
                Confirm
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}