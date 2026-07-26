import "./account-menu.css";

export default function AccountMenu({
  photoUrl,
  name,
  email,
  initials,
  anchor = "header", // "header" | "sidebar"
  onProfile,
  onSettings,
  onLogout,
}) {
  return (
    <div className={`account-menu-panel anchor-${anchor}`}>
      <span className="account-menu-arrow"></span>

      <div className="account-menu-header">
        <div className="account-menu-avatar">
          {photoUrl
            ? <img src={photoUrl} alt={name || "Profile"} />
            : <span>{initials || <i className="fa-solid fa-user" />}</span>
          }
        </div>
        <div className="account-menu-id">
          <span className="account-menu-name">{name || "My Account"}</span>
          {email && <span className="account-menu-email">{email}</span>}
        </div>
      </div>

      <div className="account-menu-divider"></div>

      <button type="button" className="account-menu-item" onClick={onProfile}>
        <i className="fa-regular fa-user"></i>
        <span>Profile</span>
      </button>

      <button type="button" className="account-menu-item" onClick={onSettings}>
        <i className="fa-solid fa-gear"></i>
        <span>Settings</span>
      </button>

      <div className="account-menu-divider"></div>

      <button type="button" className="account-menu-item account-menu-logout" onClick={onLogout}>
        <i className="fa-solid fa-right-from-bracket"></i>
        <span>Logout</span>
      </button>
    </div>
  );
}