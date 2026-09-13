import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./local-registrar-settings.css";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  deleteUser,
} from "firebase/auth";
import Toast from "../../Popup/Toast/Toast";

// ── Password rules ─────────────────────────────────────────────
const passwordChecks = (pw) => ({
  length:    pw.length >= 8,
  uppercase: /[A-Z]/.test(pw),
  lowercase: /[a-z]/.test(pw),
  number:    /[0-9]/.test(pw),
  special:   /[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(pw),
});
const isStrong = (pw) => Object.values(passwordChecks(pw)).every(Boolean);

// ── FAQ items ──────────────────────────────────────────────────
const FAQ_ITEMS = [
  { question: "Ano ang SpaceS CICT?", answer: "Ang SpaceS CICT ay isang web at mobile-based platform para sa classroom allocation at scheduling ng College of Information and Communications Technology (CICT) sa Bulacan State University. Pinapalitan nito ang manual, meeting-based na proseso ng pag-schedule gamit ang isang centralized system kung saan makikita ang lahat ng room schedules, reservations, at conflicts sa iisang lugar." },
  { question: "Sino ang pwedeng gumawa ng account sa system?", answer: "Ang Department Head lang ang may access na gumawa ng user accounts para sa Local Registrar, Clerk, at Faculty Members. Kapag nagawa na ang account, automatic na ipapadala ang temporary login credentials sa registered email address ng user." },
  { question: "Nakalimutan ko ang password ko, ano ang gagawin ko?", answer: "I-click lang ang 'Forgot Password?' sa login page. Makakatanggap ka ng password reset link sa iyong registered email address na pwede mong gamitin para mag-set ng bagong password." },
  { question: "Bakit naka-block ang account ko?", answer: "Awtomatikong ma-bblock ang account pagkatapos ng 5 sunod-sunod na maling login attempts, para sa seguridad. Sa ika-3 attempt, may babalang notification ka na. Kung na-block na ang account mo, kontakin ang Department Head para ma-reactivate ito." },
  { question: "Paano mag-request ng room reservation?", answer: "Bilang Faculty, pumunta sa Reservations page at pindutin ang '+' button. Punan ang course title, purpose, petsa, at oras ng gagamitin — automatic na magpapakita ang system ng mga available rooms na tugma sa iyong kailangan." },
  { question: "Paano ko malalaman kung available ang isang room?", answer: "Makikita mo ang real-time status ng bawat classroom (Available, Occupied, o Under Maintenance) sa Rooms page. Pwede mo ring i-scan ang QR code na nakadikit sa pinto ng bawat room para makita agad ang current at upcoming schedule nito, kahit hindi ka naka-login." },
  { question: "Ano ang gagawin ko kung hindi ko na gagamitin ang assigned room ko?", answer: "Sa Schedule page, piliin ang klase o booking na gusto mong i-release, bigyan ng dahilan (halimbawa: examination o class suspension), at kumpirmahin. Awtomatikong mano-notify ang Department Head at Clerk para maibalik na available ang room para sa ibang users." },
  { question: "Sino ang makokontak ko kung may problema ako sa system?", answer: "Pwede mong i-click ang 'Contact Support' sa ibaba ng login form para makita ang aming official email addresses, o direktang mag-email sa spaces-bulsu@outlook.com o spacescict@gmail.com." },
];

export default function LocalRegistrarSettings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser]       = useState(null);
  const [email, setEmail]     = useState("");

  const [pwForm, setPwForm] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [showEmailModal, setShowEmailModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailForm, setEmailForm]   = useState({ currentPassword: "", newEmail: "" });
  const [deleteForm, setDeleteForm] = useState({ currentPassword: "", confirmText: "" });

  const [activeInfoModal, setActiveInfoModal] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setLoading(false); return; }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setEmail(snap.exists() ? (snap.data().email || u.email || "") : (u.email || ""));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setActiveInfoModal(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    setOpenFaqIndex(null);
  }, [activeInfoModal]);

  const reauthenticate = async (currentPassword) => {
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
  };

  const resetPwForm = () => {
    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  const closeModals = () => {
    setShowEmailModal(false);
    setShowDeleteModal(false);
    setEmailForm({ currentPassword: "", newEmail: "" });
    setDeleteForm({ currentPassword: "", confirmText: "" });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword) return showToast("error", "Missing Password", "Please enter your current password.");
    if (!isStrong(newPassword)) return showToast("error", "Weak Password", "Your new password does not meet all requirements.");
    if (newPassword !== confirmPassword) return showToast("error", "Passwords Don't Match", "New password and confirm password must match.");
    if (newPassword === currentPassword) return showToast("error", "Same Password", "New password must differ from your current one.");

    setBusy(true);
    try {
      await reauthenticate(currentPassword);
      await updatePassword(user, newPassword);
      showToast("success", "Password Updated", "Your password has been changed successfully.");
      resetPwForm();
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === "auth/wrong-password") msg = "Your current password is incorrect.";
      if (err.code === "auth/weak-password")   msg = "New password is too weak.";
      if (err.code === "auth/requires-recent-login") msg = "Please log out and log back in, then try again.";
      showToast("error", "Update Failed", msg);
    } finally {
      setBusy(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    const { currentPassword, newEmail } = emailForm;

    if (!currentPassword) return showToast("error", "Missing Password", "Please enter your current password.");
    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail))
      return showToast("error", "Invalid Email", "Please enter a valid new email address.");
    if (newEmail.toLowerCase() === email.toLowerCase())
      return showToast("error", "Same Email", "New email is the same as your current email.");

    setBusy(true);
    try {
      await reauthenticate(currentPassword);
      await updateEmail(user, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      setEmail(newEmail);
      showToast("success", "Email Updated", "Your email address has been changed successfully.");
      closeModals();
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === "auth/wrong-password") msg = "Your current password is incorrect.";
      if (err.code === "auth/email-already-in-use") msg = "That email is already in use by another account.";
      if (err.code === "auth/requires-recent-login") msg = "Please log out and log back in, then try again.";
      showToast("error", "Update Failed", msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    const { currentPassword, confirmText } = deleteForm;

    if (!currentPassword) return showToast("error", "Missing Password", "Please enter your current password.");
    if (confirmText.trim().toUpperCase() !== "DELETE")
      return showToast("error", "Confirmation Failed", 'Type "DELETE" to confirm account deletion.');

    setBusy(true);
    try {
      await reauthenticate(currentPassword);
      try { await deleteDoc(doc(db, "users", user.uid)); }
      catch (fsErr) { console.warn("Firestore delete failed (continuing):", fsErr); }

      await deleteUser(user);

      showToast("success", "Account Deleted", "Your account has been permanently deleted.");
      closeModals();
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === "auth/wrong-password") msg = "Your current password is incorrect.";
      if (err.code === "auth/requires-recent-login") msg = "Please log out and log back in, then try again.";
      showToast("error", "Deletion Failed", msg);
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="fs-page">
        <div className="fs-card"><h3>Loading settings...</h3></div>
      </div>
    );
  }

  const pwChecks = passwordChecks(pwForm.newPassword);

  return (
    <>
      <div className="fs-page">
        <div className="fs-page-header">
          <h1><span className="fs-bar" /> Settings</h1>
          <p>Manage your account security and notification settings.</p>
        </div>

        <div className="fs-grid">
          <div className="fs-col">
            <div className="fs-section-title">
              <i className="fa-solid fa-shield-halved"></i>
              <span>SECURITY</span>
            </div>

            <form className="fs-card" onSubmit={handleChangePassword}>
              <div className="fs-field">
                <label>CURRENT PASSWORD</label>
                <div className="fs-input-wrap">
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="fs-input"
                    placeholder="Enter current password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button type="button" className="fs-eye" onClick={() => setShowCurrent((v) => !v)} tabIndex={-1}>
                    <i className={`fa-regular ${showCurrent ? "fa-eye" : "fa-eye-slash"}`}></i>
                  </button>
                </div>
              </div>

              <div className="fs-row">
                <div className="fs-field">
                  <label>NEW PASSWORD</label>
                  <div className="fs-input-wrap">
                    <input
                      type={showNew ? "text" : "password"}
                      className="fs-input"
                      placeholder="Enter new password"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <button type="button" className="fs-eye" onClick={() => setShowNew((v) => !v)} tabIndex={-1}>
                      <i className={`fa-regular ${showNew ? "fa-eye" : "fa-eye-slash"}`}></i>
                    </button>
                  </div>
                </div>

                <div className="fs-field">
                  <label>CONFIRM PASSWORD</label>
                  <div className="fs-input-wrap">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="fs-input"
                      placeholder="Confirm new password"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <button type="button" className="fs-eye" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                      <i className={`fa-regular ${showConfirm ? "fa-eye" : "fa-eye-slash"}`}></i>
                    </button>
                  </div>
                </div>
              </div>

              {(pwForm.newPassword || pwForm.confirmPassword) && (
                <ul className="fs-pw-rules">
                  <li className={pwChecks.length    ? "ok" : ""}><i className={`fa-solid ${pwChecks.length    ? "fa-circle-check" : "fa-circle"}`} />8+ characters</li>
                  <li className={pwChecks.uppercase ? "ok" : ""}><i className={`fa-solid ${pwChecks.uppercase ? "fa-circle-check" : "fa-circle"}`} />Uppercase</li>
                  <li className={pwChecks.lowercase ? "ok" : ""}><i className={`fa-solid ${pwChecks.lowercase ? "fa-circle-check" : "fa-circle"}`} />Lowercase</li>
                  <li className={pwChecks.number    ? "ok" : ""}><i className={`fa-solid ${pwChecks.number    ? "fa-circle-check" : "fa-circle"}`} />Number</li>
                  <li className={pwChecks.special   ? "ok" : ""}><i className={`fa-solid ${pwChecks.special   ? "fa-circle-check" : "fa-circle"}`} />Special char</li>
                </ul>
              )}

              <button type="submit" className="fs-primary-btn" disabled={busy}>
                {busy ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Updating…</> : "Update Password"}
              </button>
            </form>
          </div>

          <div className="fs-col">
            <div className="fs-section-title">
              <i className="fa-solid fa-bell"></i>
              <span>NOTIFICATIONS &amp; PRIVACY</span>
            </div>

            <div className="fs-card fs-card-flush">
              <div className="fs-list-row">
                <i className="fa-solid fa-bell fs-row-icon accent"></i>
                <div className="fs-row-text">
                  <span className="fs-row-title accent">Push Notifications</span>
                  <span className="fs-row-sub">Real time alerts</span>
                </div>
                <label className="fs-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="fs-switch-slider"></span>
                </label>
              </div>

              <div className="fs-list-row clickable" onClick={() => setActiveInfoModal("privacy")}>
                <i className="fa-solid fa-shield fs-row-icon"></i>
                <div className="fs-row-text">
                  <span className="fs-row-title">Privacy Policy</span>
                </div>
                <i className="fa-solid fa-chevron-right fs-row-chev"></i>
              </div>

              <div className="fs-list-row clickable" onClick={() => setActiveInfoModal("terms")}>
                <i className="fa-solid fa-file-lines fs-row-icon"></i>
                <div className="fs-row-text">
                  <span className="fs-row-title">Terms of Service</span>
                </div>
                <i className="fa-solid fa-chevron-right fs-row-chev"></i>
              </div>
            </div>

            <div className="fs-section-title">
              <i className="fa-solid fa-life-ring"></i>
              <span>ACCOUNT &amp; SUPPORT</span>
            </div>

            <div className="fs-card fs-card-flush">
              <div className="fs-list-row clickable" onClick={() => setShowEmailModal(true)}>
                <i className="fa-solid fa-envelope fs-row-icon"></i>
                <div className="fs-row-text">
                  <span className="fs-row-title">Change Email</span>
                  <span className="fs-row-sub">{email}</span>
                </div>
                <i className="fa-solid fa-chevron-right fs-row-chev"></i>
              </div>

              <div className="fs-list-row clickable" onClick={() => setActiveInfoModal("help")}>
                <i className="fa-regular fa-circle-question fs-row-icon"></i>
                <div className="fs-row-text">
                  <span className="fs-row-title">Help Center</span>
                </div>
                <i className="fa-solid fa-chevron-right fs-row-chev"></i>
              </div>

              <div className="fs-list-row clickable danger" onClick={() => setShowDeleteModal(true)}>
                <i className="fa-regular fa-trash-can fs-row-icon danger"></i>
                <div className="fs-row-text">
                  <span className="fs-row-title danger">Delete Account</span>
                </div>
                <i className="fa-solid fa-chevron-right fs-row-chev danger"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHANGE EMAIL MODAL */}
      {showEmailModal && (
        <div className="fs-modal-overlay" onClick={() => !busy && closeModals()}>
          <form className="fs-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleChangeEmail}>
            <div className="fs-modal-icon blue"><i className="fa-solid fa-envelope"></i></div>
            <h3>Change Email</h3>
            <p className="fs-modal-sub">Verify your current password to continue.</p>

            <div className="fs-field">
              <label>Current Password</label>
              <input
                type="password"
                className="fs-input"
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="fs-field">
              <label>New Email</label>
              <input
                type="email"
                className="fs-input"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
                autoComplete="email"
                required
              />
            </div>

            <div className="fs-modal-actions">
              <button type="button" className="fs-modal-btn cancel" onClick={closeModals} disabled={busy}>Cancel</button>
              <button type="submit" className="fs-modal-btn confirm" disabled={busy}>
                {busy ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Saving…</> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fs-modal-overlay" onClick={() => !busy && closeModals()}>
          <form className="fs-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleDeleteAccount}>
            <div className="fs-modal-icon red"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <h3>Delete Account</h3>
            <p className="fs-modal-sub">
              This action is <strong>permanent</strong>. Your profile and data will be removed, and your
              email will be free to use again.
            </p>

            <div className="fs-field">
              <label>Current Password</label>
              <input
                type="password"
                className="fs-input"
                value={deleteForm.currentPassword}
                onChange={(e) => setDeleteForm((f) => ({ ...f, currentPassword: e.target.value }))}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="fs-field">
              <label>Type <span className="fs-danger-text">DELETE</span> to confirm</label>
              <input
                type="text"
                className="fs-input"
                value={deleteForm.confirmText}
                onChange={(e) => setDeleteForm((f) => ({ ...f, confirmText: e.target.value }))}
                placeholder="DELETE"
                required
              />
            </div>

            <div className="fs-modal-actions">
              <button type="button" className="fs-modal-btn cancel" onClick={closeModals} disabled={busy}>Cancel</button>
              <button type="submit" className="fs-modal-btn danger" disabled={busy}>
                {busy ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Deleting…</> : "Delete Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INFO MODAL */}
      {activeInfoModal && (
        <div className="info-modal-overlay" onClick={() => setActiveInfoModal(null)}>
          <div className="info-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="info-modal-close" onClick={() => setActiveInfoModal(null)}>
              <i className="fa-solid fa-xmark" />
            </button>

            {activeInfoModal === "privacy" && (
              <>
                <div className="info-modal-icon"><i className="fa-solid fa-shield-halved" /></div>
                <h2>Privacy Policy</h2>
                <p className="info-modal-subtitle">How SpaceS CICT collects, uses, and protects your information.</p>
                <div className="info-modal-body">
                  <p>
                    SpaceS CICT is a classroom allocation and scheduling platform built for the
                    College of Information and Communications Technology (CICT) at Bulacan State
                    University. We are committed to protecting the personal information of our
                    Department Heads, Local Registrars, Clerks, and Faculty Members in accordance
                    with Republic Act No. 10173, the Data Privacy Act of 2012.
                  </p>
                  <h4>Information We Collect</h4>
                  <ul>
                    <li>Account details such as name, email address, and assigned role.</li>
                    <li>Login activity and system usage logs for security and accountability.</li>
                    <li>Class schedules, room reservations, and related academic records.</li>
                  </ul>
                  <h4>How We Use Your Information</h4>
                  <ul>
                    <li>To authenticate accounts and provide role-based access to the system.</li>
                    <li>To manage classroom scheduling, reservations, and conflict resolution.</li>
                    <li>To send notifications about approvals, denials, and schedule changes.</li>
                  </ul>
                  <h4>Data Protection</h4>
                  <p>
                    All account and scheduling data is stored securely and is accessible only to
                    authorized personnel. Information is used strictly for the operational purposes
                    of classroom allocation and scheduling within CICT and will not be shared with
                    unauthorized third parties.
                  </p>
                </div>
              </>
            )}

            {activeInfoModal === "terms" && (
              <>
                <div className="info-modal-icon"><i className="fa-solid fa-file-signature" /></div>
                <h2>Terms of Use</h2>
                <p className="info-modal-subtitle">Please read these terms before using SpaceS CICT.</p>
                <div className="info-modal-body">
                  <p>
                    By logging in and using SpaceS CICT, you agree to use the platform responsibly
                    and only for its intended purpose: managing classroom allocation, scheduling,
                    and reservations for the College of Information and Communications Technology.
                  </p>
                  <h4>Account Responsibility</h4>
                  <ul>
                    <li>Accounts are created and managed by the Department Head and must not be shared with other individuals.</li>
                    <li>Users are responsible for keeping their login credentials confidential.</li>
                    <li>Repeated failed login attempts may result in a temporarily blocked account for security purposes.</li>
                  </ul>
                  <h4>Acceptable Use</h4>
                  <ul>
                    <li>Room reservations and schedule changes must reflect genuine academic or institutional needs.</li>
                    <li>Users must not attempt to bypass conflict detection or falsify reservation details.</li>
                    <li>Access is limited to the features available to the user's assigned role.</li>
                  </ul>
                  <h4>Availability</h4>
                  <p>
                    While the system is designed for reliable, real-time use, scheduled maintenance
                    or unforeseen issues may occasionally affect availability. Users will be
                    notified of major changes or disruptions when possible.
                  </p>
                </div>
              </>
            )}

            {activeInfoModal === "help" && (
              <>
                <div className="info-modal-icon"><i className="fa-solid fa-headset" /></div>
                <h2>Help Center</h2>
                <p className="info-modal-subtitle">
                  Need help using SpaceS CICT? Reach out through either email below, or check the FAQs.
                </p>
                <div className="contact-list">
                  <a href="mailto:spaces-bulsu@outlook.com" className="contact-item">
                    <i className="fa-brands fa-microsoft" />
                    <div>
                      <span className="contact-label">Outlook</span>
                      <span className="contact-value">spaces-bulsu@outlook.com</span>
                    </div>
                  </a>
                  <a href="mailto:spacescict@gmail.com" className="contact-item">
                    <i className="fa-brands fa-google" />
                    <div>
                      <span className="contact-label">Gmail</span>
                      <span className="contact-value">spacescict@gmail.com</span>
                    </div>
                  </a>
                </div>
                <button type="button" className="faq-jump-link" onClick={() => setActiveInfoModal("faq")}>
                  Check the FAQs first <i className="fa-solid fa-arrow-right" />
                </button>
              </>
            )}

            {activeInfoModal === "faq" && (
              <>
                <div className="info-modal-icon"><i className="fa-solid fa-circle-question" /></div>
                <h2>Frequently Asked Questions</h2>
                <p className="info-modal-subtitle">
                  Mabilisang sagot sa mga karaniwang tanong tungkol sa SpaceS CICT.
                </p>
                <div className="faq-list">
                  {FAQ_ITEMS.map((item, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div key={index} className={`faq-item ${isOpen ? "open" : ""}`}>
                        <button
                          type="button"
                          className="faq-question"
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        >
                          <span>{item.question}</span>
                          <i className="fa-solid fa-chevron-down faq-chevron" />
                        </button>
                        <div className="faq-answer-wrapper">
                          <p className="faq-answer">{item.answer}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </>
  );
}