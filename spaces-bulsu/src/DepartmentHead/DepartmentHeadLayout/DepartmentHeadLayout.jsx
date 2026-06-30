import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./department-head-layout.css";
import LogoutPopup from "../../Popup/LogoutPopup/LogoutPopup";
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
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function DepartmentHeadLayout() {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut]               = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [activeTab, setActiveTab]                 = useState("all");
  const [profile, setProfile]                     = useState({ firstName: "", lastName: "", role: "", photoUrl: "" });

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

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "unread")   return item.unread && !item.archived;
    if (activeTab === "archived") return item.archived;
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

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

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
            <NavLink to="/department-head/schedule">
              <i className="fa-solid fa-calendar-days"></i>
              <span>Schedule</span>
            </NavLink>
            <NavLink to="/department-head/room-management">
              <i className="fa-solid fa-building"></i>
              <span>Room Management</span>
            </NavLink>
            <NavLink to="/department-head/room-activity">
              <i className="fa-solid fa-chart-line"></i>
              <span>Room Activity</span>
            </NavLink>
            <NavLink to="/department-head/user-management">
              <i className="fa-solid fa-users"></i>
              <span>User Management</span>
            </NavLink>
            <NavLink to="/department-head/notification-management">
              <i className="fa-solid fa-bell"></i>
              <span>Notifications</span>
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
                <button className="dept-header-btn" onClick={() => setShowNotifications(true)}>
                  <i className={`fa-bell ${notifications.some((n) => n.unread) ? "fa-solid bell-active" : "fa-regular"}`}></i>
                  {notifications.filter(n => n.unread).length > 0 && (
                    <span className="notif-count">{notifications.filter(n => n.unread).length}</span>
                  )}
                </button>
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

      {/* NOTIFICATIONS */}
      {showNotifications && (
        <>
          <div className="notif-overlay" onClick={() => setShowNotifications(false)}></div>
          <div className="notif-drawer">
            <div className="notif-top">
              <h2>Notifications</h2>
              <button className="notif-close" onClick={() => setShowNotifications(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="notif-tabs">
              <button className={activeTab === "all"      ? "active" : ""} onClick={() => setActiveTab("all")}>All</button>
              <button className={activeTab === "unread"   ? "active" : ""} onClick={() => setActiveTab("unread")}>Unread</button>
              <button className={activeTab === "archived" ? "active" : ""} onClick={() => setActiveTab("archived")}>Archived</button>
            </div>
            <div className="notif-list">
              {filteredNotifications.map((item) => (
                <div key={item.id} className={`notif-card ${item.type}`} onClick={() => markAsRead(item.id)}>
                  <div className="notif-icon">
                    {item.type === "schedule" && <i className="fa-regular fa-calendar"></i>}
                    {item.type === "urgent"   && <i className="fa-solid fa-exclamation"></i>}
                    {item.type === "approved" && <i className="fa-solid fa-check"></i>}
                  </div>
                  <div className="notif-body">
                    <div className="notif-title-row">
                      <h4>{item.title}</h4>
                      {item.badge && <span className="notif-badge">{item.badge}</span>}
                    </div>
                    <p>{item.message}</p>
                    <span className="notif-time">{formatTime(item.createdAt)}</span>
                    <div className="notif-actions">
                      {!item.archived && (
                        <button onClick={(e) => { e.stopPropagation(); archiveNotification(item.id); }}>
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
