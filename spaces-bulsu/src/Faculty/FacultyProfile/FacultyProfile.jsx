import { useState, useEffect } from "react";
import "./faculty-profile.css";

import { auth, db } from "../../firebase";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import {
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";

import Toast from "../../Popup/Toast/Toast";

export default function UserProfile() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
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
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          showToast(
            "error",
            "Authentication Error",
            "No logged in user found."
          );
          setLoading(false);
          return;
        }

        try {
          const userRef = doc(
            db,
            "users",
            currentUser.uid
          );

          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            throw new Error(
              "User profile not found."
            );
          }

          const data = snap.data();

          const profile = {
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            role: data.role || "",
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
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (
        form.firstName === originalData.firstName &&
        form.lastName === originalData.lastName
      ) {
        showToast(
          "error",
          "No Changes",
          "Nothing to save."
        );
        return;
      }

      setSaving(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "User session expired."
        );
      }

      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        }
      );

      const updatedData = {
        ...form,
      };

      setOriginalData(updatedData);
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
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setForm(originalData);
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
      console.error(err);

      showToast(
        "error",
        "Reset Failed",
        err.message
      );
    }
  };

  const handleChange = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

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
            <button
              className="up-edit-btn"
              onClick={() =>
                setEditing(true)
              }
            >
              <i className="fa-solid fa-pen" />
            </button>
          )}

          <div className="up-avatar-wrap">
            <div className="up-avatar">
              <i className="fa-solid fa-user" />
            </div>
          </div>

          {editing && (
            <label className="up-upload-btn">
              Upload Picture
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];

                  if (file) {
                    console.log(
                      "Selected:",
                      file.name
                    );
                  }
                }}
              />
            </label>
          )}

          <div className="up-fields">

            <div className="up-field">
              <label>First Name</label>

              <input
                className="up-input"
                value={form.firstName}
                onChange={handleChange(
                  "firstName"
                )}
                readOnly={!editing}
              />
            </div>

            <div className="up-field">
              <label>Last Name</label>

              <input
                className="up-input"
                value={form.lastName}
                onChange={handleChange(
                  "lastName"
                )}
                readOnly={!editing}
              />
            </div>

            <div className="up-field">
              <label>Email</label>

              <input
                className="up-input"
                value={form.email}
                readOnly
              />
            </div>

            <div className="up-field">
              <label>Role</label>

              <input
                className="up-input"
                value={form.role}
                readOnly
              />
            </div>

            <div className="up-field">
              <label>Password</label>

              <button
                className="up-reset-password-btn"
                onClick={
                  handleResetPassword
                }
              >
                Send Password Reset Email
              </button>
            </div>

          </div>
        </div>

        {editing && (
          <div className="up-footer">

            <button
              className="up-cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button
              className="up-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save"}
            </button>

          </div>
        )}
      </div>

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