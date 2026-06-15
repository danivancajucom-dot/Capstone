import { useState, useEffect } from "react";
import {
  collection,addDoc,serverTimestamp, getDocs, doc, updateDoc, setDoc, query, orderBy,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../firebase";
import "./user-management.css";
import * as XLSX from "xlsx";
import emailjs from "@emailjs/browser";
import { deleteDoc } from "firebase/firestore";
emailjs.init("bNsod6OOQzMmRo0Cs");

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


function UserList({ onCreateAccount }) {
  const [search, setSearch]   = useState("");
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const handleDeleteUser = (user) => {
    setDeleteTarget(user);
  };
  const confirmDeleteUser = async () => {
  if (!deleteTarget) return;

  try {
    await deleteDoc(doc(db, "users", deleteTarget.id));

    setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    await logActivity({
      userId: deleteTarget.id,
      user: getFullName(deleteTarget),
      role: deleteTarget.role,
      action: "Deleted User",
      actionType: "failed",
      target: deleteTarget.email,
      status: "SUCCESS",
    });
    alert("User deleted successfully.");
  } catch (e) {
    alert("Failed to delete user: " + e.message);
  } finally {
    setDeleteTarget(null);
  }
};

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
      await logActivity({
        userId: user.id,
        user: getFullName(user),
        role: user.role,
        action: user.status === "Active" ? "Disabled User" : "Enabled User",
        actionType: "edit",
        target: user.email,
        status: "SUCCESS",
      });
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
      await logActivity({
        userId: user.id,
        user: getFullName(user),
        role: user.role,
        action: "Sent Password Reset Email",
        actionType: "success",
        target: user.email,
        status: "SUCCESS",
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
                              className="um-action-icon danger"
                              title="Delete User"
                              onClick={() => handleDeleteUser(u)}
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
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
      {deleteTarget && (
      <div className="um-modal-overlay">
        <div className="um-modal">

          <div className="um-modal-icon">
            <i className="fa-solid fa-trash" />
          </div>

          <h3 className="um-modal-title">Delete User</h3>

          <p className="um-modal-text">
            Are you sure you want to permanently delete<br />
            <strong>{deleteTarget.email}</strong>?
            <br /><br />
            This action cannot be undone.
          </p>

          <button
            className="um-modal-cancel"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </button>

          <button
            className="um-modal-confirm"
            onClick={confirmDeleteUser}
          >
            Yes, Delete
          </button>

        </div>
      </div>
    )}
    </div>
  );
}

function CreateAccountStep1({
  form,
  setForm,
  entryMode,
  setEntryMode,
  excelFile,
  setExcelFile,
  onNext,
  onBack
}) {
  const canProceed =
  entryMode === "manual"
    ? (
        form.firstName &&
        form.lastName &&
        form.gender &&
        form.email &&
        form.role
      )
    : (
        entryMode === "excel" &&
        excelFile
      );
  return (
    <div className="um-page">
      <div className="um-create-header">
        <h1 className="um-title">Create New Account</h1>
        <p className="um-subtitle">Fill in the details for the new user account.</p>
      </div>
      <Stepper current={1} />
      <div className="um-form-card">
        <div className="um-form-group">
          <label>Select Account Creation Method</label>

          <div className="um-mode-selector">

            <button
              type="button"
              className={`um-mode-btn ${
                entryMode === "manual" ? "active" : ""
              }`}
              onClick={() => setEntryMode("manual")}
            >
              <i className="fa-solid fa-user" />
              Individual Entry
            </button>

            <button
              type="button"
              className={`um-mode-btn ${
                entryMode === "excel" ? "active" : ""
              }`}
              onClick={() => setEntryMode("excel")}
            >
              <i className="fa-solid fa-file-excel" />
              Upload Excel
            </button>

          </div>
        </div>
        {entryMode === "manual" && (
    <>
          {[
            {
              label: "First Name",
              key: "firstName",
              placeholder: "Enter first name"
            },
            {
              label: "Last Name",
              key: "lastName",
              placeholder: "Enter last name"
            }
          ].map(f => (
            <div
              className="um-form-group"
              key={f.key}
            >
              <label>{f.label}</label>

              <input
                className="um-input"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) =>
                  setForm(prev => ({
                    ...prev,
                    [f.key]: e.target.value
                  }))
                }
              />
            </div>
          ))}

          <div className="um-form-group">
            <label>Gender</label>

            <select
              className="um-input um-select"
              value={form.gender}
              onChange={(e) =>
                setForm(prev => ({
                  ...prev,
                  gender: e.target.value
                }))
              }
            >
              <option value="">
                Select gender
              </option>

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
              onChange={(e) =>
                setForm(prev => ({
                  ...prev,
                  email: e.target.value
                }))
              }
            />
          </div>

          <div className="um-form-group">
            <label>Role</label>

            <select
              className="um-input um-select"
              value={form.role}
              onChange={(e) =>
                setForm(prev => ({
                  ...prev,
                  role: e.target.value
                }))
              }
            >
              <option value="">
                Select role
              </option>

              <option>Faculty</option>
              <option>Local Registrar</option>
              <option>Clerk</option>
              <option>Department Head</option>
            </select>
          </div>
        </>
      )}
      {entryMode === "excel" && (
  <>
    <div className="um-upload-info">
      <h3>Required Excel Columns</h3>

      <ul>
        <li>firstName</li>
        <li>lastName</li>
        <li>gender</li>
        <li>email</li>
        <li>role</li>
      </ul>

      <p>
        Every row will automatically create
        a new user account.
      </p>
    </div>

    <div className="um-form-group">
      <label>Upload Excel File</label>

      <input
        type="file"
        accept=".xlsx,.xls"
        className="um-input"
        onChange={(e) =>
          setExcelFile(
            e.target.files?.[0] || null
          )
        }
      />
    </div>

    {excelFile && (
      <div className="um-file-preview">
        <i className="fa-solid fa-file-excel" />
        {excelFile.name}
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

function CreateAccountStep2({
  form,
  entryMode,
  excelFile,
  onBack,
  onConfirm
}) {
  return (
    <div className="um-page">
      <div className="um-create-header">
        <h1 className="um-title">
          Create New Account
        </h1>

        <p className="um-subtitle">
          Review the information before proceeding.
        </p>
      </div>

      <Stepper current={2} />

      <div className="um-form-card">
        <h2 className="um-confirm-title">
          Account Details
        </h2>

        <hr className="um-confirm-divider" />

        <div className="um-confirm-body">

          {entryMode === "manual" ? (
            <>
              <p>
                <strong>First Name:</strong>{" "}
                {form.firstName}
              </p>

              <p>
                <strong>Last Name:</strong>{" "}
                {form.lastName}
              </p>

              <p>
                <strong>Gender:</strong>{" "}
                {form.gender}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {form.email}
              </p>

              <p>
                <strong>Role:</strong>{" "}
                {form.role}
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Upload Type:</strong>
                {" "}Bulk Excel Upload
              </p>

              <p>
                <strong>File:</strong>{" "}
                {excelFile?.name}
              </p>
            </>
          )}

        </div>

        <div className="um-info-box">
          <i className="fa-solid fa-circle-info" />

          <span>
            An automated email will be sent
            to all created users.
          </span>
        </div>
      </div>

      <div className="um-footer step2">
        <button
          className="um-back-btn"
          onClick={onBack}
        >
          Back
        </button>

        <button
          className="um-next-btn"
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

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

const EMPTY_FORM = { firstName: "", lastName: "", gender: "", email: "", role: "" };

export default function UserManagement() {
  const [view, setView]           = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [entryMode, setEntryMode] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const getFullName = (u) =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();

  const logActivity = async ({
    userId,
    user,
    role,
    action,
    actionType,
    target,
    status,
  }) => {
    try {
      await addDoc(collection(db, "activityLogs"), {
        userId,
        user,
        role,
        action,
        actionType,
        target,
        status,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Activity log error:", err);
    }
  };
  const reset = () => {
    setForm(EMPTY_FORM);
    setEntryMode("");
    setExcelFile(null);
    setView("list");
  };

    const parseExcelFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = e.target.result;

            const workbook = XLSX.read(data, {
              type: "array",
            });

            const sheetName = workbook.SheetNames[0];

            const sheet =
              workbook.Sheets[sheetName];

            const rows =
              XLSX.utils.sheet_to_json(sheet);

            resolve(rows);
          } catch (err) {
            reject(err);
          }
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
      });
    };

    const handleFinalConfirm = async () => {
    setCreating(true);

    try {

      // ==========================
      // MANUAL ACCOUNT CREATION
      // ==========================
      if (entryMode === "manual") {

        const tempPassword =
          generateTempPassword();

        const uid =
          await createUserSecondaryApp(
            form.email,
            tempPassword
          );

        await setDoc(
          doc(db, "users", uid),
          {
            firstName: form.firstName,
            lastName: form.lastName,
            gender: form.gender,
            email: form.email,
            role: form.role,
            status: "Active",
            tempPassword,
            passwordReset: false,
            createdAt:
              new Date().toISOString(),
          }
        );
        try {
          const emailResult = await emailjs.send(
            "service_qogg8xj",
            "template_okil0d3",
            {
              user_email: form.email,
              first_name: form.firstName,
              last_name: form.lastName,
              role: form.role,
              temp_password: tempPassword,
            },
            "bNsod6OOQzMmRo0Cs"
          );

          console.log("Email sent:", emailResult);
        } catch (emailError) {
          console.error("EMAILJS ERROR:", emailError);
          alert("EmailJS Error: " + JSON.stringify(emailError));
        }
        /*await sendPasswordResetEmail(
          auth,
          form.email,
          {
            url: `${window.location.origin}/reset-password`,
            handleCodeInApp: false,
          }
        );*/
        await logActivity({
          userId: uid,
          user: `${form.firstName} ${form.lastName}`,
          role: form.role,
          action: "Created User Account",
          actionType: "success",
          target: form.email,
          status: "SUCCESS",
        });

        alert(
          `Account created for ${form.email}`
        );
      }

      // ==========================
      // BULK EXCEL CREATION
      // ==========================
      else {

        const rows =
          await parseExcelFile(excelFile);

          const normalizedRows = rows.map(row => ({
              firstName:
                row["First Name"] ||
                row["firstName"],

              lastName:
                row["Last Name"] ||
                row["lastName"],

              gender:
                row["Gender"] ||
                row["gender"],

              email:
                row["Email"] ||
                row["email"],

              role:
                row["Role"] ||
                row["role"],
            }));

        let successCount = 0;
        let failedRows = [];

        for (let i = 0; i < normalizedRows.length; i++) {
            
          const row = normalizedRows[i];

          try {

            if (
              !row.firstName ||
              !row.lastName ||
              !row.gender ||
              !row.email ||
              !row.role
            ) {
              throw new Error(
                "Missing required fields"
              );
            }

            const tempPassword =
              generateTempPassword();

            const uid =
              await createUserSecondaryApp(
                row.email,
                tempPassword
              );

            await setDoc(
              doc(db, "users", uid),
              {
                firstName: row.firstName,
                lastName: row.lastName,
                gender: row.gender,
                email: row.email,
                role: row.role,
                status: "Active",
                tempPassword,
                passwordReset: false,
                createdAt:
                  new Date().toISOString(),
              }
            );
            try {
              const emailResult = await emailjs.send(
                "service_qogg8xj",
                "template_okil0d3",
                {
                  user_email: row.email,
                  first_name: row.firstName,
                  last_name: row.lastName,
                  role: row.role,
                  temp_password: tempPassword,
                },
                "bNsod6OOQzMmRo0Cs"
              );

              console.log("Email sent:", emailResult);
            } catch (emailError) {
              console.error("EMAILJS ERROR:", emailError);
              alert("EmailJS Error: " + JSON.stringify(emailError));
            }

        await logActivity({
          userId: uid,
          user: `${row.firstName} ${row.lastName}`,
          role: row.role,
          action: "Bulk Created User",
          actionType: "success",
          target: row.email,
          status: "SUCCESS",
        });

            /*await sendPasswordResetEmail(
            auth,
            form.email,
            {
              url: `${window.location.origin}/reset-password`,
              handleCodeInApp: false,
            }
          );*/
          
            successCount++;

          } catch (err) {

            console.error(err);

            failedRows.push({
              row: i + 2,
              email: row.email,
              error:
                err.code ||
                err.message
            });

          }
        }
        

        alert(
          `Bulk upload completed.\n\n` +
          `Created: ${successCount}\n` +
          `Failed: ${failedRows.length}`
        );

        console.log(
          "Failed Rows:",
          failedRows
        );
      }

      setShowModal(false);
      reset();

    } catch (err) {

      console.error(err);

      alert(
        "Failed: " +
        (err.message || err.code)
      );

    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {view === "list"  && <UserList onCreateAccount={() => setView("step1")} />}
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
      {showModal && <ConfirmModal loading={creating} onCancel={() => setShowModal(false)} onConfirm={handleFinalConfirm} />}
    </div>
  );
}
