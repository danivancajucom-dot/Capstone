import { useState, useEffect } from "react";
import "./faculty-settings.css";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { THEMES, applyTheme, getStoredThemeId, DEFAULT_THEME_ID } from "../../utils/theme"; // ⚠️ adjust this path to match your project structure
import Toast from "../../Popup/Toast/Toast";

export default function FacultySettings() {
  const [loading, setLoading]     = useState(true);
  const [email, setEmail]         = useState("");
  const [uid, setUid]             = useState(auth.currentUser?.uid || null);
  const [sendingReset, setSendingReset] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(() => getStoredThemeId(auth.currentUser?.uid));
  const [savingTheme, setSavingTheme]     = useState(false);

  const [toast, setToast] = useState({ show: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUid(user.uid);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setEmail(d.email || user.email || "");
          // This account's saved theme, scoped to their uid — never a value
          // left over from a different person on this device.
          const themeId = d.themeColor || DEFAULT_THEME_ID;
          setSelectedTheme(themeId);
          applyTheme(themeId, user.uid);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleResetPassword = async () => {
    if (!email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("success", "Reset Email Sent", "Check your inbox for password reset instructions.");
    } catch (err) {
      console.error(err);
      showToast("error", "Reset Failed", err.message);
    } finally {
      setSendingReset(false);
    }
  };

  const handleSelectTheme = async (themeId) => {
    if (themeId === selectedTheme || savingTheme) return;

    setSelectedTheme(themeId);
    applyTheme(themeId, uid); // instant visual feedback, cached for this account

    const user = auth.currentUser;
    if (!user) return;

    setSavingTheme(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { themeColor: themeId });
      showToast("success", "Theme Updated", "Your color theme has been saved.");
    } catch (err) {
      console.error(err);
      showToast("error", "Couldn't Save Theme", err.message);
    } finally {
      setSavingTheme(false);
    }
  };

  if (loading) {
    return (
      <div className="fs-page">
        <div className="fs-card">
          <h3>Loading settings...</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fs-page">

        {/* ── Account Security ─────────────────────────────────────────── */}
        <div className="fs-card">
          <div className="fs-header">
            <h2>Account Security</h2>
            <p>Manage your password for this account.</p>
          </div>

          <div className="fs-field">
            <label>Email</label>
            <input className="fs-input" value={email} readOnly />
          </div>

          <div className="fs-field">
            <label>Password</label>
            <button
              className="fs-reset-password-btn"
              onClick={handleResetPassword}
              disabled={sendingReset}
            >
              {sendingReset
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Sending…</>
                : <><i className="fa-solid fa-key"></i> Send Password Reset Email</>
              }
            </button>
            <p className="fs-field-hint">
              We'll email you a secure link to set a new password.
            </p>
          </div>
        </div>

        {/* ── Appearance / Theme ───────────────────────────────────────── */}
        <div className="fs-card">
          <div className="fs-header">
            <h2>Appearance</h2>
            <p>Pick the accent color used across your SpaceS dashboard.</p>
          </div>

          <div className="fs-theme-grid">
            {THEMES.map((theme) => {
              const active = selectedTheme === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  className={`fs-theme-card ${active ? "active" : ""}`}
                  onClick={() => handleSelectTheme(theme.id)}
                >
                  <div className="fs-theme-swatches">
                    <span className="fs-swatch" style={{ background: theme.accent }}></span>
                    <span className="fs-swatch fs-swatch-soft" style={{ background: theme.accentSoft }}></span>
                    <span className="fs-swatch fs-swatch-white"></span>
                  </div>
                  <div className="fs-theme-text">
                    <span className="fs-theme-name">{theme.name}</span>
                    <span className="fs-theme-desc">{theme.description}</span>
                  </div>
                  {active && (
                    <span className="fs-theme-check">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

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