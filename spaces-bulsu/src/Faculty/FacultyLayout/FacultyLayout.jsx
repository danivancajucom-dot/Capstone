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
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

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

      console.log("Logged in UID:", user.uid);

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

      // notifications
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("ownerType", "==", "faculty"),
        where("archived", "==", false),
        orderBy("createdAt", "desc")
      );

      const unsubscribeNotif = onSnapshot(q, (snapshot) => {
        setNotifications(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      });

      return unsubscribeNotif;
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
    await updateDoc(doc(db, "notifications", id), { unread: false });
  };

  const archiveNotification = async (id) => {
    await updateDoc(doc(db, "notifications", id), { archived: true });
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

          {/* NAV — Profile removed, handled by bottom card */}
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
              {profile.photoUrl
                ? <img src={profile.photoUrl} alt="Profile" />
                : <span>{initials || <i className="fa-solid fa-user" />}</span>
              }
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
              <div className="notification-container">
                <button className="header-btn" onClick={() => setShowNotifications(true)}>
                  <i className={`fa-bell ${notifications.some((n) => n.unread) ? "fa-solid bell-active" : "fa-regular"}`}></i>
                  {notifications.filter((n) => n.unread).length > 0 && (
                    <span className="notif-count">
                      {notifications.filter((n) => n.unread).length}
                    </span>
                  )}
                </button>
              </div>

              <button className="header-btn logout" onClick={() => setShowLogoutConfirm(true)}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </header>

          <main className="faculty-content">
            <Outlet />
          </main>

        </div>
      </div>

      {/* NOTIFICATIONS DRAWER */}
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
              {filteredNotifications.length === 0 ? (
                <div className="empty-notifications">No notifications found.</div>
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

                      {item.type === "room-reassignment" && (
                        <i className="fa-solid fa-door-open"></i>
                      )}
                      {item.type === "room-activity" && (
                          <i className="fa-solid fa-building-circle-exclamation"></i>
                      )}
                    </div>

                    <div className="notif-body">

                      <div className="notif-title-row">
                        <h4>{item.title}</h4>
                        {item.badge && (
                          <span className="notif-badge">{item.badge}</span>
                        )}
                      </div>

                      <p>{item.message}</p>

                      <span className="notif-time">
                        {formatTime(item.createdAt)}
                      </span>

                      <div className="notif-actions">

                        {item.type === "room-reassignment" ? (

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/faculty/room-reassignment/${item.assignmentId}`);
                            }}
                          >
                            View
                          </button>

                        ) : (

                          !item.archived && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveNotification(item.id);
                              }}
                            >
                              Archive
                            </button>
                          )

                        )}

                      </div>

                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="logout-modal">
            <div className="modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2>Are you sure you want to log out?</h2>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={handleLogout}>Confirm</button>
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
