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
const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function uploadToCloudinary(file, folder) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit.`
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `spaces/${folder}`);

  const isImage = file.type?.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `Upload failed: ${res.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) errorMessage = errorJson.error.message;
    } catch (e) {}
    throw new Error(errorMessage);
  }
  const data = await res.json();
  return data.secure_url;
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
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "fa-solid fa-file-image";
  return "fa-solid fa-file";
};

const getFileColor = (fileName = "") => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "#dc2626";
  if (["doc", "docx"].includes(ext)) return "#2563eb";
  if (["xls", "xlsx"].includes(ext)) return "#16a34a";
  if (["ppt", "pptx"].includes(ext)) return "#ea580c";
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
      `https://api.microlink.io?url=${encodeURIComponent(url)}`
    );
    if (!response.ok) throw new Error(`Microlink API error: ${response.status}`);
    const data = await response.json();
    if (!data.data) throw new Error("No preview data returned");
    const { title, description, image } = data.data;
    return {
      title: title || url,
      description: description || "",
      image: image?.url || null,
      url: url,
    };
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
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
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
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
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
          setSenderName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
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

  // ─── Link preview ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchPreview = async () => {
      const urls = extractUrls(message);
      if (urls.length === 0) {
        setLinkPreview(null);
        setFetchingPreview(false);
        return;
      }
      setFetchingPreview(true);
      try {
        const preview = await fetchLinkPreview(urls[0]);
        setLinkPreview(preview);
      } catch (err) {
        console.error("❌ Preview fetch error:", err);
        setLinkPreview(null);
      } finally {
        setFetchingPreview(false);
      }
    };
    const timer = setTimeout(fetchPreview, 700);
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

  // ─── Attachment handlers ────────────────────────────────────────────

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Send Message ─────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (userRole !== "Department Head") {
      showToast("error", "Not Allowed", "Only Department Head can send announcements.");
      return;
    }

    if (!message.trim() && selectedImages.length === 0 && selectedFiles.length === 0) return;

    setUploading(true);

    try {
      // Upload images
      const imageUrls = [];
      for (const img of selectedImages) {
        try {
          const url = await uploadToCloudinary(img, "broadcast-images");
          imageUrls.push(url);
        } catch (err) {
          showToast("error", "Image Upload Failed", err.message);
          setUploading(false);
          return;
        }
      }

      // Upload files
      const filesData = [];
      for (const file of selectedFiles) {
        try {
          const url = await uploadToCloudinary(file, "broadcast-files");
          filesData.push({ url, name: file.name, type: file.type });
        } catch (err) {
          showToast("error", "File Upload Failed", err.message);
          setUploading(false);
          return;
        }
      }

      const previewData = linkPreview;

      // Build data object – keep both single and multi for backward compatibility
      const data = {
        content: message,
        senderId: auth.currentUser.uid,
        senderName,
        senderRole: userRole,
        recipient,
        createdAt: serverTimestamp(),
        reactions: { like: [], love: [] },
        linkPreview: previewData || null,
      };

      // Single image (for old display)
      if (imageUrls.length === 1) {
        data.imageUrl = imageUrls[0];
      } else if (imageUrls.length > 1) {
        data.imageUrl = imageUrls[0]; // fallback
      }

      if (imageUrls.length > 0) {
        data.imageUrls = imageUrls;
      }

      // Single file (for old display)
      if (filesData.length === 1) {
        data.fileUrl = filesData[0].url;
        data.fileName = filesData[0].name;
        data.fileType = filesData[0].type;
      } else if (filesData.length > 1) {
        data.fileUrl = filesData[0].url;
        data.fileName = filesData[0].name;
        data.fileType = filesData[0].type;
      }

      if (filesData.length > 0) {
        data.files = filesData;
      }

      const broadcastRef = await addDoc(collection(db, "broadcastChannels"), data);

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
              imageUrl: imageUrls.length ? imageUrls[0] : null,
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
          message: message.trim() || (imageUrls.length ? "Image Attachments" : filesData.length ? "File Attachments" : "Announcement"),
          imageCount: imageUrls.length,
          fileCount: filesData.length,
          hasLink: !!previewData,
        },
      });

      setMessage("");
      setSelectedImages([]);
      setSelectedFiles([]);
      setLinkPreview(null);
      showToast("success", "Sent", "Announcement published successfully!");
    } catch (err) {
      console.error(err);
      showToast("error", "Send Failed", err.message || "Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Reactions & Unsend ────────────────────────────────────────────

  const toggleReaction = async (id, type) => {
    try {
      const messageRef = doc(db, "broadcastChannels", id);
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;

      const uids = msg.reactions?.[type] || [];
      const hasReacted = uids.includes(auth.currentUser?.uid);

      await updateDoc(messageRef, {
        [`reactions.${type}`]: hasReacted ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid),
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

  const canSend =
    !uploading && (message.trim() || selectedImages.length > 0 || selectedFiles.length > 0);

  // ─── File display component ─────────────────────────────────────────

  const FileAttachment = ({ fileUrl, fileName }) => {
    if (!fileUrl) return null;

    const icon = getFileIcon(fileName);
    const color = getFileColor(fileName);
    const viewUrl = fileUrl.includes("?")
      ? `${fileUrl}&fl_attachment=0`
      : `${fileUrl}?fl_attachment=0`;

    return (
      <div className="bc-file-attachment">
        <div className="bc-file-icon-wrapper" style={{ color }}>
          <i className={icon}></i>
        </div>
        <div className="bc-file-info">
          <span className="bc-file-name">{fileName || "File"}</span>
          <div className="bc-file-actions">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bc-file-action-btn view"
            >
              <i className="fa-solid fa-eye"></i> View
            </a>
            <a
              href={fileUrl}
              download={fileName || "file"}
              className="bc-file-action-btn download"
            >
              <i className="fa-solid fa-download"></i> Download
            </a>
          </div>
        </div>
      </div>
    );
  };

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

            // Determine which images to show (array first, fallback to single)
            const imageUrls = msg.imageUrls || (msg.imageUrl ? [msg.imageUrl] : []);
            // Determine which files to show (array first, fallback to single)
            const files = msg.files || (msg.fileUrl ? [{ url: msg.fileUrl, name: msg.fileName || "File", type: msg.fileType || "" }] : []);

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
                      {/* ─── IMAGES ──────────────────────────────────── */}
                      {imageUrls.length > 0 && (
                        <div className="bc-images-grid">
                          {imageUrls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`attachment ${i}`}
                              className="bc-image"
                              onClick={() => setLightboxImage(url)}
                            />
                          ))}
                        </div>
                      )}

                      {/* ─── FILES ───────────────────────────────────── */}
                      {files.length > 0 && (
                        <div className="bc-files-list">
                          {files.map((file, i) => (
                            <FileAttachment key={i} fileUrl={file.url} fileName={file.name} />
                          ))}
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
                            <img src={msg.linkPreview.image} alt="" className="bc-link-image" />
                          )}
                          <div className="bc-link-content">
                            <strong className="bc-link-title">{msg.linkPreview.title}</strong>
                            {msg.linkPreview.description && (
                              <span className="bc-link-description">{msg.linkPreview.description}</span>
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
                                <div className="bc-reaction-tooltip">{getReactorNames(likeUids)}</div>
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
                                <div className="bc-reaction-tooltip">{getReactorNames(loveUids)}</div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <button className="bc-reaction-btn" onClick={() => toggleReaction(msg.id, "like")}>
                            👍 0
                          </button>
                          <button className="bc-reaction-btn" onClick={() => toggleReaction(msg.id, "love")}>
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
          {/* ─── Attachments preview ────────────────────────────────── */}
          {(selectedImages.length > 0 || selectedFiles.length > 0) && (
            <div className="bc-attachments-preview">
              {selectedImages.map((img, idx) => (
                <div key={`img-${idx}`} className="bc-attachment-chip">
                  <img src={URL.createObjectURL(img)} alt="" className="bc-attachment-thumb" />
                  <span>{img.name}</span>
                  <button className="bc-remove-attachment" onClick={() => removeImage(idx)}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
              {selectedFiles.map((file, idx) => (
                <div key={`file-${idx}`} className="bc-attachment-chip">
                  <i className="fa-solid fa-file"></i>
                  <span>{file.name}</span>
                  <button className="bc-remove-attachment" onClick={() => removeFile(idx)}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ─── Link preview in composer ──────────────────────────── */}
          {fetchingPreview && selectedImages.length === 0 && selectedFiles.length === 0 && (
            <div className="bc-composer-link-preview bc-composer-link-loading">
              <div className="bc-spinner-small" />
              <span>Loading preview…</span>
            </div>
          )}

          {linkPreview && selectedImages.length === 0 && selectedFiles.length === 0 && (
            <div className="bc-composer-link-preview">
              {linkPreview.image && (
                <img src={linkPreview.image} alt="" className="bc-composer-link-image" />
              )}
              <div className="bc-composer-link-content">
                <strong>{linkPreview.title}</strong>
                {linkPreview.description && <span>{linkPreview.description}</span>}
                <span className="bc-composer-link-url">{linkPreview.url}</span>
              </div>
              <button className="bc-composer-link-remove" onClick={() => setLinkPreview(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          <div className="bc-toolbar">
            <div className="bc-toolbar-left">
              <button onClick={() => fileRef.current.click()} disabled={uploading} type="button">
                <i className="fa-solid fa-paperclip"></i> Attach
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={handleFileSelect}
              />

              <button onClick={() => imageRef.current.click()} disabled={uploading} type="button">
                <i className="fa-regular fa-image"></i> Image
              </button>
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageSelect}
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
              placeholder="Write an announcement…"
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
              {uploading ? <span className="bc-spinner" /> : <i className="fa-solid fa-paper-plane"></i>}
            </button>
          </div>

          <div className="bc-note">
            {uploading
              ? "Uploading…"
              : "Only Department Heads can publish announcements. Enter to send, Shift+Enter for a new line."}
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