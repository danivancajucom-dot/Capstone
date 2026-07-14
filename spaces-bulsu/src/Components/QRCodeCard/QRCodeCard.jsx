import { useRef } from "react";
import "./qr-code-card.css";

import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

function QRCodeCard({ room }) {

  const qrRef = useRef(null);

  // ito ang isi-scan
  const qrValue = `${window.location.origin}/room/${room.id}`;

  const downloadQR = async () => {

    if (!qrRef.current) return;

    try {

      const dataUrl = await toPng(
        qrRef.current,
        {
          cacheBust: true,
          pixelRatio: 3,
        }
      );

      saveAs(
        dataUrl,
        `${room.roomName}-QR.png`
      );

    } catch (err) {

      console.error(err);

    }

  };

  return (

    <div className="qr-code-card">

      <div
        className="qr-code-image"
        ref={qrRef}
      >

        <div
          style={{
            background: "#fff",
            padding: 18,
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >

          <QRCode
            value={qrValue}
            size={220}
          />

          <strong>
            {room.roomName}
          </strong>

        </div>

      </div>

      <div className="qr-code-info">

        <span className="qr-room-name">

          {room.roomName}

        </span>

        <span className="qr-floor">

          {room.floor}

        </span>

        <button
          className="qr-download-btn"
          onClick={downloadQR}
        >

          <i className="fa-solid fa-download"></i>

          Download QR

        </button>

      </div>

    </div>

  );

}

export default QRCodeCard;