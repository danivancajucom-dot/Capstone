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
  getDoc,
  writeBatch,           // ← added for markAllAsRead
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import NotificationCard from "../../Components/NotificationCard/Notification";

export default function FacultyLayout() {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", role: "", photoUrl: "" });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      // load profile
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const d = userSnap.data();
        setProfile({
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          role: d.role || "",
          photoUrl: d.photoUrl || "",
        });
      }

      // notifications – only for faculty
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("ownerType", "==", "faculty"),
        where("archived", "==", false),
        orderBy("createdAt", "desc")
      );

      const unsubscribeNotif = onSnapshot(q, (snapshot) => {
        setNotifications(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      });

      return unsubscribeNotif;
    });

    return () => unsubscribeAuth();
  }, []);

  // ── Notification helpers ────────────────────────────────────────────────

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
      await updateDoc(doc(db, "notifications", id), { unread: false });
    } catch (err) {
      console.error(err);
    }
  };

  const archiveNotification = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { archived: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => n.unread && !n.archived);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) =>
        batch.update(doc(db, "notifications", n.id), { unread: false })
      );
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread && !n.archived).length;
  const archivedCount = notifications.filter((n) => n.archived).length;
  const allCount = notifications.filter((n) => !n.archived).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "unread") return item.unread && !item.archived;
    if (activeTab === "archived") return item.archived;
    return !item.archived;
  });

  const emptyCopy = {
    all: {
      icon: "fa-bell-slash",
      title: "Wala pang abiso",
      text: "Dito lalabas ang mga update tungkol sa schedules, reservations, at conflicts.",
    },
    unread: {
      icon: "fa-check-double",
      title: "Up to date ka na!",
      text: "Nabasa mo na lahat ng notification.",
    },
    archived: {
      icon: "fa-box-open",
      title: "Walang naka-archive",
      text: "Ang mga na-archive mong abiso ay makikita rito.",
    },
  }[activeTab];

  const typeIcon = {
    schedule: "fa-regular fa-calendar",
    urgent: "fa-solid fa-exclamation",
    approved: "fa-solid fa-check",
  };

  // ── Logout ──────────────────────────────────────────────────────────────

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

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="faculty-layout">

        {/* SIDEBAR */}
        <aside className="faculty-sidebar">

          <div className="faculty-logo">
            <img src="/SpaceSLogo.png" alt="SpaceS Logo" className="faculty-logo-img" />
            <div className="faculty-logo-text">
              <h2>SpaceS</h2>
              <span>CICT Faculty</span>
            </div>
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

            <NavLink to="/faculty/broadcast-channel">
              <i className="fa-solid fa-bell"></i>
              Announcement Channel
            </NavLink>
          </nav>

          {/* PROFILE CARD — bottom of sidebar */}
          <NavLink to="/faculty/profile" className="sidebar-profile">
            <div className="sidebar-avatar">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" />
              ) : (
                <span>{initials || <i className="fa-solid fa-user" />}</span>
              )}
            </div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{fullName || "My Profile"}</span>
              <span className="sidebar-profile-role">{profile.role}</span>
            </div>
          </NavLink>

        </aside>

        {/* MAIN */}
        <div className="faculty-main">

          <header className="faculty-header">
            <div className="header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search rooms or users..." />
            </div>

            <div className="header-actions">
              {/* NOTIFICATION TRIGGER */}
              <div className="notification-container">
                <button
                  className={`header-btn ${showNotifications ? "notif-btn-open" : ""}`}
                  onClick={() => setShowNotifications((v) => !v)}
                >
                  <i
                    className={`fa-bell ${
                      unreadCount > 0 ? "fa-solid bell-active" : "fa-regular"
                    }`}
                  ></i>
                  {unreadCount > 0 && (
                    <span className="notif-count">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* NOTIFICATIONS PANEL */}
                {showNotifications && (
                  <>
                    <div className="notif-clickaway" onClick={() => setShowNotifications(false)}></div>
                    <div className="notif-panel">
                      <span className="notif-panel-arrow"></span>

                      <div className="notif-top">
                        <div className="notif-top-title">
                          <h2>Notifications</h2>
                          {unreadCount > 0 && (
                            <span className="notif-top-badge">{unreadCount} new</span>
                          )}
                        </div>
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
                          All <span className="notif-tab-count">{allCount}</span>
                        </button>
                        <button
                          className={activeTab === "unread" ? "active" : ""}
                          onClick={() => setActiveTab("unread")}
                        >
                          Unread <span className="notif-tab-count">{unreadCount}</span>
                        </button>
                        <button
                          className={activeTab === "archived" ? "active" : ""}
                          onClick={() => setActiveTab("archived")}
                        >
                          Archived <span className="notif-tab-count">{archivedCount}</span>
                        </button>
                      </div>

                      {activeTab === "unread" && unreadCount > 0 && (
                        <div className="notif-mark-all-row">
                          <button className="notif-mark-all" onClick={markAllAsRead}>
                            <i className="fa-solid fa-check-double"></i> Mark all as read
                          </button>
                        </div>
                      )}

                      <div className="notif-list">
                        {filteredNotifications.length === 0 ? (
                          <div className="notif-empty">
                            <div className="notif-empty-icon">
                              <i className={`fa-solid ${emptyCopy.icon}`}></i>
                            </div>
                            <h4>{emptyCopy.title}</h4>
                            <p>{emptyCopy.text}</p>
                          </div>
                        ) : (
                          filteredNotifications.map((item, i) => (
                            <div key={item.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                              <NotificationCard
                                icon={typeIcon[item.type] || "fa-solid fa-bell"}
                                title={item.title}
                                message={item.message}
                                time={formatTime(item.createdAt)}
                                badge={item.badge}
                                type={item.type}
                                unread={item.unread}
                                archived={item.archived}
                                onClick={() => markAsRead(item.id)}
                                onArchive={() => archiveNotification(item.id)}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* LOGOUT BUTTON */}
              <button
                className="header-btn logout"
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

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="logout-modal">
            <div className="modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2>Are you sure you want to log out?</h2>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="modal-btn confirm" onClick={handleLogout}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT LOADING */}
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