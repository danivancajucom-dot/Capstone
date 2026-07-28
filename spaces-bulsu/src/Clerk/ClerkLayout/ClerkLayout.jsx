import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./clerk-layout.css";
import { auth, db } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import NotificationCard from "../../Components/NotificationCard/Notification";

export default function ClerkLayout() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [openReservations, setOpenReservations] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", role: "", photoUrl: "" });

  //  Notification state 
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      // load profile
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            firstName: d.firstName || "",
            lastName: d.lastName || "",
            role: d.role || "",
            photoUrl: d.photoUrl || "",
          });
        }
      });

      //  Notifications listener (clerk) 
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("ownerType", "==", "clerk"),
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

  // Notification helpers 

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
      title: "No notifications",
      text: "Updates about schedules, reservations, and conflicts will appear here.",
    },
    unread: {
      icon: "fa-check-double",
      title: "All caught up!",
      text: "You've read all your notifications.",
    },
    archived: {
      icon: "fa-box-open",
      title: "No archived notifications",
      text: "Archived notifications will appear here.",
    },
  }[activeTab];

  const typeIcon = {
    schedule: "fa-regular fa-calendar",
    urgent: "fa-solid fa-exclamation",
    approved: "fa-solid fa-check",
  };

  // Logout 

  const handleLogout = async () => {
    try {
      setShowLogout(false);
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

  return (
    <>
      <div className="clerk-layout">

        {/* SIDEBAR */}
        <aside className="clerk-sidebar">

          <div className="clerk-logo">
            <img src="/SpaceSLogo.png" alt="SpaceS Logo" className="clerk-logo-img" />
            <div className="clerk-logo-text">
              <h2>SpaceS</h2>
              <span>Clerk Panel</span>
            </div>
          </div>

          <nav className="clerk-nav">
            <NavLink
              end
              to="/clerk"
              className={({ isActive }) => (isActive ? "clerk-active" : "")}
            >
              <i className="fa-solid fa-house"></i>
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/clerk/schedule-view-academic-schedule"
              className={({ isActive }) => (isActive ? "clerk-active" : "")}
            >
              <i className="fa-solid fa-calendar"></i>
              <span>Schedule</span>
            </NavLink>

            {/* RESERVATIONS DROPDOWN */}
            <div className="clerk-nav-group">
              <button
                className="clerk-nav-parent"
                onClick={() => setOpenReservations(!openReservations)}
              >
                <i className="fa-solid fa-bookmark"></i>
                <span>Reservations</span>
                <i className={`fa-solid fa-chevron-down clerk-arrow ${openReservations ? "clerk-open" : ""}`}></i>
              </button>

              <div className={`clerk-submenu ${openReservations ? "clerk-open" : ""}`}>
                <NavLink
                  to="/clerk/online-reservations"
                  className={({ isActive }) => (isActive ? "clerk-active" : "")}
                >
                  Online Reservations
                </NavLink>
                <NavLink
                  to="/clerk/walk-in-reservation"
                  className={({ isActive }) => (isActive ? "clerk-active" : "")}
                >
                  Walk-in Reservations
                </NavLink>
              </div>
            </div>

            <NavLink
              to="/clerk/broadcast-channel"
              className={({ isActive }) => (isActive ? "clerk-active" : "")}
            >
              <i className="fa-solid fa-bullhorn"></i>
              <span>Announcement Channel</span>
            </NavLink>

          </nav>

          {/* PROFILE CARD — bottom of sidebar */}
          <NavLink
            to="/clerk/profile"
            className={({ isActive }) => `clerk-sidebar-profile ${isActive ? "clerk-active" : ""}`}
          >
            <div className="clerk-sidebar-avatar">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" />
              ) : (
                <span>{initials || <i className="fa-solid fa-user" />}</span>
              )}
            </div>
            <div className="clerk-sidebar-profile-info">
              <span className="clerk-sidebar-profile-name">{fullName || "My Profile"}</span>
              <span className="clerk-sidebar-profile-role">{profile.role}</span>
            </div>
          </NavLink>

        </aside>

        {/* MAIN */}
        <div className="clerk-main">

          <header className="clerk-header">
            <div className="clerk-header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search..." />
            </div>

            <div className="clerk-header-actions">
              {/* NOTIFICATION TRIGGER  */}
              <div className="clerk-notification-container">
                <button
                  className={`clerk-header-btn ${showNotifications ? "clerk-notif-btn-open" : ""}`}
                  onClick={() => setShowNotifications((v) => !v)}
                >
                  <i
                    className={`fa-bell ${
                      unreadCount > 0 ? "fa-solid clerk-bell-active" : "fa-regular"
                    }`}
                  ></i>
                  {unreadCount > 0 && (
                    <span className="clerk-notif-count">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* NOTIFICATIONS PANEL */}
                {showNotifications && (
                  <>
                    <div className="clerk-notif-clickaway" onClick={() => setShowNotifications(false)}></div>
                    <div className="clerk-notif-panel">
                      <span className="clerk-notif-panel-arrow"></span>

                      <div className="clerk-notif-top">
                        <div className="clerk-notif-top-title">
                          <h2>Notifications</h2>
                          {unreadCount > 0 && (
                            <span className="clerk-notif-top-badge">{unreadCount} new</span>
                          )}
                        </div>
                        <button
                          className="clerk-notif-close"
                          onClick={() => setShowNotifications(false)}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>

                      <div className="clerk-notif-tabs">
                        <button
                          className={activeTab === "all" ? "clerk-active" : ""}
                          onClick={() => setActiveTab("all")}
                        >
                          All <span className="clerk-notif-tab-count">{allCount}</span>
                        </button>
                        <button
                          className={activeTab === "unread" ? "clerk-active" : ""}
                          onClick={() => setActiveTab("unread")}
                        >
                          Unread <span className="clerk-notif-tab-count">{unreadCount}</span>
                        </button>
                        <button
                          className={activeTab === "archived" ? "clerk-active" : ""}
                          onClick={() => setActiveTab("archived")}
                        >
                          Archived <span className="clerk-notif-tab-count">{archivedCount}</span>
                        </button>
                      </div>

                      {activeTab === "unread" && unreadCount > 0 && (
                        <div className="clerk-notif-mark-all-row">
                          <button className="clerk-notif-mark-all" onClick={markAllAsRead}>
                            <i className="fa-solid fa-check-double"></i> Mark all as read
                          </button>
                        </div>
                      )}

                      <div className="clerk-notif-list">
                        {filteredNotifications.length === 0 ? (
                          <div className="clerk-notif-empty">
                            <div className="clerk-notif-empty-icon">
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
              <button className="clerk-header-btn clerk-logout" onClick={() => setShowLogout(true)}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </header>

          <main className="clerk-content">
            <Outlet />
          </main>
        </div>
      </div>

      {/* LOGOUT MODAL */}
      {showLogout && (
        <div className="clerk-modal-overlay">
          <div className="clerk-logout-modal">
            <div className="clerk-modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2>Are you sure you want to logout?</h2>
            <div className="clerk-modal-actions">
              <button className="clerk-modal-btn clerk-cancel" onClick={() => setShowLogout(false)}>
                Cancel
              </button>
              <button className="clerk-modal-btn clerk-confirm" onClick={handleLogout}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT LOADING */}
      {loggingOut && (
        <div className="clerk-logout-loading-screen">
          <div className="clerk-logout-loading-card">
            <div className="clerk-logout-spinner" />
            <h2>Signing you out...</h2>
            <p>Please wait while we securely end your session</p>
          </div>
        </div>
      )}
    </>
  );
}