import "./NotificationCard.css";

export default function NotificationCard({
  icon,
  title,
  message,
  time,
  badge,
  type = "default",
  unread = false,
  archived = false,
  onClick,
  onArchive,
}) {
  return (
    <div
      className={`notification-card ${type} ${unread ? "is-unread" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="notification-card-icon">
        <i className={icon}></i>
      </div>

      <div className="notification-card-content">
        <div className="notification-card-header">
          <div className="notification-card-title-group">
            {unread && <span className="notification-card-dot" />}
            <h3>{title}</h3>
          </div>

          {badge && <span className="notification-card-badge">{badge}</span>}
        </div>

        <p>{message}</p>

        <div className="notification-card-footer">
          <span className="notification-card-time">{time}</span>

          {!archived && onArchive && (
            <button
              type="button"
              className="notification-card-archive"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              <i className="fa-solid fa-box-archive"></i>
              <span>Archive</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}