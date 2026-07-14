import { useEffect, useMemo, useState } from "react";
import "./local-registrar-qr-code.css";
import QRCodeCard from "../../Components/QRCodeCard/QRCodeCard";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

const CARDS_PER_PAGE = 9;

function LocalRegistrarQRCode() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "rooms"));

      const roomList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      roomList.sort((a, b) =>
        (a.roomName || "").localeCompare(b.roomName || "")
      );

      setRooms(roomList);

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const totalPages = Math.ceil(
    rooms.length / CARDS_PER_PAGE
  );

  const currentRooms = useMemo(() => {

    const start = (page - 1) * CARDS_PER_PAGE;

    return rooms.slice(
      start,
      start + CARDS_PER_PAGE
    );

  }, [rooms, page]);

  return (
    <div className="lr-qr-code">

      <div className="lr-qr-page-header">

        <div>
          <h1>QR Code Management</h1>

          <p>
            Centralized hub for auto-generated digital
            access codes. Download and print labels for
            secure classroom identification.
          </p>

        </div>

        <button
          className="lr-qr-download-btn"
          disabled
        >
          <i className="fa-solid fa-download"></i>

          Download All ZIP
        </button>

      </div>

      <div className="white-box-qr">

        {loading ? (

          <div
            style={{
              textAlign: "center",
              padding: "60px",
              fontWeight: 600,
            }}
          >
            Loading QR Codes...
          </div>

        ) : (

          <>
            <div className="qr-cards-grid">

              {currentRooms.map(room => (

                <QRCodeCard
                  key={room.id}
                  room={room}
                />

              ))}

            </div>

            <div className="qr-pagination">

              <span className="qr-showing">

                Showing{" "}
                {currentRooms.length === 0
                  ? 0
                  : (page - 1) *
                      CARDS_PER_PAGE +
                    1}
                {" - "}
                {(page - 1) *
                  CARDS_PER_PAGE +
                  currentRooms.length}
                {" of "}
                {rooms.length} rooms

              </span>

              <div className="qr-pagination-controls">

                <i
                  className="fa-solid fa-chevron-left"
                  style={{
                    opacity:
                      page === 1
                        ? 0.4
                        : 1,
                  }}
                  onClick={() => {

                    if (page > 1) {
                      setPage(page - 1);
                    }

                  }}
                ></i>

                <span>
                  {page} / {Math.max(totalPages, 1)}
                </span>

                <i
                  className="fa-solid fa-chevron-right"
                  style={{
                    opacity:
                      page === totalPages
                        ? 0.4
                        : 1,
                  }}
                  onClick={() => {

                    if (page < totalPages) {
                      setPage(page + 1);
                    }

                  }}
                ></i>

              </div>

            </div>

          </>

        )}

      </div>

    </div>
  );
}

export default LocalRegistrarQRCode;