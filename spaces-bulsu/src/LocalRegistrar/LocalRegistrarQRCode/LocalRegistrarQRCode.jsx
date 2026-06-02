import "./local-registrar-qr-code.css";
import QRCodeCard from "../../Components/QRCodeCard/QRCodeCard"; 

function LocalRegistrarQRCode() {
  return (
    <>
        <div className="container">
  <div className="page-header">
    <div>
      <h1>QR Code Management</h1>
      <p>Centralized hub for auto-generated digital access codes. Download and print labels for secure classroom identification.</p>
    </div>
    <button className="download-btn">
      <i className="fa-solid fa-download"></i> Download All ZIP
    </button>
  </div>
  
  <div className="white-box-qr">
      <div className="qr-cards-grid">
    <QRCodeCard />
    <QRCodeCard />
    <QRCodeCard />
    <QRCodeCard />
  </div> 
  <div className="qr-pagination">
    <span className="qr-showing">Showing 4 of 22 rooms</span>
    <div className="qr-pagination-controls">
      <i className="fa-solid fa-chevron-left"></i>
      <i className="fa-solid fa-chevron-right"></i>
    </div>
  </div>
</div>
  </div>
    </>
  );
}

export default LocalRegistrarQRCode;