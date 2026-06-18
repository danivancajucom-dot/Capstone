import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./department-head-layout.css";
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
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function DepartmentHeadLayout() {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
    try {
      await updateDoc(
        doc(db, "notifications", id),
        {
          unread: false,
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const archiveNotification = async (id) => {
  try {
    await updateDoc(
      doc(db, "notifications", id),
      {
        archived: true,
      }
    );
  } catch (err) {
    console.error(err);
  }
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

  const handleLogout = async () => {
  try {
    setShowLogoutConfirm(false);
    setLoggingOut(true);

    setTimeout(async () => {
      await signOut(auth);
      navigate("/login");
    }, 2000);

  } catch (error) {
    console.error(error);
    setLoggingOut(false);
  }
};

  return (
    <>
      <div className="dept-layout">

        {/* SIDEBAR */}
        <aside className="dept-sidebar">

          <div className="dept-logo">
            <h2>SpaceS</h2>
            <span>Department Head</span>
          </div>

          <nav className="dept-nav">

            <NavLink end to="/department-head">
              <i className="fa-solid fa-house"></i>
              Dashboard
            </NavLink>

            <NavLink to="/department-head/conflicts">
              <i className="fa-solid fa-triangle-exclamation"></i>
              Conflicts
            </NavLink>

            <NavLink to="/department-head/reservations">
              <i className="fa-solid fa-bookmark"></i>
              Reservations
            </NavLink>

            <NavLink to="/department-head/schedule">
              <i className="fa-solid fa-calendar-days"></i>
              Schedule
            </NavLink>

            <NavLink to="/department-head/room-management">
              <i className="fa-solid fa-building"></i>
              Room Management
            </NavLink>

            <NavLink to="/department-head/room-activity">
              <i className="fa-solid fa-chart-line"></i>
              Room Activity
            </NavLink>

            <NavLink to="/department-head/user-management">
              <i className="fa-solid fa-users"></i>
              User Management
            </NavLink>

            <NavLink to="/department-head/notification-management">
              <i className="fa-solid fa-bell"></i>
              Notifications
            </NavLink>

            <NavLink to="/department-head/broadcast-channel">
              <i className="fa-solid fa-bell"></i>
              Announcement Channel
            </NavLink>

          </nav>

        </aside>

        {/* MAIN */}
        <div className="dept-main">

          <header className="dept-header">

            <div className="header-search">
              <i className="fa-solid fa-magnifying-glass"></i>

              <input
                type="text"
                placeholder="Search users, rooms, schedules..."
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
                  <span className="notif-count">
                    {notifications.filter(n => n.unread).length}
                  </span>
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

          <main className="dept-content">
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

              {filteredNotifications.map((item) => (
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
                    <div className="notif-actions">

                    {!item.archived && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveNotification(item.id);
                        }}
                      >
                        Archive
                      </button>
                     )}
                  </div>
                  </div>
                </div>
              ))}
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
                onClick={handleLogout}
              >
                Confirm
              </button>

            </div>

          </div>

        </div>
      )}

      {loggingOut && (
        <div className="login-loading-screen">
          <div className="loading-card">
            <div className="spinner" />
            <h2>Signing you out...</h2>
            <p>Please wait while we securely end your session</p>
          </div>
        </div>
      )}
    </>
  );
}