import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import "./reset-password.css";
import OtpInput from "../components/OtpInput/OtpInput";
import {
  createAndSendCode,
  verifyCode,
  CODE_LENGTH,
  CODE_TTL_MIN,
} from "../utils/verification";

export default function ResetPassword() {
  const navigate = useNavigate();

  // stages: request | verify | form | success
  const [stage, setStage] = useState("request");

  const [resetEmail, setResetEmail] = useState("");
  const [userEmail, setUserEmail]   = useState("");
  const [userName, setUserName]     = useState("");

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const [resendIn, setResendIn] = useState(0);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);

  const [error, setError]           = useState("");
  const [sending, setSending]       = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Password strength
  const getStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e"];
  const strength = getStrength(password);

  // ── STEP 1: send code ────────────────────────────────────────────
  const handleSendCode = async () => {
    setError("");
    if (!resetEmail.trim()) return setError("Please enter your email address.");

    setSending(true);
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", resetEmail.trim())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setError("No account found with that email address.");
        return;
      }

      const data = snap.docs[0].data();
      const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();

      setUserEmail(resetEmail.trim());
      setUserName(name);

      await createAndSendCode({
        email: resetEmail.trim(),
        purpose: "password-reset",
        name,
      });

      setCode(Array(CODE_LENGTH).fill(""));
      setStage("verify");
      setResendIn(30);
    } catch (err) {
      console.error(err);
      setError(err?.text || err?.message || "Unable to send verification code.");
    } finally {
      setSending(false);
    }
  };

  // ── STEP 2: verify code ──────────────────────────────────────────
  const handleVerifyCode = async () => {
    setError("");
    const entered = code.join("");
    if (entered.length !== CODE_LENGTH)
      return setError(`Please enter the ${CODE_LENGTH}-digit code.`);

    setVerifying(true);
    try {
      await verifyCode({
        email: userEmail,
        purpose: "password-reset",
        entered,
      });
      setStage("form");
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setError("");
    try {
      await createAndSendCode({
        email: userEmail,
        purpose: "password-reset",
        name: userName,
      });
      setCode(Array(CODE_LENGTH).fill(""));
      setResendIn(30);
    } catch (err) {
      setError(err?.text || err?.message || "Unable to resend code.");
    }
  };

  // ── STEP 3: set new password ─────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (!/[A-Z]/.test(password))
      return setError("Password must contain an uppercase letter.");
    if (!/[0-9]/.test(password))
      return setError("Password must contain a number.");
    if (password !== confirm) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      // Backend endpoint (firebase-admin) — updates Firebase Auth password
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, newPassword: password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Failed to update password.");
      }

      // Best-effort Firestore cleanup
      try {
        const q = query(
          collection(db, "users"),
          where("email", "==", userEmail)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), {
            passwordReset: true,
            tempPassword: null,
          });
        }
      } catch (e) {
        console.warn("Firestore cleanup skipped:", e);
      }

      setStage("success");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Back button ──────────────────────────────────────────────────
  const BackButton = () => (
    <button
      type="button"
      className="rp-back-btn"
      onClick={() => navigate("/")}
    >
      <i className="fa-solid fa-arrow-left" />
      <span>Back</span>
    </button>
  );

  // ── Stage: request ───────────────────────────────────────────────
  if (stage === "request") {
    return (
      <div className="rp-shell">
        <BackButton />
        <div className="rp-card">
          <div className="rp-icon-wrap rp-icon-brand">
            <i className="fa-solid fa-envelope" />
          </div>

          <h1 className="rp-title">Forgot Password</h1>

          <p className="rp-subtitle">
            Enter your email address and we'll send you a 6-digit verification
            code.
          </p>

          <input
            className="rp-input"
            type="email"
            placeholder="Email Address"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />

          {error && <div className="rp-error-box">{error}</div>}

          <button
            className="rp-btn rp-btn-primary"
            onClick={handleSendCode}
            disabled={sending}
          >
            {sending ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" /> Sending…
              </>
            ) : (
              "Send Verification Code"
            )}
          </button>

          <p className="rp-back-link" onClick={() => navigate("/")}>
            Back to Login
          </p>
        </div>
      </div>
    );
  }

  // ── Stage: verify ────────────────────────────────────────────────
  if (stage === "verify") {
    return (
      <div className="rp-shell">
        <BackButton />
        <div className="rp-card">
          <div className="rp-icon-wrap rp-icon-brand">
            <i className="fa-solid fa-shield-halved" />
          </div>

          <h1 className="rp-title">Enter Verification Code</h1>

          <p className="rp-subtitle">
            We sent a 6-digit code to <strong>{userEmail}</strong>. It expires
            in {CODE_TTL_MIN} minutes.
          </p>

          <OtpInput
            value={code}
            onChange={setCode}
            length={CODE_LENGTH}
            disabled={verifying}
          />

          {error && <div className="rp-error-box">{error}</div>}

          <button
            className="rp-btn rp-btn-primary"
            onClick={handleVerifyCode}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" /> Verifying…
              </>
            ) : (
              "Verify Code"
            )}
          </button>

          <p
            className="rp-back-link"
            onClick={handleResend}
            style={{ opacity: resendIn > 0 ? 0.6 : 1 }}
          >
            {resendIn > 0
              ? `Resend code in ${resendIn}s`
              : "Didn't get the code? Resend"}
          </p>
        </div>
      </div>
    );
  }

  // ── Stage: success ───────────────────────────────────────────────
  if (stage === "success") {
    return (
      <div className="rp-shell">
        <BackButton />
        <div className="rp-card">
          <div className="rp-icon-wrap rp-icon-success">
            <i className="fa-solid fa-circle-check" />
          </div>

          <h1 className="rp-title">Password Updated</h1>

          <p className="rp-subtitle">
            Your password has been successfully set. You may now sign in to
            the SPACES University Portal using your new credentials.
          </p>

          <button
            className="rp-btn rp-btn-primary"
            onClick={() => navigate("/")}
          >
            Proceed to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Stage: form (set new password) ───────────────────────────────
  return (
    <div className="rp-shell">
      <BackButton />
      <div className="rp-card rp-card-form">
        <div className="rp-form-header">
          <div className="rp-icon-wrap rp-icon-brand">
            <i className="fa-solid fa-lock" />
          </div>
          <h1 className="rp-title">Set Your Password</h1>
          <p className="rp-subtitle">
            You are setting a password for <strong>{userEmail}</strong>
          </p>
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
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="rp-eye-btn"
              type="button"
              onClick={() => setShowPw((v) => !v)}
            >
              <i
                className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`}
              />
            </button>
          </div>

          {password.length > 0 && (
            <div className="rp-strength">
              <div className="rp-strength-bars">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rp-strength-bar"
                    style={{
                      background:
                        i <= strength ? strengthColor[strength] : "#e5e7eb",
                    }}
                  />
                ))}
              </div>
              <span
                className="rp-strength-label"
                style={{ color: strengthColor[strength] }}
              >
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
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              className="rp-eye-btn"
              type="button"
              onClick={() => setShowCf((v) => !v)}
            >
              <i
                className={`fa-solid ${showCf ? "fa-eye-slash" : "fa-eye"}`}
              />
            </button>
          </div>

          {confirm.length > 0 && password !== confirm && (
            <p className="rp-match-error">
              <i className="fa-solid fa-circle-xmark" /> Passwords do not match
            </p>
          )}
          {confirm.length > 0 && password === confirm && (
            <p className="rp-match-ok">
              <i className="fa-solid fa-circle-check" /> Passwords match
            </p>
          )}
        </div>

        {/* Requirements */}
        <ul className="rp-requirements">
          <li className={password.length >= 8 ? "met" : ""}>
            <i
              className={`fa-solid ${
                password.length >= 8 ? "fa-circle-check" : "fa-circle"
              }`}
            />
            At least 8 characters
          </li>
          <li className={/[A-Z]/.test(password) ? "met" : ""}>
            <i
              className={`fa-solid ${
                /[A-Z]/.test(password) ? "fa-circle-check" : "fa-circle"
              }`}
            />
            One uppercase letter
          </li>
          <li className={/[0-9]/.test(password) ? "met" : ""}>
            <i
              className={`fa-solid ${
                /[0-9]/.test(password) ? "fa-circle-check" : "fa-circle"
              }`}
            />
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
          {submitting ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin" /> Saving…
            </>
          ) : (
            "Set Password & Continue"
          )}
        </button>

        <p className="rp-back-link" onClick={() => navigate("/")}>
          Back to Login
        </p>
      </div>
    </div>
  );
}