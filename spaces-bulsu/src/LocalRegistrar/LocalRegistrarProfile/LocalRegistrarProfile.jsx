import { useState, useEffect, useRef } from "react";
import "./local-registrar-profile.css";

import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import Toast from "../../Popup/Toast/Toast";

// ── Cloudinary config ───────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dqn1s5ujs";
const CLOUDINARY_UPLOAD_PRESET = "SpaceSCICT";

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

export default function LocalRegistrarProfile() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    photoUrl: "",
  });

  const [originalData, setOriginalData] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setToast((prev) => ({
        ...prev,
        show: false,
      }));
    }, 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));

        if (!snap.exists()) {
          throw new Error("User profile not found.");
        }

        const data = snap.data();

        const profile = {
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          role: data.role || "",
          photoUrl: data.photoUrl || "",
        };

        setForm(profile);
        setOriginalData(profile);
      } catch (err) {
        console.error(err);

        showToast(
          "error",
          "Profile Error",
          err.message
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(
        "error",
        "Invalid File",
        "Please select an image file."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast(
        "error",
        "File Too Large",
        "Image must be smaller than 5 MB."
      );
      return;
    }

    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const nameUnchanged =
      form.firstName === originalData.firstName &&
      form.lastName === originalData.lastName;

    const photoUnchanged = !photoFile;

    if (nameUnchanged && photoUnchanged) {
      showToast(
        "error",
        "No Changes",
        "Nothing to save."
      );
      return;
    }

    setSaving(true);

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User session expired.");
      }

      let photoUrl = form.photoUrl;

      if (photoFile) {
        setUploading(true);

        photoUrl = await uploadToCloudinary(photoFile);

        setUploading(false);
      }

      await updateDoc(
        doc(db, "users", currentUser.uid),
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          photoUrl,
        }
      );

      const updatedData = {
        ...form,
        photoUrl,
      };

      setForm(updatedData);
      setOriginalData(updatedData);

      setPhotoFile(null);
      setPreviewUrl(null);

      setEditing(false);

      showToast(
        "success",
        "Profile Updated",
        "Your profile has been updated successfully."
      );
    } catch (err) {
      console.error(err);

      showToast(
        "error",
        "Update Failed",
        err.message
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setForm(originalData);

    setPhotoFile(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    setEditing(false);
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(
        auth,
        form.email
      );

      showToast(
        "success",
        "Reset Email Sent",
        "Check your inbox for password reset instructions."
      );
    } catch (err) {
      showToast(
        "error",
        "Reset Failed",
        err.message
      );
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const displayPhoto =
    previewUrl || form.photoUrl;

  const initials =
    `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`
      .toUpperCase();

  if (loading) {
    return (
      <div className="lrp-page">
        <div className="lrp-card">
          <h3>Loading profile...</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SAME JSX AS FACULTY PROFILE */}

      {/* Simply replace every:
          up-
          with
          lrp-
      */}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() =>
          setToast((prev) => ({
            ...prev,
            show: false,
          }))
        }
      />
    </>
  );
}