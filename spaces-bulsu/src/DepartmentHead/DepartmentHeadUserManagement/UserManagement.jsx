import { useState, useEffect } from "react";
import {
  collection, getDocs, doc, updateDoc, setDoc, query, orderBy,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../firebase";
import "./user-management.css";

const firebaseConfig = {
  apiKey: "AIzaSyAQRQ0DcO-giGzZN46w91TJb2NGZ1S8ykQ",
  authDomain: "spaces-cict.firebaseapp.com",
  projectId: "spaces-cict",
  storageBucket: "spaces-cict.firebasestorage.app",
  messagingSenderId: "268419005346",
  appId: "1:268419005346:web:6c2bb5f113f46ff28890fb",
};

const ROLE_COLORS = {
  Faculty:           { bg: "#EDE9FE", text: "#5B21B6" },
  "Local Registrar": { bg: "#FEF3C7", text: "#92400E" },
  Clerk:             { bg: "#FEF0E7", text: "#F97316" },
  "Department Head": { bg: "#DBEAFE", text: "#1D4ED8" },
};

const steps = [{ number: 1, label: "DETAILS" }, { number: 2, label: "CONFIRM" }];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createUserSecondaryApp(email, password) {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return cred.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ current }) {
  return (
    <div className="um-stepper">
      {steps.map((s, i) => (
        <div className="um-step-wrapper" key={s.number}>
          <div className="um-step-item">
            <div className={`um-step-circle ${current === s.number ? "active" : ""} ${current > s.number ? "completed" : ""}`}>
              {s.number}
            </div>
            <span className={`um-step-label ${current === s.number ? "active" : ""}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`um-step-line ${current > s.number ? "completed" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

// ── Password Cell ─────────────────────────────────────────────────────────────

function PasswordCell({ tempPassword, passwordReset }) {
  const [visible, setVisible] = useState(false);

  if (passwordReset) {
    return (
      <span className="um-pw-reset-badge">
        <i className="fa-solid fa-shield-halved" /> Password set by user
      </span>
    );
  }
  if (!tempPassword) return <span className="um-pw-na">—</span>;

  return (
    <div className="um-pw-cell">
      <span className="um-pw-value">{visible ? tempPassword : "••••••••••••"}</span>
      <button className="um-pw-toggle" onClick={() => setVisible(v => !v)} title={visible ? "Hide" : "Show"}>
        <i className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`} />
      </button>
    </div>
  );
}

// ── UserList ──────────────────────────────────────────────────────────────────

function UserList({ onCreateAccount }) {
  const [search, setSearch]   = useState("");
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("lastName"));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "Active" ? "Disabled" : "Active";
    try {
      await updateDoc(doc(db, "users", user.id), { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (e) {
      alert("Failed to update status: " + e.message);
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Send a password reset email to ${user.email}?`)) return;
    setSending(user.id);
    try {
      await sendPasswordResetEmail(auth, user.email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      });
      alert(`Password reset email sent to ${user.email}.`);
    } catch (e) {
      alert("Failed to send reset email: " + e.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="um-page">
      <div className="um-header">
        <div>
          <h1 className="um-title">User Management</h1>
          <p className="um-subtitle">Manage university staff roles and system access permissions.</p>
        </div>
        <button className="um-create-btn" onClick={onCreateAccount}>
          <i className="fa-solid fa-user-plus" /> Create New Account
        </button>
      </div>

      <div className="um-search-row">
        <div className="um-search-bar">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="um-table-card">
        {loading ? (
          <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading users…</p>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>TEMP PASSWORD</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                    No users found.
                  </td>
                </tr>
              ) : filtered.map(u => {
                const rc = ROLE_COLORS[u.role] || { bg: "#f3f4f6", text: "#374151" };
                const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="um-user-cell">
                        <div className={`um-avatar ${u.status === "Disabled" ? "disabled" : ""}`}>
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="um-name">{fullName}</span>
                      </div>
                    </td>
                    <td className="um-email">{u.email}</td>
                    <td>
                      <span className="um-role-badge" style={{ backgroundColor: rc.bg, color: rc.text }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <PasswordCell tempPassword={u.tempPassword} passwordReset={u.passwordReset} />
                    </td>
                    <td>
                      <span className={`um-status ${u.status?.toLowerCase()}`}>
                        <span className="um-status-dot" />
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="um-actions">
                        <button
                          className="um-action-icon"
                          title="Send password reset email"
                          onClick={() => handleResetPassword(u)}
                          disabled={sending === u.id}
                        >
                          <i className={`fa-solid ${sending === u.id ? "fa-spinner fa-spin" : "fa-rotate-right"}`} />
                        </button>
                        {u.status === "Active"
                          ? <button className="um-action-icon danger" title="Disable" onClick={() => handleToggleStatus(u)}><i className="fa-solid fa-ban" /></button>
                          : <button className="um-action-icon success" title="Enable" onClick={() => handleToggleStatus(u)}><i className="fa-solid fa-circle-check" /></button>
                        }
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

function CreateAccountStep1({ form, setForm, entryMode, setEntryMode, excelFile, setExcelFile, onNext, onBack }) {
  const canProceed = entryMode === "manual"
    ? form.firstName && form.lastName && form.gender && form.email && form.role
    : entryMode === "excel" && excelFile;

  return (
    <div className="um-page">
      <div className="um-create-header">
        <h1 className="um-title">Create New Account</h1>
        <p className="um-subtitle">Create users either individually or through bulk Excel upload.</p>
      </div>

      <Stepper current={1} />

      <div className="um-form-card">
        <div className="um-mode-selector">
          <button
            className={`um-mode-btn ${entryMode === "manual" ? "active" : ""}`}
            onClick={() => setEntryMode("manual")}
          >
            <i className="fa-solid fa-user" /> Individual Entry
          </button>
          <button
            className={`um-mode-btn ${entryMode === "excel" ? "active" : ""}`}
            onClick={() => setEntryMode("excel")}
          >
            <i className="fa-solid fa-file-excel" /> Upload Excel
          </button>
        </div>

        {entryMode === "manual" && (
          <>
            {[
              { label: "First Name", key: "firstName", placeholder: "Enter first name" },
              { label: "Last Name",  key: "lastName",  placeholder: "Enter last name"  },
            ].map(f => (
              <div className="um-form-group" key={f.key}>
                <label>{f.label}</label>
                <input
                  className="um-input"
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="um-form-group">
              <label>Gender</label>
              <select className="um-input um-select" value={form.gender}
                onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                <option value="">Select gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>

            <div className="um-form-group">
              <label>Email Address</label>
              <input
                className="um-input"
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="um-form-group">
              <label>Role</label>
              <select className="um-input um-select" value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="">Select role</option>
                <option>Faculty</option>
                <option>Local Registrar</option>
                <option>Clerk</option>
              </select>
            </div>
          </>
        )}

        {entryMode === "excel" && (
          <>
            <div className="um-upload-info">
              <h3>Bulk User Upload</h3>
              <p>Upload an Excel (.xlsx) file containing the following columns:</p>
              <ul>
                <li>First Name</li>
                <li>Last Name</li>
                <li>Gender</li>
                <li>Email Address</li>
                <li>Role</li>
              </ul>
              <p>Each row represents one user account that will be created by the system.</p>
            </div>

            <div className="um-form-group">
              <label>Upload Excel File</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="um-input"
                onChange={e => setExcelFile(e.target.files[0])}
              />
            </div>

            {excelFile && (
              <div className="um-file-preview">
                <i className="fa-solid fa-file-excel" />
                <span>{excelFile.name}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="um-footer step2">
        <button className="um-back-btn" onClick={onBack}>Back</button>
        <button className="um-next-btn" onClick={onNext} disabled={!canProceed}>Next</button>
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

function CreateAccountStep2({ form, entryMode, excelFile, onBack, onConfirm }) {
  return (
    <div className="um-page">
      <div className="um-create-header">
        <h1 className="um-title">Create New Account</h1>
        <p className="um-subtitle">Review the information before proceeding.</p>
      </div>

      <Stepper current={2} />

      <div className="um-form-card">
        <h2 className="um-confirm-title">Account Details</h2>
        <hr className="um-confirm-divider" />

        <div className="um-confirm-body">
          {entryMode === "manual" ? (
            <>
              <p><strong>First Name:</strong> {form.firstName}</p>
              <p><strong>Last Name:</strong> {form.lastName}</p>
              <p><strong>Gender:</strong> {form.gender}</p>
              <p><strong>Email:</strong> {form.email}</p>
              <p><strong>Role:</strong> {form.role}</p>
            </>
          ) : (
            <>
              <p><strong>Upload Type:</strong> Bulk Excel Upload</p>
              <p><strong>File:</strong> {excelFile?.name}</p>
            </>
          )}
        </div>

        <div className="um-info-box">
          <i className="fa-solid fa-circle-info" />
          <span>
            A temporary password will be auto-generated and visible in the user table.
            A formal onboarding email with login credentials will be sent to the user.
            Once the user sets their own password, the temporary password will be hidden.
          </span>
        </div>
      </div>

      <div className="um-footer step2">
        <button className="um-back-btn" onClick={onBack}>Back</button>
        <button className="um-next-btn" onClick={onConfirm}>Confirm</button>
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ onCancel, onConfirm, loading }) {
  return (
    <div className="um-modal-overlay">
      <div className="um-modal">
        <div className="um-modal-icon"><i className="fa-solid fa-triangle-exclamation" /></div>
        <h3 className="um-modal-title">Are you sure?</h3>
        <p className="um-modal-text">Do you want to proceed<br />with this operation?</p>
        <button className="um-modal-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className="um-modal-confirm" onClick={onConfirm} disabled={loading}>
          {loading ? "Creating…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { firstName: "", lastName: "", gender: "", email: "", role: "" };

export default function UserManagement() {
  const [view, setView]           = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [entryMode, setEntryMode] = useState("");
  const [excelFile, setExcelFile] = useState(null);

  const reset = () => {
    setForm(EMPTY_FORM);
    setEntryMode("");
    setExcelFile(null);
    setView("list");
  };

  const handleFinalConfirm = async () => {
    setCreating(true);
    try {
      if (entryMode === "manual") {
        const tempPassword = generateTempPassword();
        const uid = await createUserSecondaryApp(form.email, tempPassword);

        await setDoc(doc(db, "users", uid), {
          firstName:     form.firstName,
          lastName:      form.lastName,
          gender:        form.gender,
          email:         form.email,
          role:          form.role,
          status:        "Active",
          tempPassword,
          passwordReset: false,
          createdAt:     new Date().toISOString(),
        });

        await sendPasswordResetEmail(auth, form.email, {
          url: `${window.location.origin}/reset-password`,
          handleCodeInApp: false,
        });

        setShowModal(false);
        reset();
        alert(`Account created! Login credentials have been sent to ${form.email}.`);
      } else {
        alert(
          "Excel bulk upload requires a Firebase Cloud Function with Admin SDK.\n\n" +
          "See: https://firebase.google.com/docs/functions/get-started"
        );
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create account: " + (err.message ?? err.code));
      setShowModal(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {view === "list" && (
        <UserList onCreateAccount={() => setView("step1")} />
      )}
      {view === "step1" && (
        <CreateAccountStep1
          form={form}
          setForm={setForm}
          entryMode={entryMode}
          setEntryMode={setEntryMode}
          excelFile={excelFile}
          setExcelFile={setExcelFile}
          onNext={() => setView("step2")}
          onBack={reset}
        />
      )}
      {view === "step2" && (
        <CreateAccountStep2
          form={form}
          entryMode={entryMode}
          excelFile={excelFile}
          onBack={() => setView("step1")}
          onConfirm={() => setShowModal(true)}
        />
      )}
      {showModal && (
        <ConfirmModal
          loading={creating}
          onCancel={() => setShowModal(false)}
          onConfirm={handleFinalConfirm}
        />
      )}
    </div>
  );
}
