import { useState, useEffect, useRef } from "react";
import "./faculty-profile.css";

import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import Toast from "../../Popup/Toast/Toast";

// ── Cloudinary config ─────────────────────────────────────────────────────────
// Replace these two values with your own from the Cloudinary dashboard
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

export default function UserProfile() {
  const [editing, setEditing]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoFile, setPhotoFile]   = useState(null);
  const fileInputRef                = useRef(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName:  "",
    email:     "",
    role:      "",
    photoUrl:  "",
  });

  const [originalData, setOriginalData] = useState(null);

  const [toast, setToast] = useState({
    show: false, type: "success", title: "", message: "",
  });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        showToast("error", "Authentication Error", "No logged in user found.");
        setLoading(false);
        return;
      }

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
        showToast("error", "Profile Error", err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Photo selection ─────────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Invalid File", "Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "File Too Large", "Image must be smaller than 5 MB.");
      return;
    }

    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const nameUnchanged =
      form.firstName === originalData.firstName &&
      form.lastName  === originalData.lastName;
    const photoUnchanged = !photoFile;

    if (nameUnchanged && photoUnchanged) {
      showToast("error", "No Changes", "Nothing to save.");
      return;
    }

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

      showToast("success", "Profile Updated", "Your profile has been updated successfully.");
    } catch (err) {
      console.error(err);
      setUploading(false);
      showToast("error", "Update Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (originalData) setForm(originalData);
    setPhotoFile(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    setEditing(false);
  };

  // ── Password reset ──────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, form.email);
      showToast("success", "Reset Email Sent", "Check your inbox for password reset instructions.");
    } catch (err) {
      console.error(err);
      showToast("error", "Reset Failed", err.message);
    }
  };

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  // ── Avatar: preview → saved photo → initials fallback ──────────────────────
  const displayPhoto = previewUrl || form.photoUrl;
  const initials = `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase();

  if (loading) {
    return (
      <div className="up-page">
        <div className="up-card">
          <h3>Loading profile...</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="up-page">
        <div className="up-card">

          {!editing && (
            <button className="up-edit-btn" onClick={() => setEditing(true)}>
              <i className="fa-solid fa-pen" />
            </button>
          )}

          {/* ── Avatar ── */}
          <div className="up-avatar-wrap">
            <div className="up-avatar">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Profile" className="up-avatar-img" />
              ) : (
                initials
                  ? <span className="up-avatar-initials">{initials}</span>
                  : <i className="fa-solid fa-user" />
              )}
            </div>

            {/* Camera overlay button when editing */}
            {editing && (
              <button
                className="up-avatar-camera"
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

          {/* File input (hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoChange}
          />

          {/* Selected file feedback */}
          {editing && photoFile && !uploading && (
            <p className="up-photo-name">
              <i className="fa-solid fa-circle-check" /> {photoFile.name}
            </p>
          )}

          {editing && uploading && (
            <p className="up-upload-progress">
              <i className="fa-solid fa-circle-notch fa-spin" /> Uploading photo…
            </p>
          )}

          {/* Upload button (shown when editing and no file chosen yet) */}
          {editing && !photoFile && !uploading && (
            <button
              className="up-upload-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fa-solid fa-arrow-up-from-bracket" /> Upload Picture
            </button>
          )}

          {/* ── Fields ── */}
          <div className="up-fields">
            <div className="up-field">
              <label>First Name</label>
              <input
                className="up-input"
                value={form.firstName}
                onChange={handleChange("firstName")}
                readOnly={!editing}
              />
            </div>

            <div className="up-field">
              <label>Last Name</label>
              <input
                className="up-input"
                value={form.lastName}
                onChange={handleChange("lastName")}
                readOnly={!editing}
              />
            </div>

            <div className="up-field">
              <label>Email</label>
              <input className="up-input" value={form.email} readOnly />
            </div>

            <div className="up-field">
              <label>Role</label>
              <input className="up-input" value={form.role} readOnly />
            </div>

            <div className="up-field">
              <label>Password</label>
              <button className="up-reset-password-btn" onClick={handleResetPassword}>
                Send Password Reset Email
              </button>
            </div>
          </div>

        </div>

        {editing && (
          <div className="up-footer">
            <button className="up-cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="up-save-btn"
              onClick={handleSave}
              disabled={saving || uploading}
            >
              {uploading ? "Uploading…" : saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </>
  );
}
