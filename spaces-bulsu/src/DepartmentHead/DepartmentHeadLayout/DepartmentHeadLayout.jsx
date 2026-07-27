import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import LogoutPopup from "../../Popup/LogoutPopup/LogoutPopup";
import NotificationCard from "../../Components/NotificationCard/Notification";

export default function DepartmentHeadLayout() {
  const [openRoom, setOpenRoom] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", role: "", photoUrl: "" });

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const roomRoutes = [
    "/department-head/room-management",
    "/department-head/room-usagement",
  ];

  const isRoomActive = roomRoutes.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    setOpenRoom(isRoomActive);
  }, [isRoomActive]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      // Real-time profile listener (same as LR)
      const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
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
        setNotifications(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      });

      return () => {
        unsubscribeProfile();
        unsubscribeNotif();
      };
    });

    return () => unsubscribe();
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
      unread.forEach((n) =>
        batch.update(doc(db, "notifications", n.id), { unread: false })
      );
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
    urgent:   "fa-solid fa-exclamation",
    approved: "fa-solid fa-check",
  };

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
      <div className="dept-layout">

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
                className={`dept-nav-parent ${isRoomActive ? "active-parent" : ""}`}
                onClick={() => setOpenRoom(!openRoom)}
              >
                <div className="nav-left">
                  <i className="fa-solid fa-building"></i>
                  <span>Room</span>
                </div>
                <i className={`fa-solid fa-chevron-down arrowDH ${openRoom ? "open" : ""}`} />
              </button>

              <div className={`submenu-card ${openRoom ? "open" : ""}`}>
                <NavLink to="/department-head/room-management">Room Management</NavLink>
                <NavLink to="/department-head/room-usagement">Room Usage Tracking</NavLink>
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

        <div className="dept-main">

          <header className="dept-header">
            <div className="dept-header-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search users, rooms, schedules..." />
            </div>

            <div className="header-actions">
              {/* NOTIFICATION TRIGGER */}
              <div className="notification-container-DH">
                <button
                  className={`dept-header-btn dept-notif-btn ${showNotifications ? "notif-btn-open-DH" : ""}`}
                  onClick={() => setShowNotifications((v) => !v)}
                >
                  <i className={`fa-bell ${unreadCount > 0 ? "fa-solid bell-active-DH" : "fa-regular"}`}></i>
                  {unreadCount > 0 && (
                    <span className="notif-count-DH">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="notif-clickaway-DH" onClick={() => setShowNotifications(false)}></div>
                    <div className="notif-panel-DH">
                      <span className="notif-panel-arrow-DH"></span>

                      <div className="notif-top-DH">
                        <div className="notif-top-title-DH">
                          <h2>Notifications</h2>
                          {unreadCount > 0 && (
                            <span className="notif-top-badge-DH">{unreadCount} new</span>
                          )}
                        </div>
                        <button className="notif-close-DH" onClick={() => setShowNotifications(false)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>

                      <div className="notif-tabs-DH">
                        <button className={activeTab === "all"      ? "active" : ""} onClick={() => setActiveTab("all")}>
                          All <span className="notif-tab-count-DH">{allCount}</span>
                        </button>
                        <button className={activeTab === "unread"   ? "active" : ""} onClick={() => setActiveTab("unread")}>
                          Unread <span className="notif-tab-count-DH">{unreadCount}</span>
                        </button>
                        <button className={activeTab === "archived" ? "active" : ""} onClick={() => setActiveTab("archived")}>
                          Archived <span className="notif-tab-count-DH">{archivedCount}</span>
                        </button>
                      </div>

                      {activeTab === "unread" && unreadCount > 0 && (
                        <div className="notif-mark-all-row-DH">
                          <button className="notif-mark-all-DH" onClick={markAllAsRead}>
                            <i className="fa-solid fa-check-double"></i> Mark all as read
                          </button>
                        </div>
                      )}

                      <div className="notif-list-DH">
                        {filteredNotifications.length === 0 ? (
                          <div className="notif-empty-DH">
                            <div className="notif-empty-icon-DH">
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

      {showLogoutConfirm && (
        <LogoutPopup
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
      )}

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
