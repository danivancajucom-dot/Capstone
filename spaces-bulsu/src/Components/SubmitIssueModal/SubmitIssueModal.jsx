import { useState, useEffect, useRef } from "react";
import "./submit-issue-modal.css";
import { auth, db } from "../../firebase";
import { collection, addDoc, getDoc, getDocs, doc, serverTimestamp } from "firebase/firestore";
import Toast from "../../Popup/Toast/Toast";

const CLOUDINARY_CLOUD_NAME    = "dqn1s5ujs";
const CLOUDINARY_UPLOAD_PRESET = "SpaceSCICT";

const CATEGORIES = [
  { value: "Electrical",         icon: "fa-bolt",            label: "Electrical" },
  { value: "Plumbing / Leak",    icon: "fa-droplet",         label: "Plumbing / Leak" },
  { value: "Network / Internet", icon: "fa-wifi",            label: "Network / Internet" },
  { value: "Equipment",          icon: "fa-video",           label: "Equipment" },
  { value: "Air Conditioning",   icon: "fa-snowflake",       label: "Air Conditioning" },
  { value: "Furniture",          icon: "fa-chair",           label: "Furniture" },
  { value: "Cleanliness",        icon: "fa-broom",           label: "Cleanliness" },
  { value: "Security",           icon: "fa-shield-halved",   label: "Security" },
  { value: "Other",              icon: "fa-circle-question", label: "Other" },
];

const SEVERITIES = [
  { value: "Low",    label: "Low",    color: "#16a34a" },
  { value: "Medium", label: "Medium", color: "#eab308" },
  { value: "High",   label: "High",   color: "#f97316" },
  { value: "Urgent", label: "Urgent", color: "#dc2626" },
];

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder", "spaces/room-issues");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd }
  );
  if (!res.ok) throw new Error("Photo upload failed.");
  const data = await res.json();
  return data.secure_url;
}

export default function SubmitIssueModal({ open, onClose, onSubmitted, presetRoomId = "" }) {
  const [rooms, setRooms]               = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [uploading, setUploading]       = useState(false);

  const [form, setForm] = useState({
    roomId: presetRoomId || "", category: "", severity: "Medium", description: "",
  });
  const [photoFile, setPhotoFile]   = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingRooms(true);
      try {
        const snap = await getDocs(collection(db, "rooms"));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.roomName || "").localeCompare(b.roomName || ""));
        setRooms(list);
      } catch (err) { console.error(err); }
      finally { setLoadingRooms(false); }
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm({ roomId: presetRoomId || "", category: "", severity: "Medium", description: "" });
      setPhotoFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [open, presetRoomId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Invalid File", "Please select an image."); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "File Too Large", "Image must be under 5 MB."); return;
    }
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.roomId) return showToast("error", "Select Room", "Please select the room.");
    if (!form.category) return showToast("error", "Select Category", "Please choose a category.");
    if (!form.description.trim() || form.description.trim().length < 5)
      return showToast("error", "Description Required", "Please describe the issue (min 5 characters).");

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated.");

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const ud = userSnap.exists() ? userSnap.data() : {};
      const reporterName = `${ud.firstName || ""} ${ud.lastName || ""}`.trim() || user.email;
      const reporterRole = ud.role || "";

      const selectedRoom = rooms.find(r => r.id === form.roomId);

      let photoUrl = "";
      if (photoFile) {
        setUploading(true);
        photoUrl = await uploadToCloudinary(photoFile);
        setUploading(false);
      }

      await addDoc(collection(db, "roomIssues"), {
        roomId:         form.roomId,
        roomName:       selectedRoom?.roomName || "",
        floor:          selectedRoom?.floor || "",
        category:       form.category,
        severity:       form.severity,
        description:    form.description.trim(),
        photoUrl,
        reporterId:     user.uid,
        reporterName,
        reporterRole,
        status:         "Pending",
        clerkNotes:     "",
        acknowledgedBy: "",
        acknowledgedAt: null,
        resolvedBy:     "",
        resolvedAt:     null,
        createdAt:      serverTimestamp(),
      });

      showToast("success", "Issue Reported", "Your report has been submitted.");
      onSubmitted?.();
      setTimeout(() => onClose?.(), 800);
    } catch (err) {
      console.error(err);
      showToast("error", "Submission Failed", err.message);
      setUploading(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="sim-overlay" onClick={() => !submitting && onClose?.()}>
        <div className="sim-modal" onClick={e => e.stopPropagation()}>
          <div className="sim-header">
            <div className="sim-header-icon"><i className="fa-solid fa-triangle-exclamation" /></div>
            <div className="sim-header-text">
              <h3>Report Room Issue</h3>
              <p>Help us keep CICT classrooms in top condition.</p>
            </div>
            <button className="sim-close" onClick={onClose} disabled={submitting}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="sim-body">
            {/* Room */}
            <div className="sim-field">
              <label>Room <span className="sim-required">*</span></label>
              <div className="sim-select-wrap">
                <i className="fa-solid fa-door-open sim-select-icon" />
                <select
                  value={form.roomId}
                  onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  disabled={loadingRooms || !!presetRoomId}
                  className="sim-select"
                >
                  <option value="">{loadingRooms ? "Loading rooms..." : "Select a room"}</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.roomName}{r.floor ? ` — ${r.floor}` : ""}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-angle-down sim-select-chev" />
              </div>
            </div>

            {/* Category grid */}
            <div className="sim-field">
              <label>Issue Category <span className="sim-required">*</span></label>
              <div className="sim-cat-grid">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`sim-cat ${form.category === c.value ? "active" : ""}`}
                    onClick={() => setForm(f => ({ ...f, category: c.value }))}
                  >
                    <i className={`fa-solid ${c.icon}`} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="sim-field">
              <label>Severity</label>
              <div className="sim-sev-row">
                {SEVERITIES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    className={`sim-sev ${form.severity === s.value ? "active" : ""}`}
                    style={{ "--sev-color": s.color }}
                    onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                  >
                    <span className="sim-sev-dot" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="sim-field">
              <label>Description <span className="sim-required">*</span></label>
              <textarea
                className="sim-textarea"
                rows={4}
                maxLength={500}
                placeholder="Describe the issue briefly — what happened, where exactly, and how severe."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <span className="sim-counter">{form.description.length}/500</span>
            </div>

            {/* Photo */}
            <div className="sim-field">
              <label>Photo <span className="sim-optional">(optional)</span></label>

              {previewUrl ? (
                <div className="sim-photo-preview">
                  <img src={previewUrl} alt="Preview" />
                  <button
                    type="button"
                    className="sim-photo-remove"
                    onClick={() => {
                      setPhotoFile(null);
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }}
                  >
                    <i className="fa-solid fa-trash" /> Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="sim-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <i className="fa-solid fa-camera" /> Attach Photo
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="sim-footer">
            <button className="sim-btn cancel" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="sim-btn submit" onClick={handleSubmit} disabled={submitting || uploading}>
              {submitting || uploading
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> Submitting...</>
                : <><i className="fa-solid fa-paper-plane" /> Submit Report</>
              }
            </button>
          </div>
        </div>
      </div>

      <Toast
        show={toast.show} type={toast.type} title={toast.title} message={toast.message}
        onClose={() => setToast(p => ({ ...p, show: false }))}
      />
    </>
  );
}