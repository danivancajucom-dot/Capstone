import "./NotificationCard.css";

export default function NotificationCard({
  icon,
  title,
  message,
  time,
  badge,
  type = "default",
}) {
  return (
    <div className={`notification-card ${type}`}>

      <div className="notification-card-icon">
        <i className={icon}></i>
      </div>

      <div className="notification-card-content">

        <div className="notification-card-header">

          <h3>{title}</h3>

          {badge && (
            <span className="notification-card-badge">
              {badge}
            </span>
          )}

        </div>

        <p>{message}</p>

        <span>{time}</span>

      </div>

    </div>
  );
}