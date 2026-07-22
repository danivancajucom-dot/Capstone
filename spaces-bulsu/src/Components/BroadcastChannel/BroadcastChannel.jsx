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
  arrayRemove,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { logActivity } from "../../utils/logActivity";
import Toast from "../../Popup/Toast/Toast";

// ─── Cloudinary constants ─────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dzu1qb8oz";
const CLOUDINARY_UPLOAD_PRESET = "SpacesCICT";

// ─── Upload to Cloudinary (supports any file type) ────────────────────
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
  return data.secure_url; // returns URL for any file type (images, PDFs, etc.)
}

// ─── Helpers ──────────────────────────────────────────────────────────

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getFileIcon = (fileName = "") => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "fa-solid fa-file-pdf";
  if (["doc", "docx"].includes(ext)) return "fa-solid fa-file-word";
  if (["xls", "xlsx"].includes(ext)) return "fa-solid fa-file-excel";
  if (["ppt", "pptx"].includes(ext)) return "fa-solid fa-file-powerpoint";
  if (["zip", "rar", "7z"].includes(ext)) return "fa-solid fa-file-zipper";
  if (["txt"].includes(ext)) return "fa-solid fa-file-lines";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return "fa-solid fa-file-image";
  return "fa-solid fa-file";
};

const getFileColor = (fileName = "") => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "#dc2626";
  if (["doc", "docx"].includes(ext)) return "#2563eb";
  if (["xls", "xlsx"].includes(ext)) return "#16a34a";
  if ("ppt" === ext || "pptx" === ext) return "#ea580c";
  if (["zip", "rar", "7z"].includes(ext)) return "#8b5cf6";
  if (["txt"].includes(ext)) return "#6b7280";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "#ec4899";
  return "#64748b";
};

// ─── Link Preview ─────────────────────────────────────────────────────

const extractUrls = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
};

const fetchLinkPreview = async (url) => {
  try {
    const response = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    );
    if (!response.ok) throw new Error("Failed to fetch preview");
    const data = await response.json();
    const html = data.contents;

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    const descMatch = html.match(
      /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i
    );
    const description = descMatch ? descMatch[1].trim() : "";

    const imageMatch = html.match(
      /<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i
    );
    const image = imageMatch ? imageMatch[1].trim() : null;

    let finalImage = image;
    if (!finalImage) {
      try {
        const faviconUrl = new URL("/favicon.ico", url).href;
        const iconCheck = await fetch(faviconUrl, { method: "HEAD" });
        if (iconCheck.ok) finalImage = faviconUrl;
      } catch (e) { /* ignore */ }
    }

    return { title, description, image: finalImage, url };
  } catch (err) {
    console.warn("Link preview failed:", err);
    return null;
  }
};

// ─── Main Component ──────────────────────────────────────────────────

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
  const [linkPreview, setLinkPreview] = useState(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);

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

  // ─── Auth & User Data ─────────────────────────────────────────────

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserRole(data.role || "");
          setSenderName(
            `${data.firstName || ""} ${data.lastName || ""}`.trim()
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUserData();
  }, []);

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

  // ─── Messages Listener ─────────────────────────────────────────────

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
      setLoading(false);
    });

    return () => unsub();
  }, [userRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // ─── Image preview ─────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  // ─── Link preview ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchPreview = async () => {
      const urls = extractUrls(message);
      if (urls.length === 0) {
        setLinkPreview(null);
        return;
      }
      setFetchingPreview(true);
      const preview = await fetchLinkPreview(urls[0]);
      setLinkPreview(preview);
      setFetchingPreview(false);
    };

    const timer = setTimeout(fetchPreview, 600);
    return () => clearTimeout(timer);
  }, [message]);

  // ─── Click outside menu ────────────────────────────────────────────

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

  // ─── Send Message (Cloudinary) ─────────────────────────────────────

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
      let fileType = "";

      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage, "broadcast-images");
      }

      if (selectedFile) {
        // Upload to Cloudinary – works for all file types
        fileUrl = await uploadToCloudinary(selectedFile, "broadcast-files");
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      const urls = extractUrls(message);
      let previewData = null;
      if (urls.length > 0) {
        previewData = await fetchLinkPreview(urls[0]);
      }

      const broadcastRef = await addDoc(collection(db, "broadcastChannels"), {
        content: message,
        imageUrl,
        fileUrl,
        fileName,
        fileType,
        senderId: auth.currentUser.uid,
        senderName,
        senderRole: userRole,
        recipient,
        createdAt: serverTimestamp(),
        reactions: { like: [], love: [] },
        linkPreview: previewData || null,
      });

      // ─── Notifications ──────────────────────────────────────────

      const usersSnap = await getDocs(collection(db, "users"));
      const notifications = [];

      usersSnap.forEach((userDoc) => {
        const user = userDoc.data();
        const shouldNotify =
          recipient === "All Staffs"
            ? true
            : user.role?.toLowerCase() === recipient.toLowerCase();

        if (shouldNotify) {
          notifications.push(
            addDoc(collection(db, "notifications"), {
              userId: userDoc.id,
              ownerType: user.role.toLowerCase(),
              broadcastId: broadcastRef.id,
              title: "New Announcement",
              message: `${senderName} posted a new announcement.`,
              imageUrl,
              type: "broadcast",
              unread: true,
              archived: false,
              badge: "NEW",
              sender: senderName,
              createdAt: serverTimestamp(),
            })
          );
        }
      });

      await Promise.all(notifications);

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
      setLinkPreview(null);
      showToast("success", "Sent", "Announcement published successfully!");
    } catch (err) {
      console.error(err);
      showToast("error", "Send Failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Togglable Reactions ───────────────────────────────────────────

  const toggleReaction = async (id, type) => {
    try {
      const messageRef = doc(db, "broadcastChannels", id);
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;

      const uids = msg.reactions?.[type] || [];
      const hasReacted = uids.includes(auth.currentUser?.uid);

      await updateDoc(messageRef, {
        [`reactions.${type}`]: hasReacted
          ? arrayRemove(auth.currentUser.uid)
          : arrayUnion(auth.currentUser.uid),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Unsend (only remove from Firestore; Cloudinary files stay) ──

  const unsendMessage = async (id) => {
    try {
      // We don't delete from Cloudinary automatically (it's a free tier limitation)
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

  // ─── Helpers ─────────────────────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────────

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
                      {/* ─── IMAGE ──────────────────────────────────── */}
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="attachment"
                          className="bc-image"
                          onClick={() => setLightboxImage(msg.imageUrl)}
                        />
                      )}

                      {/* ─── FILE ───────────────────────────────────── */}
                      {msg.fileUrl && !msg.imageUrl && (
                        <div className="bc-file-attachment">
                          <div
                            className="bc-file-icon-wrapper"
                            style={{ color: getFileColor(msg.fileName) }}
                          >
                            <i className={getFileIcon(msg.fileName)}></i>
                          </div>
                          <div className="bc-file-info">
                            <span className="bc-file-name">{msg.fileName}</span>
                            <div className="bc-file-actions">
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bc-file-action-btn view"
                              >
                                <i className="fa-solid fa-eye"></i> View
                              </a>
                              <a
                                href={msg.fileUrl}
                                download={msg.fileName}
                                className="bc-file-action-btn download"
                              >
                                <i className="fa-solid fa-download"></i> Download
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ─── LINK PREVIEW ───────────────────────────── */}
                      {msg.linkPreview && (
                        <a
                          href={msg.linkPreview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bc-link-preview"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {msg.linkPreview.image && (
                            <img
                              src={msg.linkPreview.image}
                              alt=""
                              className="bc-link-image"
                            />
                          )}
                          <div className="bc-link-content">
                            <strong className="bc-link-title">
                              {msg.linkPreview.title}
                            </strong>
                            {msg.linkPreview.description && (
                              <span className="bc-link-description">
                                {msg.linkPreview.description}
                              </span>
                            )}
                            <span className="bc-link-url">{msg.linkPreview.url}</span>
                          </div>
                        </a>
                      )}

                      {/* ─── TEXT ───────────────────────────────────── */}
                      {msg.content && <div className="bc-bubble-text">{msg.content}</div>}

                      {/* ─── TIMESTAMP ───────────────────────────────── */}
                      {msg.createdAt && (
                        <div className="bc-message-time">
                          {msg.createdAt.toDate().toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>

                    {/* ─── REACTIONS ────────────────────────────────── */}
                    <div className="bc-reactions">
                      {likeUids.length > 0 || loveUids.length > 0 ? (
                        <>
                          {likeUids.length > 0 && (
                            <div className="bc-reaction-wrap">
                              <button
                                className={`bc-reaction-btn ${iLiked ? "is-active" : ""}`}
                                onClick={() => toggleReaction(msg.id, "like")}
                              >
                                👍 {likeUids.length}
                              </button>
                              {likeUids.length > 0 && (
                                <div className="bc-reaction-tooltip">
                                  {getReactorNames(likeUids)}
                                </div>
                              )}
                            </div>
                          )}
                          {loveUids.length > 0 && (
                            <div className="bc-reaction-wrap">
                              <button
                                className={`bc-reaction-btn ${iLoved ? "is-active" : ""}`}
                                onClick={() => toggleReaction(msg.id, "love")}
                              >
                                ❤️ {loveUids.length}
                              </button>
                              {loveUids.length > 0 && (
                                <div className="bc-reaction-tooltip">
                                  {getReactorNames(loveUids)}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        // Show empty reactions so users can still react
                        <>
                          <button
                            className="bc-reaction-btn"
                            onClick={() => toggleReaction(msg.id, "like")}
                          >
                            👍 0
                          </button>
                          <button
                            className="bc-reaction-btn"
                            onClick={() => toggleReaction(msg.id, "love")}
                          >
                            ❤️ 0
                          </button>
                        </>
                      )}
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

          {/* ─── Link preview in composer ──────────────────────────── */}
          {linkPreview && !selectedImage && !selectedFile && (
            <div className="bc-composer-link-preview">
              {linkPreview.image && (
                <img src={linkPreview.image} alt="" className="bc-composer-link-image" />
              )}
              <div className="bc-composer-link-content">
                <strong>{linkPreview.title}</strong>
                {linkPreview.description && <span>{linkPreview.description}</span>}
                <span className="bc-composer-link-url">{linkPreview.url}</span>
              </div>
              <button
                className="bc-composer-link-remove"
                onClick={() => setLinkPreview(null)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
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