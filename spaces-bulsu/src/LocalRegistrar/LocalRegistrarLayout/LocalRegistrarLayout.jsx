import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./local-registrar-layout.css";
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
  writeBatch,               // ← added for markAllAsRead
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import LogoutPopup from "../../Popup/LogoutPopup/LogoutPopup";
import NotificationCard from "../../Components/NotificationCard/Notification"; // ← added

export default function LocalRegistrarLayout() {
  const [openSchedule, setOpenSchedule] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", role: "", photoUrl: "" });

  // ── Notification state ────────────────────────────────────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const scheduleRoutes = [
    "/local-registrar/bulk-upload-1",
    "/local-registrar/academic-schedule",
    "/local-registrar/my-submitted-schedules",
    "/local-registrar/qr-code",
  ];

  const isScheduleActive = scheduleRoutes.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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

      // ── Notifications listener ──────────────────────────────
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("ownerType", "==", "local-registrar"), // matches role value used in notifications
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

    return () => unsubscribe();
  }, []);

  // ── Notification helpers ──────────────────────────────────────

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

  // ── Logout ──────────────────────────────────────────────────────

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

  return (
    <>
      <div className="registrar-layout">

        <aside className="registrar-sidebar">

          <div className="registrar-logo">
            <div className="logo-icon">
              <img src="/SpaceSLogo.png" alt="SpaceS Logo" className="clerk-logo-img" />
            </div>
            <div className="logo-text">
              <h2>SpaceS CICT</h2>
              <span>CICT Local Registrar</span>
            </div>
          </div>

          <nav className="registrar-nav">

            <NavLink end to="/local-registrar">
              <i className="fa-solid fa-table-columns"></i>
              <span>Dashboard</span>
            </NavLink>

            <div className="nav-group">
              <button
                className={`lr-nav-parent ${isScheduleActive ? "active-parent" : ""}`}
                onClick={() => setOpenSchedule(!openSchedule)}
              >
                <div className="nav-left">
                  <i className="fa-solid fa-calendar-days"></i>
                  <span>Schedule</span>
                </div>
                <i className={`fa-solid fa-chevron-down arrow ${openSchedule ? "open" : ""}`} />
              </button>

              <div className={`submenu-card ${openSchedule ? "open" : ""}`}>
                <NavLink to="/local-registrar/bulk-upload-1">Bulk Upload</NavLink>
                <NavLink to="/local-registrar/academic-schedule">View Academic Schedule</NavLink>
                <NavLink to="/local-registrar/my-submitted-schedules">My Submitted Schedules</NavLink>
                <NavLink to="/local-registrar/qr-code">QR Code Management</NavLink>
              </div>
            </div>

            <NavLink to="/local-registrar/broadcast-channel">
              <i className="fa-solid fa-bell"></i>
              <span>Announcement Channel</span>
            </NavLink>

          </nav>

          {/* PROFILE CARD — bottom of sidebar */}
          <NavLink to="/local-registrar/profile" className="lr-sidebar-profile">
            <div className="lr-sidebar-avatar">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" />
              ) : (
                <span>{initials || <i className="fa-solid fa-user" />}</span>
              )}
            </div>
            <div className="lr-sidebar-profile-info">
              <span className="lr-sidebar-profile-name">{fullName || "My Profile"}</span>
              <span className="lr-sidebar-profile-role">{profile.role}</span>
            </div>
          </NavLink>

        </aside>

        <div className="registrar-main">

          <header className="registrar-header">
            <div className="registrar-header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search..." />
            </div>

            <div className="header-actions">
              {/* ── NOTIFICATION TRIGGER ────────────────────────── */}
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
              <button className="header-btn lr-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </header>

          <main className="registrar-content">
            <Outlet />
          </main>

        </div>
      </div>

      {showLogoutConfirm && (
        <LogoutPopup
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
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