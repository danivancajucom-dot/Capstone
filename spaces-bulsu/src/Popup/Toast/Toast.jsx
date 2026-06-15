import "./Toast.css";

const Toast = ({
  show,
  type = "success",
  title,
  message,
  onClose,
}) => {
  if (!show) return null;

  const icons = {
    success: "✓",
    error: "✕",
    loading: "⟳",
  };

  return (
    <div className={`toast-container ${type}`}>
      <div className="toast-icon">
        {icons[type]}
      </div>

      <div className="toast-content">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>

      <button
        className="toast-close"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;