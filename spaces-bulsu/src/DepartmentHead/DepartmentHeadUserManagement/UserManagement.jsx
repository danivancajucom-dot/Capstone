import { useState } from "react";
import "./user-management.css";

const PLACEHOLDER_USERS = [
  { id: 1, name: "Juan Dela Cruz", email: "j.delacruz@university.edu", role: "Faculty",         status: "Active"    },
  { id: 2, name: "Juan Dela Cruz", email: "j.delacruz@university.edu", role: "Local Registrar", status: "Active"    },
  { id: 3, name: "Juan Dela Cruz", email: "j.delacruz@university.edu", role: "Clerk",           status: "Active"    },
  { id: 4, name: "Juan Dela Cruz", email: "j.delacruz@university.edu", role: "Faculty",         status: "Disabled"  },
  { id: 5, name: "Juan Dela Cruz", email: "j.delacruz@university.edu", role: "Faculty",         status: "Active"    },
];

const ROLE_COLORS = {
  "Faculty":         { bg: "#EDE9FE", text: "#5B21B6" },
  "Local Registrar": { bg: "#FEF3C7", text: "#92400E" },
  "Clerk":           { bg: "#FEF0E7", text: "#F97316" },
  "Admin":           { bg: "#DCFCE7", text: "#15803D" },
};

const steps = [
  { number: 1, label: "DETAILS" },
  { number: 2, label: "CONFIRM" },
];

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
          {i < steps.length - 1 && (
            <div className={`um-step-line ${current > s.number ? "completed" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function UserList({ onCreateAccount }) {
  const [search, setSearch] = useState("");

  const filtered = PLACEHOLDER_USERS.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="um-page">
      <div className="um-header">
        <div>
          <h1 className="um-title">User Management</h1>
          <p className="um-subtitle">Manage university staff roles and system access permissions.</p>
        </div>
        <button className="um-create-btn" onClick={onCreateAccount}>
          <i className="fa-solid fa-user-plus" />
          Create New Account
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
        <button className="um-filter-btn">All Roles <i className="fa-solid fa-sliders" /></button>
        <button className="um-filter-btn">Status <i className="fa-solid fa-chevron-down" /></button>
      </div>

      <div className="um-table-card">
        <table className="um-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const rc = ROLE_COLORS[u.role] || { bg: "#f3f4f6", text: "#374151" };
              return (
                <tr key={u.id}>
                  <td>
                    <div className="um-user-cell">
                      <div className={`um-avatar ${u.status === "Disabled" ? "disabled" : ""}`}>
                        {u.name.charAt(0)}
                      </div>
                      <span className="um-name">{u.name}</span>
                    </div>
                  </td>
                  <td className="um-email">{u.email}</td>
                  <td>
                    <span className="um-role-badge" style={{ backgroundColor: rc.bg, color: rc.text }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`um-status ${u.status.toLowerCase()}`}>
                      <span className="um-status-dot" />
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div className="um-actions">
                      <button className="um-action-icon" title="Reset"><i className="fa-solid fa-rotate-right" /></button>
                      {u.status === "Active"
                        ? <button className="um-action-icon danger" title="Disable"><i className="fa-solid fa-ban" /></button>
                        : <button className="um-action-icon success" title="Enable"><i className="fa-solid fa-circle-check" /></button>
                      }
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="um-table-footer">
          <span className="um-count">Showing 1 to 5 of 100 users</span>
          <div className="um-pagination">
            <button className="um-page-btn">Previous</button>
            <button className="um-page-btn active">1</button>
            <button className="um-page-btn">2</button>
            <button className="um-page-btn">3</button>
            <span className="um-ellipsis">...</span>
            <button className="um-page-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function CreateAccountStep1({ form, setForm, onNext, onBack }) {
  return (
    <div className="um-page">
      <div className="um-create-header">
        <h1 className="um-title">Create New Account</h1>
        <p className="um-subtitle">Invite a new faculty member or administrator to the university management platform. They will receive an email with login credentials.</p>
      </div>

      <Stepper current={1} />

      <div className="um-form-card">
        <div className="um-form-group">
          <label>Full Name</label>
          <input
            className="um-input"
            placeholder="Enter full name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="um-form-group">
          <label>Email Address</label>
          <input
            className="um-input"
            placeholder="Enter email address"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="um-form-group">
          <label>Department/ Role</label>
          <select
            className="um-input um-select"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          >
            <option value="">Select a designation</option>
            <option>Faculty</option>
            <option>Local Registrar</option>
            <option>Clerk</option>
            <option>Admin</option>
          </select>
        </div>
      </div>

      <div className="um-footer step2">
        <button className="um-back-btn" onClick={onBack}>Back</button>
        <button className="um-next-btn" onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

function CreateAccountStep2({ form, onBack, onConfirm }) {
  return (
    <div className="um-page">
      <div className="um-create-header">
        <h1 className="um-title">Create New Account</h1>
        <p className="um-subtitle">Invite a new faculty member or administrator to the university management platform. They will receive an email with login credentials.</p>
      </div>

      <Stepper current={2} />

      <div className="um-form-card">
        <h2 className="um-confirm-title">Account Details</h2>
        <hr className="um-confirm-divider" />
        <div className="um-confirm-body">
          <p><strong>Name:</strong> {form.name || "Juan Dela Cruz"}</p>
          <p><strong>Email:</strong> {form.email || "j.delacruz@university.edu"}</p>
          <p><strong>Role:</strong> {form.role || "Admin"}</p>
        </div>
        <div className="um-info-box">
          <i className="fa-solid fa-circle-info" />
          <span>An automated email will be sent to the user with a temporary password and a link to verify their account. For security, this link will expire in 24 hours.</span>
        </div>
      </div>

      <div className="um-footer step2">
        <button className="um-back-btn" onClick={onBack}>Back</button>
        <button className="um-next-btn" onClick={onConfirm}>Confirm</button>
      </div>
    </div>
  );
}

function ConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="um-modal-overlay">
      <div className="um-modal">
        <div className="um-modal-icon">
          <i className="fa-solid fa-triangle-exclamation" />
        </div>
        <h3 className="um-modal-title">Are you sure?</h3>
        <p className="um-modal-text">Do you want to proceed<br />with this operation?</p>
        <button className="um-modal-cancel" onClick={onCancel}>Cancel</button>
        <button className="um-modal-confirm" onClick={onConfirm}>Confirm</button>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [view, setView]         = useState("list"); // list | step1 | step2
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ name: "", email: "", role: "" });

  const handleFinalConfirm = () => {
    setShowModal(false);
    setView("list");
    setForm({ name: "", email: "", role: "" });
  };

  return (
    <div style={{ position: "relative" }}>
      {view === "list"  && <UserList onCreateAccount={() => setView("step1")} />}
      {view === "step1" && (
        <CreateAccountStep1
          form={form}
          setForm={setForm}
          onNext={() => setView("step2")}
          onBack={() => setView("list")}
        />
      )}
      {view === "step2" && (
        <CreateAccountStep2
          form={form}
          onBack={() => setView("step1")}
          onConfirm={() => setShowModal(true)}
        />
      )}
      {showModal && (
        <ConfirmModal
          onCancel={() => setShowModal(false)}
          onConfirm={handleFinalConfirm}
        />
      )}
    </div>
  );
}