import { useState, useEffect, useRef } from "react";
import "./broadcast-channel.css";
import {
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { logActivity } from "../../utils/logActivity";
import Toast from "../../Popup/Toast/Toast";

const CLOUDINARY_CLOUD_NAME = "dzu1qb8oz";
const CLOUDINARY_UPLOAD_PRESET = "SpacesCICT";

async function uploadToCloudinary(file, folder) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `spaces/${folder}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Upload failed. Please try again.");
  const data = await res.json();
  return data.secure_url;
}

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function BroadcastChannel() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("All Staffs");
  const [userRole, setUserRole] = useState("");
  const [senderName, setSenderName] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const imageRef = useRef(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const menuRefs = useRef(new Map());

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, msg) => {
    setToast({ show: true, type, title, message: msg });

    if (type !== "loading") {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;

      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));

        if (snap.exists()) {
          const data = snap.data();

          setUserRole(data.role || "");
          setSenderName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUserData();
  }, []);

  // Build a uid -> display name map, used for reaction tooltips
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const map = {};
        snap.docs.forEach((d) => {
          const u = d.data();
          map[d.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown User";
        });
        setUsersMap(map);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAllUsers();
  }, []);

  useEffect(() => {
    setLoading(true);
    if (!userRole) return;

    const q = query(collection(db, "broadcastChannels"), orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filteredMessages = allMessages.filter((msg) => {
        if (msg.recipient === "All Staffs") return true;

        if (msg.senderId === auth.currentUser?.uid) return true;

        return msg.recipient === userRole;
      });
      setMessages(filteredMessages);
    });
    setLoading(false);

    return () => unsub();
  }, [userRole]);

  // Keep the feed pinned to the latest announcement
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Local preview for the selected image, cleaned up on change/unmount
  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  // Close the message options menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!openMenuId) return;
      const el = menuRefs.current.get(openMenuId);
      if (el && !el.contains(e.target)) {
        setOpenMenuId(null);
        setConfirmingId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  // Close the lightbox / menu with Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setLightboxImage(null);
      setOpenMenuId(null);
      setConfirmingId(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sendMessage = async () => {
    if (userRole !== "Department Head") {
      showToast("error", "Not Allowed", "Only Department Head can send announcements.");
      return;
    }

    if (!message.trim() && !selectedImage && !selectedFile) return;

    setUploading(true);

    try {
      let imageUrl = "";
      let fileUrl = "";
      let fileName = "";

      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage, "broadcast-images");
      }

      if (selectedFile) {
        fileUrl = await uploadToCloudinary(selectedFile, "broadcast-files");
        fileName = selectedFile.name;
      }

      await addDoc(collection(db, "broadcastChannels"), {
        content: message,
        imageUrl,
        fileUrl,
        fileName,
        senderId: auth.currentUser.uid,
        senderName,
        senderRole: userRole,
        recipient,
        createdAt: serverTimestamp(),
        reactions: {
          like: [],
          love: [],
        },
      });

      await logActivity({
        userId: auth.currentUser.uid,
        user: senderName,
        role: userRole,
        action: "Sent Broadcast Announcement",
        actionType: "success",
        target: recipient,
        status: "SUCCESS",
        details: {
          message: message.trim() || (selectedImage ? "Image Attachment" : selectedFile ? fileName : "Announcement"),
          hasImage: !!imageUrl,
          hasFile: !!fileUrl,
        },
      });

      setMessage("");
      setSelectedImage(null);
      setSelectedFile(null);
      showToast("success", "Sent", "Announcement published successfully!");
    } catch (err) {
      console.error(err);
      showToast("error", "Send Failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  const reactToMessage = async (id, type) => {
    try {
      const messageRef = doc(db, "broadcastChannels", id);

      await updateDoc(messageRef, {
        [`reactions.${type}`]: arrayUnion(auth.currentUser.uid),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const unsendMessage = async (id) => {
    try {
      await deleteDoc(doc(db, "broadcastChannels", id));
      showToast("success", "Removed", "Message unsent for everyone.");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed", "Could not unsend the message.");
    } finally {
      setOpenMenuId(null);
      setConfirmingId(null);
    }
  };

  const getReactorNames = (uids = []) => {
    if (uids.length === 0) return "";
    return uids
      .map((uid) => (uid === auth.currentUser?.uid ? "You" : usersMap[uid] || "Someone"))
      .join(", ");
  };

  const formatDateDivider = (timestamp) => {
    if (!timestamp) return "";

    const date = timestamp.toDate();

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = timestamp.toDate();

    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const shouldShowDivider = (currentMsg, previousMsg) => {
    if (!currentMsg?.createdAt) return false;

    if (!previousMsg?.createdAt) return true;

    const current = currentMsg.createdAt.toDate();
    const previous = previousMsg.createdAt.toDate();

    const sameDay = current.toDateString() === previous.toDateString();

    const diffMinutes = (current - previous) / 1000 / 60;

    return !sameDay || diffMinutes >= 20;
  };

  const canSend = !uploading && (message.trim() || selectedImage || selectedFile);

  return (
    <div className="bc-container">
      {/* HEADER */}
      <div className="bc-topbar">
        <div className="bc-channel-info">
          <div className="bc-channel-icon">
            <i className="fa-solid fa-bullhorn"></i>
          </div>

          <div>
            <h2>Broadcast Channel</h2>
            <span>
              {userRole === "Department Head" ? "Send announcements" : "Department announcements"}
            </span>
          </div>
        </div>

        <div className="bc-message-counter">
          <i className="fa-regular fa-message"></i>
          {messages.length} announcement{messages.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* MESSAGES */}
      <div className="bc-messages">
        {loading ? (
          <div className="room-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <h2>Loading</h2>
            <p>Please wait while we retrieve available contents.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bc-empty-state">
            <i className="fa-solid fa-bullhorn"></i>
            <p>No announcements yet.</p>
            {userRole === "Department Head" && (
              <span className="bc-empty-hint">Your first announcement will appear here.</span>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const previousMsg = messages[index - 1];
            const isMine = auth.currentUser && msg.senderId === auth.currentUser.uid;
            const likeUids = msg.reactions?.like ?? [];
            const loveUids = msg.reactions?.love ?? [];
            const iLiked = likeUids.includes(auth.currentUser?.uid);
            const iLoved = loveUids.includes(auth.currentUser?.uid);

            return (
              <div key={msg.id}>
                {/* DATE DIVIDER */}
                {shouldShowDivider(msg, previousMsg) && (
                  <div className="bc-divider">
                    <span>{formatDateDivider(msg.createdAt)}</span>
                  </div>
                )}

                <div
                  className={`bc-message-wrapper ${
                    isMine ? "bc-message-wrapper-right" : "bc-message-wrapper-left"
                  }`}
                >
                  {!isMine && (
                    <div className="bc-avatar" aria-hidden="true">
                      {getInitials(msg.senderName)}
                    </div>
                  )}

                  <div className="bc-message-card">
                    <div className="bc-message-meta">
                      <strong>{isMine ? "You" : msg.senderName}</strong>
                      <span className="bc-role-chip">{msg.senderRole}</span>
                      {msg.recipient && msg.recipient !== "All Staffs" && (
                        <span className="bc-to-chip">
                          <i className="fa-solid fa-arrow-right"></i>
                          {msg.recipient}
                        </span>
                      )}

                      {isMine && (
                        <div
                          className="bc-msg-menu"
                          ref={(el) => menuRefs.current.set(msg.id, el)}
                        >
                          <button
                            className={`bc-msg-menu-trigger ${openMenuId === msg.id ? "is-open" : ""}`}
                            onClick={() => {
                              setOpenMenuId((prev) => (prev === msg.id ? null : msg.id));
                              setConfirmingId(null);
                            }}
                            aria-label="Message options"
                          >
                            <i className="fa-solid fa-ellipsis"></i>
                          </button>

                          {openMenuId === msg.id && (
                            <div className="bc-msg-menu-dropdown">
                              {confirmingId === msg.id ? (
                                <div className="bc-msg-menu-confirm">
                                  <span>Unsend this message?</span>
                                  <div className="bc-msg-menu-confirm-actions">
                                    <button
                                      className="bc-msg-menu-confirm-cancel"
                                      onClick={() => setConfirmingId(null)}
                                    >
                                      Keep
                                    </button>
                                    <button
                                      className="bc-msg-menu-confirm-danger"
                                      onClick={() => unsendMessage(msg.id)}
                                    >
                                      Unsend
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="bc-msg-menu-item is-danger"
                                  onClick={() => setConfirmingId(msg.id)}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                  Unsend for everyone
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`bc-bubble ${isMine ? "bc-bubble-right" : "bc-bubble-left"}`}
                      title={formatTimestamp(msg.createdAt)}
                    >
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="attachment"
                          className="bc-image"
                          onClick={() => setLightboxImage(msg.imageUrl)}
                        />
                      )}

                      {msg.fileUrl && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bc-file-link"
                        >
                          <i className="fa-solid fa-paperclip"></i>
                          {msg.fileName}
                        </a>
                      )}

                      {msg.content && <div className="bc-bubble-text">{msg.content}</div>}

                      {msg.createdAt && (
                        <div className="bc-message-time">
                          {msg.createdAt.toDate().toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>

                    <div className="bc-reactions">
                      <div className="bc-reaction-wrap">
                        <button
                          className={`bc-reaction-btn ${iLiked ? "is-active" : ""}`}
                          onClick={() => reactToMessage(msg.id, "like")}
                        >
                          👍
                          <span>{likeUids.length}</span>
                        </button>
                        {likeUids.length > 0 && (
                          <div className="bc-reaction-tooltip">{getReactorNames(likeUids)}</div>
                        )}
                      </div>

                      <div className="bc-reaction-wrap">
                        <button
                          className={`bc-reaction-btn ${iLoved ? "is-active" : ""}`}
                          onClick={() => reactToMessage(msg.id, "love")}
                        >
                          ❤️
                          <span>{loveUids.length}</span>
                        </button>
                        {loveUids.length > 0 && (
                          <div className="bc-reaction-tooltip">{getReactorNames(loveUids)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* COMPOSER */}
      {userRole === "Department Head" && (
        <div className="bc-composer">
          {(selectedImage || selectedFile) && (
            <div className="bc-attachments-preview">
              {selectedImage && (
                <div className="bc-attachment-chip">
                  {imagePreviewUrl && (
                    <img src={imagePreviewUrl} alt="" className="bc-attachment-thumb" />
                  )}
                  <span>{selectedImage.name}</span>
                  <button
                    className="bc-remove-attachment"
                    onClick={() => setSelectedImage(null)}
                    aria-label="Remove image"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}

              {selectedFile && (
                <div className="bc-attachment-chip">
                  <i className="fa-solid fa-file"></i>
                  <span>{selectedFile.name}</span>
                  <button
                    className="bc-remove-attachment"
                    onClick={() => setSelectedFile(null)}
                    aria-label="Remove file"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bc-toolbar">
            <div className="bc-toolbar-left">
              <button onClick={() => fileRef.current.click()} disabled={uploading} type="button">
                <i className="fa-solid fa-paperclip"></i>
                Attach
              </button>

              <input
                ref={fileRef}
                type="file"
                hidden
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />

              <button onClick={() => imageRef.current.click()} disabled={uploading} type="button">
                <i className="fa-regular fa-image"></i>
                Image
              </button>

              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setSelectedImage(e.target.files[0])}
              />
            </div>

            <div className="bc-select-wrap">
              <i className="fa-solid fa-users"></i>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={uploading}
              >
                <option>All Staffs</option>
                <option>Faculty</option>
                <option>Department Head</option>
                <option>Clerk</option>
                <option>Local Registrar</option>
              </select>
              <i className="fa-solid fa-chevron-down bc-chevron"></i>
            </div>
          </div>

          <div className="bc-send-area">
            <textarea
              rows={1}
              placeholder="Write an announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={uploading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) sendMessage();
                }
              }}
            />

            <button
              className="bc-send-btn"
              onClick={sendMessage}
              disabled={!canSend}
              aria-label="Send announcement"
            >
              {uploading ? (
                <span className="bc-spinner" />
              ) : (
                <i className="fa-solid fa-paper-plane"></i>
              )}
            </button>
          </div>

          <div className="bc-note">
            {uploading ? "Uploading…" : "Only Department Heads can publish announcements. Enter to send, Shift+Enter for a new line."}
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div className="bc-lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button
            className="bc-lightbox-close"
            onClick={() => setLightboxImage(null)}
            aria-label="Close image"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img
            src={lightboxImage}
            alt="Full size attachment"
            className="bc-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}