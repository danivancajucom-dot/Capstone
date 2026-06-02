import { useState } from "react";
import "./faculty-profile.css";

export default function UserProfile() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:     "Juan Dela Cruz",
    email:    "j.delacruz@university.edu",
    password: "***********",
  });

  const handleChange = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <>
    <div className="up-page">
      <div className="up-card">

        {!editing && (
          <button className="up-edit-btn" onClick={() => setEditing(true)}>
            <i className="fa-solid fa-pen" />
          </button>
        )}

        <div className="up-avatar-wrap">
          <div className="up-avatar">
            <i className="fa-solid fa-user" />
          </div>
        </div>

        {editing && (
          <label className="up-upload-btn">Upload Picture<input type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files[0]; if (file) console.log("Selected:", file.name); }} /></label>
        )}

        <div className="up-fields">
          <div className="up-field">
            <label>Full Name</label>
            <input
              className="up-input"
              value={form.name}
              onChange={handleChange("name")}
              readOnly={!editing}
            />
          </div>

          <div className="up-field">
            <label>University ID / Email</label>
            <input
              className="up-input"
              value={form.email}
              onChange={handleChange("email")}
              readOnly={!editing}
            />
          </div>

          <div className="up-field">
            <label>Password</label>
            <input
              className="up-input"
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              readOnly={!editing}
            />
          </div>
        </div>
      </div>

      {editing && (
        <div className="up-footer">
          <button className="up-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
          <button className="up-save-btn"   onClick={() => setEditing(false)}>Save</button>
        </div>
      )}
    </div>
    </>

  );
}