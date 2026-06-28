import { useState, useEffect, useRef } from "react";
import "./departmenthead-profile.css";

import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";

const CLOUDINARY_CLOUD_NAME    = "dzu1qb8oz";
const CLOUDINARY_UPLOAD_PRESET = "SpacesCICT";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "spaces/profiles");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Image upload failed. Please try again.");
  const data = await res.json();
  return data.secure_url;
}

export default function DepartmentHeadProfile() {
  const [editing, setEditing]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoFile, setPhotoFile]   = useState(null);
  const fileInputRef                = useRef(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", role: "", photoUrl: "",
  });

  const [originalData, setOriginalData] = useState(null);
  const [toast, setToast]               = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { showToast("error", "No logged in user found."); setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (!snap.exists()) throw new Error("User profile not found.");
        const data = snap.data();
        const profile = {
          firstName: data.firstName || "",
          lastName:  data.lastName  || "",
          email:     data.email     || "",
          role:      data.role      || "",
          photoUrl:  data.photoUrl  || "",
        };
        setForm(profile);
        setOriginalData(profile);
      } catch (err) {
        console.error(err);
        showToast("error", err.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("error", "Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024)    { showToast("error", "Image must be smaller than 5 MB."); return; }
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const nameUnchanged =
      form.firstName === originalData.firstName &&
      form.lastName  === originalData.lastName;
    if (nameUnchanged && !photoFile) { showToast("error", "Nothing to save."); return; }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User session expired.");

      let photoUrl = form.photoUrl;
      if (photoFile) {
        setUploading(true);
        photoUrl = await uploadToCloudinary(photoFile);
        setUploading(false);
      }

      await updateDoc(doc(db, "users", currentUser.uid), {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        photoUrl,
      });

      const updatedData = { ...form, photoUrl };
      setForm(updatedData);
      setOriginalData(updatedData);
      setPhotoFile(null);
      setPreviewUrl(null);
      setEditing(false);
      showToast("success", "Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setUploading(false);
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) setForm(originalData);
    setPhotoFile(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setEditing(false);
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, form.email);
      showToast("success", "Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error(err);
      showToast("error", err.message);
    }
  };

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const displayPhoto = previewUrl || form.photoUrl;
  const initials = `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase();

  if (loading) {
    return (
      <div className="dhp-page">
        <div className="dhp-card">
          <p style={{ color: "#6b7280" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dhp-page">

      {toast && (
        <div className={`dhp-toast ${toast.type}`}>
          <i className={`fa-solid ${toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}`} />
          {toast.message}
        </div>
      )}

      <div className="dhp-card">

        {!editing && (
          <button className="dhp-edit-btn" onClick={() => setEditing(true)}>
            <i className="fa-solid fa-pen" />
          </button>
        )}

        {/* Avatar */}
        <div className="dhp-avatar-wrap">
          <div className="dhp-avatar">
            {displayPhoto
              ? <img src={displayPhoto} alt="Profile" className="dhp-avatar-img" />
              : <span className="dhp-avatar-initials">{initials || <i className="fa-solid fa-user" />}</span>
            }
          </div>
          {editing && (
            <button
              className="dhp-avatar-camera"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change photo"
            >
              {uploading
                ? <i className="fa-solid fa-circle-notch fa-spin" />
                : <i className="fa-solid fa-camera" />
              }
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />

        {editing && photoFile && !uploading && (
          <p className="dhp-photo-name"><i className="fa-solid fa-circle-check" /> {photoFile.name}</p>
        )}
        {editing && uploading && (
          <p className="dhp-upload-progress"><i className="fa-solid fa-circle-notch fa-spin" /> Uploading photo…</p>
        )}
        {editing && !photoFile && !uploading && (
          <button className="dhp-upload-btn" type="button" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-arrow-up-from-bracket" /> Upload Picture
          </button>
        )}

        {/* Fields */}
        <div className="dhp-fields">
          <div className="dhp-field">
            <label>First Name</label>
            <input className="dhp-input" value={form.firstName} onChange={handleChange("firstName")} readOnly={!editing} />
          </div>
          <div className="dhp-field">
            <label>Last Name</label>
            <input className="dhp-input" value={form.lastName} onChange={handleChange("lastName")} readOnly={!editing} />
          </div>
          <div className="dhp-field">
            <label>Email</label>
            <input className="dhp-input" value={form.email} readOnly />
          </div>
          <div className="dhp-field">
            <label>Role</label>
            <input className="dhp-input" value={form.role} readOnly />
          </div>
          <div className="dhp-field">
            <label>Password</label>
            <button className="dhp-reset-password-btn" onClick={handleResetPassword}>
              Send Password Reset Email
            </button>
          </div>
        </div>

      </div>

      {editing && (
        <div className="dhp-footer">
          <button className="dhp-cancel-btn" onClick={handleCancel}>Cancel</button>
          <button className="dhp-save-btn" onClick={handleSave} disabled={saving || uploading}>
            {uploading ? "Uploading…" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

    </div>
  );
}
