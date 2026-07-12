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
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";

const CLOUDINARY_CLOUD_NAME    = "dzu1qb8oz";
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

export default function BroadcastChannel() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("All Staffs");
  const [userRole, setUserRole] = useState("");
  const [senderName, setSenderName] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const imageRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;

      try {
        const snap = await getDoc(
          doc(db, "users", auth.currentUser.uid)
        );

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
    if (!userRole) return;

    const q = query(
      collection(db, "broadcastChannels"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filteredMessages = allMessages.filter(
        (msg) => {
          if (msg.recipient === "All Staffs")
            return true;

          if (
            msg.senderId === auth.currentUser?.uid
          )
            return true;

          return msg.recipient === userRole;
        }
      );
      setMessages(filteredMessages);
    });

    return () => unsub();
  }, [userRole]);

  const sendMessage = async () => {
    if (userRole !== "Department Head") {
      alert(
        "Only Department Head can send announcements."
      );
      return;
    }

    if (
      !message.trim() &&
      !selectedImage &&
      !selectedFile
    )
      return;

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

      await addDoc(
        collection(db, "broadcastChannels"),
        {
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
        }
      );

      setMessage("");
      setSelectedImage(null);
      setSelectedFile(null);
      alert("Message sent successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to send message: " + err.message);
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

    const sameDay =
      current.toDateString() === previous.toDateString();

    const diffMinutes =
      (current - previous) / 1000 / 60;

    return !sameDay || diffMinutes >= 20;
  };

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
              {userRole === "Department Head"
                ? "Send announcements"
                : "Department announcements"}
            </span>
          </div>

        </div>

        <div className="bc-message-counter">
          <i className="fa-regular fa-message"></i>
          {messages.length} announcements
        </div>

      </div>

      {/* MESSAGES */}
      <div className="bc-messages">
        {messages.length === 0 && (
          <div className="bc-empty-state">
            <i className="fa-solid fa-bullhorn"></i>
            <p>No announcements yet.</p>
          </div>
        )}
        {messages.map((msg, index) => {
          const previousMsg = messages[index - 1];
          const isMine =
            auth.currentUser &&
            msg.senderId === auth.currentUser.uid;

          return (
            <div key={msg.id}>

              {/* DATE DIVIDER */}
              {shouldShowDivider(msg, previousMsg) && (
                <div className="bc-divider">
                  <span>
                    {formatDateDivider(msg.createdAt)}
                  </span>
                </div>
              )}

              <div
                className={`bc-message-wrapper ${
                  isMine
                    ? "bc-message-wrapper-right"
                    : "bc-message-wrapper-left"
                }`}
              >
                <div className="bc-message-card">

                  <div
                    className={`bc-bubble ${
                      isMine
                        ? "bc-bubble-right"
                        : "bc-bubble-left"
                    }`}
                    title={formatTimestamp(msg.createdAt)}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="attachment"
                        className="bc-image"
                      />
                    )}

                    {msg.fileUrl && (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bc-file-link"
                      >
                        📎 {msg.fileName}
                      </a>
                    )}

                    {msg.content}

                    {msg.createdAt && (
                      <div className="bc-message-time">
                        {msg.createdAt
                          .toDate()
                          .toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                      </div>
                    )}
                  </div>

                  <div className="bc-message-meta">
                    <strong>{msg.senderName}</strong>
                    <span>{msg.senderRole}</span>
                  </div>

                  <div className="bc-reactions">

                    <button
                      className="bc-reaction-btn"
                      onClick={() =>
                        reactToMessage(msg.id, "like")
                      }
                    >
                      👍
                      <span>
                        {(msg.reactions?.like ?? []).length}
                      </span>
                    </button>

                    <button
                      className="bc-reaction-btn"
                      onClick={() =>
                        reactToMessage(msg.id, "love")
                      }
                    >
                      ❤️
                      <span>
                        {(msg.reactions?.love ?? []).length}
                      </span>
                    </button>

                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPOSER */}

      {userRole === "Department Head" && (
        <div className="bc-composer">

          <div className="bc-toolbar">
            {selectedImage && (
              <div className="bc-selected-file">
                🖼️ {selectedImage.name}
              </div>
            )}

            {selectedFile && (
              <div className="bc-selected-file">
                📎 {selectedFile.name}
              </div>
            )}

            <button 
              onClick={() => fileRef.current.click()}
              disabled={uploading}
            >
              <i className="fa-solid fa-paperclip"></i>
              Attach
            </button>

            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) =>
                setSelectedFile(
                  e.target.files[0]
                )
              }
            />

            <select
              value={recipient}
              onChange={(e) =>
                setRecipient(e.target.value)
              }
              disabled={uploading}
            >
              <option>All Staffs</option>
              <option>Faculty</option>
              <option>Department Head</option>
              <option>Clerk</option>
              <option>Local Registrar</option>
            </select>

            <button 
              onClick={() => imageRef.current.click()}
              disabled={uploading}
            >
              <i className="fa-regular fa-image"></i>
              Image
            </button>

            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) =>
                setSelectedImage(
                  e.target.files[0]
                )
              }
            />

          </div>

          <div className="bc-send-area">

            <input
              type="text"
              placeholder="Write an announcement..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              disabled={uploading}
            />

            <button
              className="bc-send-btn"
              onClick={sendMessage}
              disabled={uploading}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>

          </div>

          <div className="bc-note">
            {uploading ? "Uploading..." : "Only Department Heads can publish announcements."}
          </div>

        </div>
      )}

    </div>
  );
}
