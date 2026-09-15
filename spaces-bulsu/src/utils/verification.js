import emailjs from "@emailjs/browser";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ── EmailJS configuration ────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "service_qogg8xj";   // ← replace
const EMAILJS_TEMPLATE_ID = "template_asj2rbj";  // ← your template
const EMAILJS_PUBLIC_KEY  = "bNsod6OOQzMmRo0Cs";   // ← replace

// ── Code settings ────────────────────────────────────────────────────
export const CODE_LENGTH = 6;
export const CODE_TTL_MIN = 10;

// ── Friendly purpose labels used in the email ────────────────────────
const PURPOSE_LABELS = {
  "password-reset":  "reset your password",
  "password-change": "change your password",
  "email-change":    "change your email address",
};

/** Generate a random 6-digit numeric code. */
export function generateCode() {
  return Array.from({ length: CODE_LENGTH }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
}

/**
 * Create a code, save it in Firestore, and email it via EmailJS.
 * purpose: "password-reset" | "password-change" | "email-change"
 */
export async function createAndSendCode({ email, purpose, name = "" }) {
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MIN * 60 * 1000;
  const id = `${email.toLowerCase()}__${purpose}`;

  // 1. Persist the code (single-use + TTL)
  await setDoc(doc(db, "verificationCodes", id), {
    email: email.toLowerCase(),
    code,
    purpose,
    expiresAt,
    createdAt: Date.now(),
    used: false,
  });

  // 2. Send via EmailJS
  const templateParams = {
    to_email: email,
    to_name: name || email.split("@")[0],
    code,
    ttl_minutes: CODE_TTL_MIN,
    purpose_label: PURPOSE_LABELS[purpose] || "verify your identity",
  };

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams,
    { publicKey: EMAILJS_PUBLIC_KEY }
  );

  return code;
}

/** Verify the code the user typed. Marks the code as used on success. */
export async function verifyCode({ email, purpose, entered }) {
  const id = `${email.toLowerCase()}__${purpose}`;
  const snap = await getDoc(doc(db, "verificationCodes", id));

  if (!snap.exists())
    throw new Error("No code found. Please request a new one.");

  const data = snap.data();

  if (data.used)         throw new Error("This code has already been used.");
  if (Date.now() > data.expiresAt)
    throw new Error("This code has expired. Please request a new one.");
  if (data.code !== String(entered).trim())
    throw new Error("Incorrect code. Please try again.");

  await updateDoc(doc(db, "verificationCodes", id), { used: true });
  return true;
}