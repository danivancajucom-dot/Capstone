import { useEffect, useMemo, useRef, useState } from "react";
import "./local-registrar-qr-code.css";
import QRCodeCard from "../../Components/QRCodeCard/QRCodeCard";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const CARDS_PER_PAGE = 9;

function LocalRegistrarQRCode() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [zipping, setZipping] = useState(false);

  // hidden QR refs para sa ZIP — isa per room
  const hiddenQrRefs = useRef({});

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "rooms"));
      const roomList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.roomName || "").localeCompare(b.roomName || ""));
      setRooms(roomList);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const downloadAllZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();

      for (const room of rooms) {
        const ref = hiddenQrRefs.current[room.id];
        if (!ref) continue;

        const dataUrl = await toPng(ref, { cacheBust: true, pixelRatio: 3 });
        const base64 = dataUrl.split(",")[1];
        zip.file(`${room.roomName}-QR.png`, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "SpaceS-QR-Codes.zip");

      await addDoc(collection(db, "activityLogs"), {
        userId: auth.currentUser?.uid,
        userRole: "Local Registrar",
        action: "Downloaded All QR ZIP",
        actionType: "qr",
        description: `Downloaded all QR codes as ZIP (${rooms.length} rooms).`,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
    setZipping(false);
  };

  const totalPages = Math.ceil(rooms.length / CARDS_PER_PAGE);
  const currentRooms = useMemo(() => {
    const start = (page - 1) * CARDS_PER_PAGE;
    return rooms.slice(start, start + CARDS_PER_PAGE);
  }, [rooms, page]);

  return (
    <div className="lr-qr-code">

      <div className="lr-qr-page-header">
        <div>
          <h1>QR Code Management</h1>
          <p>Centralized hub for auto-generated digital access codes. Download and print labels for secure classroom identification.</p>
        </div>

        <button
          className="lr-qr-download-btn"
          onClick={downloadAllZip}
          disabled={zipping || loading}
        >
          <i className="fa-solid fa-download"></i>
          {zipping ? "Preparing ZIP..." : "Download All ZIP"}
        </button>
      </div>

      {/* Hidden QR divs para sa ZIP generation — lahat ng rooms */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        {rooms.map(room => (
          <div
            key={room.id}
            ref={el => hiddenQrRefs.current[room.id] = el}
            style={{
              background: "#fff",
              padding: 18,
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              width: "fit-content",
            }}
          >
            <QRCode value={`${window.location.origin}/room/${room.id}`} size={220} />
            <strong>{room.roomName}</strong>
          </div>
        ))}
      </div>

      <div className="white-box-qr">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", fontWeight: 600 }}>
            Loading QR Codes...
          </div>
        ) : (
          <>
            <div className="qr-cards-grid">
              {currentRooms.map(room => (
                <QRCodeCard key={room.id} room={room} />
              ))}
            </div>

            <div className="qr-pagination">
              <span className="qr-showing">
                Showing{" "}
                {currentRooms.length === 0 ? 0 : (page - 1) * CARDS_PER_PAGE + 1}
                {" - "}
                {(page - 1) * CARDS_PER_PAGE + currentRooms.length}
                {" of "}
                {rooms.length} rooms
              </span>

              <div className="qr-pagination-controls">
                <i
                  className="fa-solid fa-chevron-left"
                  style={{ opacity: page === 1 ? 0.4 : 1 }}
                  onClick={() => { if (page > 1) setPage(page - 1); }}
                />
                <span>{page} / {Math.max(totalPages, 1)}</span>
                <i
                  className="fa-solid fa-chevron-right"
                  style={{ opacity: page === totalPages ? 0.4 : 1 }}
                  onClick={() => { if (page < totalPages) setPage(page + 1); }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LocalRegistrarQRCode;