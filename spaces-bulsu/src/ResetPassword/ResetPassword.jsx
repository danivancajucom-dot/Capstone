/**
 * ResetPassword.jsx
 * Route: /reset-password
 *
 * Firebase sends users here after clicking the password reset link in their email.
 * The URL will contain ?oobCode=... which we use to confirm the reset.
 *
 * After successful reset:
 *  - Updates Firestore: passwordReset = true, tempPassword = null
 *    so the Department Head can no longer see the temp password.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import {
  collection, query, where, getDocs, updateDoc, doc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import "./reset-password.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [stage, setStage]           = useState("loading"); // loading | form | success | error
  const [oobCode, setOobCode]       = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [showCf, setShowCf]         = useState(false);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("oobCode");
    if (!code) { setStage("error"); return; }

    verifyPasswordResetCode(auth, code)
      .then(userEmail => {
        setOobCode(code);
        setEmail(userEmail);
        setStage("form");
      })
      .catch(() => setStage("error"));
  }, []);

  const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8)              score++;
    if (/[A-Z]/.test(pw))           score++;
    if (/[0-9]/.test(pw))           score++;
    if (/[^A-Za-z0-9]/.test(pw))    score++;
    return score; // 0–4
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];
  const strength      = getStrength(password);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 8)       { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)      { setError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      // 1. Confirm the Firebase password reset
      await confirmPasswordReset(auth, oobCode, password);

      // 2. Find the Firestore user doc by email and clear the temp password
      const q    = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), {
          passwordReset: true,
          tempPassword:  null,
        });
      }

      setStage("success");
    } catch (err) {
      const MSG = {
        "auth/expired-action-code":  "This reset link has expired. Please request a new one.",
        "auth/invalid-action-code":  "This reset link is invalid or has already been used.",
        "auth/weak-password":        "Password is too weak. Use at least 8 characters.",
      };
      setError(MSG[err.code] ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="rp-shell">
        <div className="rp-card">
          <div className="rp-spinner"><i className="fa-solid fa-circle-notch fa-spin" /></div>
          <p className="rp-loading-text">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  // ── Error (invalid / expired link) ────────────────────────────────────────
  if (stage === "error") {
    return (
      <div className="rp-shell">
        <div className="rp-card">
          <div className="rp-icon-wrap rp-icon-error">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <h1 className="rp-title">Invalid Reset Link</h1>
          <p className="rp-subtitle">
            This password reset link is invalid or has already expired.
            Please contact your system administrator to request a new one.
          </p>
          <button className="rp-btn rp-btn-secondary" onClick={() => navigate("/")}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (stage === "success") {
    return (
      <div className="rp-shell">
        <div className="rp-card">
          <div className="rp-icon-wrap rp-icon-success">
            <i className="fa-solid fa-circle-check" />
          </div>
          <h1 className="rp-title">Password Updated</h1>
          <p className="rp-subtitle">
            Your password has been successfully set. You may now sign in to the
            SPACES University Portal using your new credentials.
          </p>
          <button className="rp-btn rp-btn-primary" onClick={() => navigate("/")}>
            Proceed to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="rp-shell">
      <div className="rp-card rp-card-form">

        {/* Header */}
        <div className="rp-header">
          <div className="rp-logo">
            <i className="fa-solid fa-lock" />
          </div>
          <div>
            <h1 className="rp-title">Set Your Password</h1>
            <p className="rp-subtitle">
              You are setting a password for <strong>{email}</strong>
            </p>
          </div>
        </div>

        <hr className="rp-divider" />

        {/* New password */}
        <div className="rp-form-group">
          <label className="rp-label">New Password</label>
          <div className="rp-input-wrap">
            <i className="rp-input-icon fa-solid fa-lock" />
            <input
              className="rp-input"
              type={showPw ? "text" : "password"}
              placeholder="Enter new password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button className="rp-eye-btn" type="button" onClick={() => setShowPw(v => !v)}>
              <i className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`} />
            </button>
          </div>

          {/* Strength bar */}
          {password.length > 0 && (
            <div className="rp-strength">
              <div className="rp-strength-bars">
                {[1,2,3,4].map(i => (
                  <div
                    key={i}
                    className="rp-strength-bar"
                    style={{ background: i <= strength ? strengthColor[strength] : "#e5e7eb" }}
                  />
                ))}
              </div>
              <span className="rp-strength-label" style={{ color: strengthColor[strength] }}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="rp-form-group">
          <label className="rp-label">Confirm Password</label>
          <div className="rp-input-wrap">
            <i className="rp-input-icon fa-solid fa-lock" />
            <input
              className="rp-input"
              type={showCf ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            <button className="rp-eye-btn" type="button" onClick={() => setShowCf(v => !v)}>
              <i className={`fa-solid ${showCf ? "fa-eye-slash" : "fa-eye"}`} />
            </button>
          </div>
          {confirm.length > 0 && password !== confirm && (
            <p className="rp-match-error"><i className="fa-solid fa-circle-xmark" /> Passwords do not match</p>
          )}
          {confirm.length > 0 && password === confirm && (
            <p className="rp-match-ok"><i className="fa-solid fa-circle-check" /> Passwords match</p>
          )}
        </div>

        {/* Requirements */}
        <ul className="rp-requirements">
          <li className={password.length >= 8 ? "met" : ""}>
            <i className={`fa-solid ${password.length >= 8 ? "fa-circle-check" : "fa-circle"}`} />
            At least 8 characters
          </li>
          <li className={/[A-Z]/.test(password) ? "met" : ""}>
            <i className={`fa-solid ${/[A-Z]/.test(password) ? "fa-circle-check" : "fa-circle"}`} />
            One uppercase letter
          </li>
          <li className={/[0-9]/.test(password) ? "met" : ""}>
            <i className={`fa-solid ${/[0-9]/.test(password) ? "fa-circle-check" : "fa-circle"}`} />
            One number
          </li>
        </ul>

        {error && (
          <div className="rp-error-box">
            <i className="fa-solid fa-circle-exclamation" />
            {error}
          </div>
        )}

        <button
          className="rp-btn rp-btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</>
            : "Set Password & Continue"
          }
        </button>

      </div>
    </div>
  );
}
