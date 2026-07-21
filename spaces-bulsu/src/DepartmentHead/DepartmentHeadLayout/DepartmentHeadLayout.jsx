import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./department-head-layout.css";
import LogoutPopup from "../../Popup/LogoutPopup/LogoutPopup";
import NotificationCard from "../../Components/NotificationCard/Notification"; 
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
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function DepartmentHeadLayout() {
  const navigate = useNavigate();
  const [openRoom, setOpenRoom]           = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut]               = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [activeTab, setActiveTab]                 = useState("all");
  const [profile, setProfile]                     = useState({ firstName: "", lastName: "", role: "", photoUrl: "" });
  const roomRoutes = [
    "/department-head/room-management",
    "/department-head/room-usagement",
  ];

  const isRoomActive = roomRoutes.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      // Load profile for sidebar bottom card
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            firstName: d.firstName || "",
            lastName:  d.lastName  || "",
            role:      d.role      || "",
            photoUrl:  d.photoUrl  || "",
          });
        }
      });

      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("ownerType", "==", "department-head"),
        where("archived", "==", false),
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
    const now  = new Date();
    const date = timestamp.toDate();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const markAsRead = async (id) => {
    try { await updateDoc(doc(db, "notifications", id), { unread: false }); }
    catch (err) { console.error(err); }
  };

  const archiveNotification = async (id) => {
    try { await updateDoc(doc(db, "notifications", id), { archived: true }); }
    catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => n.unread && !n.archived);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { unread: false }));
      await batch.commit();
    } catch (err) { console.error(err); }
  };

  const unreadCount   = notifications.filter((n) => n.unread && !n.archived).length;
  const archivedCount = notifications.filter((n) => n.archived).length;
  const allCount      = notifications.filter((n) => !n.archived).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "unread")   return item.unread && !item.archived;
    if (activeTab === "archived") return item.archived;
    return !item.archived;
  });

  const emptyCopy = {
    all:      { icon: "fa-bell-slash",   title: "Wala pang abiso",      text: "Dito lalabas ang mga update tungkol sa schedules, reservations, at conflicts." },
    unread:   { icon: "fa-check-double", title: "Up to date ka na!",    text: "Nabasa mo na lahat ng notification." },
    archived: { icon: "fa-box-open",     title: "Walang naka-archive", text: "Ang mga na-archive mong abiso ay makikita rito." },
  }[activeTab];

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

  const typeIcon = {
    schedule: "fa-regular fa-calendar",
    urgent:   "fa-solid fa-exclamation",
    approved: "fa-solid fa-check",
  };

  return (
    <>
      <div className="dept-layout">

        {/* SIDEBAR */}
        <aside className="dept-sidebar">

          <div className="dept-logo">
            <div className="dept-logo-icon">
              <img src="/SpaceSLogo.png" alt="SpaceS Logo" className="clerk-logo-img" />
            </div>
            <div className="dept-logo-text">
              <h2>SpaceS CICT</h2>
              <span>Department Head</span>
            </div>
          </div>

          <nav className="dept-nav">
            <NavLink end to="/department-head">
              <i className="fa-solid fa-house"></i>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/department-head/conflicts">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>Conflicts</span>
            </NavLink>
            <NavLink to="/department-head/reservations">
              <i className="fa-solid fa-bookmark"></i>
              <span>Reservations</span>
            </NavLink>
            <NavLink to="/department-head/schedule-view-academic-schedule">
              <i className="fa-solid fa-calendar-days"></i>
              <span>Schedule</span>
            </NavLink>

            <div className="nav-group">
              <button
                className={`lr-nav-parent ${isRoomActive ? "active-parent" : ""}`}
                onClick={() => setOpenRoom(!openRoom)}
              >
                <div className="nav-left">
                  <i className="fa-solid fa-building"></i>
                  <span>Room</span>
                </div>
                <i className={`fa-solid fa-chevron-down arrow ${openRoom ? "open" : ""}`} />
              </button>

              <div className={`submenu-card ${openRoom ? "open" : ""}`}>
                <NavLink to="/department-head/room-management">Room Management</NavLink>
                <NavLink to="/department-head/room-usagement">Room Usagement</NavLink>
              </div>
            </div>
            <NavLink to="/department-head/room-activity">
              <i className="fa-solid fa-chart-line"></i>
              <span>Room Activity</span>
            </NavLink>
            <NavLink to="/department-head/user-management">
              <i className="fa-solid fa-users"></i>
              <span>User Management</span>
            </NavLink>
            <NavLink to="/department-head/broadcast-channel">
              <i className="fa-solid fa-bullhorn"></i>
              <span>Announcement Channel</span>
            </NavLink>
          </nav>

          {/* PROFILE CARD — bottom of sidebar */}
          <NavLink to="/department-head/profile" className="dept-sidebar-profile">
            <div className="dept-sidebar-avatar">
              {profile.photoUrl
                ? <img src={profile.photoUrl} alt="Profile" />
                : <span>{initials || <i className="fa-solid fa-user" />}</span>
              }
            </div>
            <div className="dept-sidebar-profile-info">
              <span className="dept-sidebar-profile-name">{fullName || "My Profile"}</span>
              <span className="dept-sidebar-profile-role">{profile.role}</span>
            </div>
          </NavLink>

        </aside>

        {/* MAIN */}
        <div className="dept-main">

          <header className="dept-header">
            <div className="dept-header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search users, rooms, schedules..." />
            </div>

            <div className="header-actions">
              <div className="notification-container">
                <button
                  className={`dept-header-btn ${showNotifications ? "notif-btn-open" : ""}`}
                  onClick={() => setShowNotifications((v) => !v)}
                >
                  <i className={`fa-bell ${unreadCount > 0 ? "fa-solid bell-active" : "fa-regular"}`}></i>
                  {unreadCount > 0 && (
                    <span className="notif-count">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </button>

                {/* NOTIFICATIONS — floating panel anchored to the bell */}
                {showNotifications && (
                  <>
                    <div className="notif-clickaway" onClick={() => setShowNotifications(false)}></div>
                    <div className="notif-panel">
                      <span className="notif-panel-arrow"></span>

                      <div className="notif-top">
                        <div className="notif-top-title">
                          <h2>Notifications</h2>
                          {unreadCount > 0 && <span className="notif-top-badge">{unreadCount} new</span>}
                        </div>
                        <button className="notif-close" onClick={() => setShowNotifications(false)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>

                      <div className="notif-tabs">
                        <button className={activeTab === "all"      ? "active" : ""} onClick={() => setActiveTab("all")}>
                          All <span className="notif-tab-count">{allCount}</span>
                        </button>
                        <button className={activeTab === "unread"   ? "active" : ""} onClick={() => setActiveTab("unread")}>
                          Unread <span className="notif-tab-count">{unreadCount}</span>
                        </button>
                        <button className={activeTab === "archived" ? "active" : ""} onClick={() => setActiveTab("archived")}>
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
              <button className="dept-header-btn dept-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </header>

          <main className="dept-content">
            <Outlet />
          </main>

        </div>
      </div>

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <LogoutPopup
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
      )}

      {/* LOGOUT LOADING */}
      {loggingOut && (
        <div className="logout-loading-screen">
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