import "./qr-code-card.css";

function QRCodeCard() {
  return (
    <div className="qr-code-card">
      <div className="qr-code-image">
        {/* QR Code image here */}
      </div>
      <div className="qr-code-info">
        <span className="qr-room-name">Room Name</span>
        <span className="qr-floor">Floor Number</span>
        <button className="qr-download-btn">
          <i className="fa-solid fa-download"></i> Download
        </button>
      </div>
    </div>
  );
}

export default QRCodeCard;