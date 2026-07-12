import { useState, useEffect, useRef } from "react";
import "./notification-management.css";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../../firebase";
import { createNotification } from "../../utils/createNotification";

const CLOUDINARY_CLOUD_NAME    = "dzu1qb8oz";
const CLOUDINARY_UPLOAD_PRESET = "SpacesCICT";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "spaces/notifications");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Image upload failed. Please try again.");
  const data = await res.json();
  return data.secure_url;
}

export default function NotificationManagement() {
  const [activeFilter, setActiveFilter]   = useState("All");
  const [message, setMessage]             = useState("");
  const [recipient, setRecipient]         = useState("All Staff");
  const [history, setHistory]             = useState([]);
  const [sending, setSending]             = useState(false);
  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [uploading, setUploading]         = useState(false);
  const fileInputRef                      = useRef(null);

  const filters = ["All", "Sent", "Drafts"];

  const filtered = history.filter((n) => {
    if (activeFilter === "Sent")
      return n.status === "Delivered";
    if (activeFilter === "Drafts")
      return n.status === "Draft";
    return true;
  });

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      alert("Message is required");
      return;
    }

    setSending(true);
    setUploading(false);

    try {
      let imageUrl = null;

      // Upload image if selected
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadToCloudinary(imageFile);
        setUploading(false);
      }

      console.log("Getting users...");
      const usersSnapshot = await getDocs(collection(db, "users"));
      console.log("Found", usersSnapshot.size, "users");

      let recipients = usersSnapshot.docs;

      console.log("Creating notifications for each user...");
      for (const user of recipients) {
        console.log("Creating notification for", user.id);
        await createNotification({
          userId: user.id,
          title: "Announcement",
          message,
          imageUrl,
          type: "announcement",
          badge: "NEW",
        });
      }

      console.log("Adding to notification_logs...");
      await addDoc(
        collection(db, "notification_logs"),
        {
          content: message,
          imageUrl,
          group: recipient,
          status: "Delivered",
          createdAt: serverTimestamp(),
        }
      );

      console.log("Success! Clearing form...");

      // Reset form
      setMessage("");
      setImageFile(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }

      alert("Notification sent successfully!");

    } catch (err) {
      console.error("SEND ERROR:", err);
      alert("Failed to send notification:\n" + err.message);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "notification_logs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setHistory(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <div className="nm-page">
        <div className="nm-header">
          <div>
            <h1 className="nm-title">Notification Management</h1>
            <p className="nm-subtitle">Designated workspace for university-wide alerts and professor communication.</p>
          </div>
          <button className="nm-export-btn">
            <i className="fa-solid fa-download" />
            Export Logs
          </button>
        </div>

        <div className="nm-compose-card">
          <div className="nm-compose-header">
            <div className="nm-compose-title">
              <i className="fa-solid fa-pen-to-square" />
              New Announcement
            </div>
            <span className="nm-internal-badge">INTERNAL ONLY</span>
          </div>

          <div className="nm-compose-body">
            <div className="nm-avatar">
              <i className="fa-regular fa-user" />
            </div>
            <textarea
              className="nm-textarea"
              placeholder="Compose a message for the university staff or faculty..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {/* IMAGE PREVIEW */}
          {imagePreview && (
            <div className="nm-image-preview-wrapper">
              <div className="nm-image-preview">
                <img src={imagePreview} alt="Preview" className="nm-preview-img" />
                <button
                  className="nm-remove-image-btn"
                  onClick={handleRemoveImage}
                  type="button"
                  disabled={uploading}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              {uploading && <p className="nm-upload-status">Uploading image...</p>}
            </div>
          )}

          <div className="nm-compose-footer">
            <div className="nm-compose-tools">
              <button
                className="nm-tool-btn"
                onClick={() => fileInputRef.current?.click()}
                type="button"
                disabled={uploading}
                title="Attach image"
              >
                <i className="fa-regular fa-image" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageSelect}
              />
              <button className="nm-tool-btn" disabled><i className="fa-solid fa-paperclip" /></button>
              <button className="nm-tool-btn" disabled><i className="fa-regular fa-calendar" /></button>
              <select
                className="nm-recipient-select"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
              >
                <option>All Staff</option>
                <option>Faculty</option>
                <option>Local Registrar</option>
                <option>Clerk</option>
              </select>
            </div>
            <div className="nm-compose-actions">
              <button
                className="nm-discard-btn"
                onClick={() => {
                  setMessage("");
                  setImageFile(null);
                  if (imagePreview) {
                    URL.revokeObjectURL(imagePreview);
                    setImagePreview(null);
                  }
                }}
                type="button"
                disabled={sending}
              >
                Discard
              </button>
              <button
                className="nm-send-btn"
                onClick={handleSend}
                disabled={sending || uploading}
              >
                <i className="fa-solid fa-paper-plane" />
                {uploading ? "Uploading..." : sending ? "Sending..." : "Send Now"}
              </button>
            </div>
          </div>
        </div>

        <div className="nm-history-section">
          <div className="nm-history-header">
            <h2 className="nm-history-title">Recent History</h2>
            <div className="nm-filters">
              {filters.map(f => (
                <button
                  key={f}
                  className={`nm-filter-btn ${activeFilter === f ? "active" : ""}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="nm-table-wrapper">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>ANNOUNCEMENT CONTENT</th>
                  <th>RECIPIENT GROUP</th>
                  <th>STATUS</th>
                  <th>READ DATE</th>
                  <th>SENT DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="nm-content-cell">{row.content}</td>
                    <td>
                      <span className="nm-group-badge">{row.group}</span>
                    </td>
                    <td>
                      <span className={`nm-status ${row.status.toLowerCase()}`}>
                        <span className="nm-status-dot" />
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {row.reads !== null ? (
                        <div className="nm-read-stats">
                          <div className="nm-read-row">
                            <span className="nm-reads">{row.reads}</span>
                            <span className="nm-unread">{row.unread}</span>
                          </div>
                          <div className="nm-read-labels">
                            <span>Reads</span>
                            <span>Unread</span>
                          </div>
                          <div className="nm-read-bar">
                            <div
                              className="nm-read-fill"
                              style={{ width: `${(row.reads / (row.reads + row.unread)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="nm-dash">--</span>
                      )}
                    </td>
                    <td className="nm-sent-date">
                      {row.createdAt?.toDate().toLocaleString()}
                    </td>
                    <td>
                      <button className="nm-action-btn">⋮</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="nm-table-footer">
            <span className="nm-count">Showing 1-5 of 42 notifications</span>
            <div className="nm-pagination">
              <button className="nm-page-btn"><i className="fa-solid fa-chevron-left" /></button>
              <button className="nm-page-btn"><i className="fa-solid fa-chevron-right" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
