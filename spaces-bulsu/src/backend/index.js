// ---------- ENV: local dev only (Vercel injects env vars) ----------
if (!process.env.VERCEL) {
  const { config } = await import("dotenv");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  config({ path: join(__dirname, ".env") });
}

import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log("🚀 Boot:", {
  hasGemini: !!GEMINI_API_KEY,
  hasFirebase: !!process.env.FIREBASE_SERVICE_ACCOUNT,
  onVercel: !!process.env.VERCEL,
  nodeEnv: process.env.NODE_ENV,
  nodeVersion: process.version,
});

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set");
}

// ✅ KEEP MANY MODELS — budget-based timeout will protect wall-clock time
const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
];

// Total wall-clock budget for the whole fallback chain.
// Vercel Hobby cap = 10s. Leave 1s headroom for cold start + body parse + response.
const TOTAL_BUDGET_MS = 9000;
const PER_MODEL_MAX_MS = 4500;

const buildGeminiUrl = (model) =>
  GEMINI_API_KEY
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
    : null;

// ---------- GEMINI WITH BUDGET-BASED FALLBACK ----------
async function generateWithRetry(prompt) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured on server.");

  const startTime = Date.now();
  let lastError;
  const tried = [];

  for (const model of GEMINI_MODELS) {
    const elapsed = Date.now() - startTime;
    const remaining = TOTAL_BUDGET_MS - elapsed;

    if (remaining < 800) {
      console.warn(
        `⏱️ Budget exhausted after ${elapsed}ms — stopping (tried: ${tried.join(", ")})`
      );
      break;
    }

    const timeoutMs = Math.min(remaining, PER_MODEL_MAX_MS);
    tried.push(`${model}(${timeoutMs}ms)`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(buildGeminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const err = new Error(data?.error?.message || "Unknown Gemini error");
        err.status = response.status;
        err.model = model;
        throw err;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");

      const totalMs = Date.now() - startTime;
      console.log(`✅ Success via ${model} in ${totalMs}ms`);
      return text;
    } catch (error) {
      lastError = error;
      const totalMs = Date.now() - startTime;

      // Timeout — try next model immediately
      if (error.name === "AbortError") {
        console.warn(
          `⏱️ ${model} timed out after ${timeoutMs}ms (total ${totalMs}ms) — trying next`
        );
        continue;
      }
      if (error.status === 401 || error.status === 403) {
        throw new Error("Invalid Gemini API key.");
      }
      if (error.status === 429) {
        console.warn(`🚫 ${model} rate limited (429) — trying next`);
        continue;
      }
      if (error.status === 503) {
        console.warn(`🔄 ${model} overloaded (503) — trying next`);
        continue;
      }

      // Other error (404 model not found, etc.) — try next
      console.warn(`⚠️ ${model} failed: ${error.message} — trying next`);
      continue;
    }
  }

  // All attempts exhausted — detect error type for clearer message
  if (lastError?.status === 429) {
    throw new Error(
      "Too many requests to AI right now. Please wait 1 minute and try again."
    );
  }
  if (lastError?.status === 503) {
    throw new Error(
      "AI service is temporarily overloaded. Please try again in a few seconds."
    );
  }
  if (lastError?.name === "AbortError") {
    throw new Error(
      "AI is taking too long. Please try again, or upload a smaller file."
    );
  }
  throw lastError || new Error("All AI models failed. Please try again.");
}

// ---------- SAFE JSON PARSER ----------
function extractJSON(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("No JSON array found: " + cleaned.slice(0, 300));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// =============================================================
//  FIREBASE ADMIN via NATIVE CRYPTO + REST API
// =============================================================

let cachedToken = null;
let cachedTokenExpiry = 0;

function base64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiry > now + 60) return cachedToken;

  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, "base64");
  const sig64url = signature
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsigned}.${sig64url}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(
      tokenData.error_description || tokenData.error || "Google OAuth token exchange failed"
    );
  }

  cachedToken = tokenData.access_token;
  cachedTokenExpiry = now + (tokenData.expires_in || 3600);
  console.log("✅ Google access token acquired");
  return cachedToken;
}

async function updateUserPassword(email, newPassword) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = sa.project_id;
  const accessToken = await getGoogleAccessToken();

  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email: [email] }),
    }
  );

  const lookupData = await lookupRes.json();
  if (!lookupRes.ok) {
    const msg = lookupData?.error?.message || "User lookup failed";
    const err = new Error(msg);
    if (/USER_NOT_FOUND|not found/i.test(msg)) {
      err.code = "auth/user-not-found";
    }
    throw err;
  }

  const user = lookupData?.users?.[0];
  if (!user) {
    const err = new Error("User not found");
    err.code = "auth/user-not-found";
    throw err;
  }

  const updateRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        localId: user.localId,
        password: newPassword,
      }),
    }
  );

  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    throw new Error(updateData?.error?.message || "Password update failed");
  }

  return { uid: user.localId, email: user.email };
}

// =============================================================
//  ROUTES
// =============================================================

app.get("/api/test-key", async (req, res) => {
  try {
    const text = await generateWithRetry("Say the word OK and nothing else.");
    res.json({ success: true, response: text });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------- ENDPOINT 1: With rooms ----------
app.post("/api/extract-schedule", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server config error: GEMINI_API_KEY missing.",
      });
    }

    const { rawText, room, semester, schoolYear } = req.body;

    if (!rawText || rawText.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file appears to be empty or unreadable.",
      });
    }

    const prompt = `
You are a university schedule extraction engine. Extract ALL schedules from the text below.
Return ONLY a valid JSON array. No markdown, no extra text.

Each object must have exactly these fields:
  "subject": string (course code)
  "section": string (section code)
  "faculty": string (instructor name)
  "room": string (room name, use "${room}" if not found)
  "day": string (MON, TUE, WED, THU, FRI, SAT, SUN)
  "startTime": string (24-hour format HH:mm)
  "endTime": string (24-hour format HH:mm)

Rules:
- Convert all times to 24-hour format.
- If a field is missing, use empty string or "TBA" for faculty.
- Extract the ROOM number/name from each entry.
- Parse ALL schedules listed.

Semester: ${semester}
School Year: ${schoolYear}
Default Room: ${room}

Schedule Text:
${rawText}
`;

    const text = await generateWithRetry(prompt);
    let schedules = extractJSON(text);

    if (!Array.isArray(schedules)) throw new Error("Response is not an array");

    schedules = schedules
      .map((item) => ({
        subject: item.subject || "",
        section: item.section || "",
        faculty: item.faculty || "TBA",
        room: item.room || room,
        day: item.day ? item.day.toUpperCase().trim() : "",
        startTime: item.startTime || "",
        endTime: item.endTime || "",
      }))
      .filter((s) => s.subject || s.day);

    console.log(`✅ Extracted ${schedules.length} schedule(s)`);
    res.json({ success: true, schedules });
  } catch (error) {
    console.error("❌ Extraction error:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to extract schedule.",
    });
  }
});

// ---------- ENDPOINT 2: Online classes ----------
app.post("/api/extract-online-schedule", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server config error: GEMINI_API_KEY missing.",
      });
    }

    const { rawText, semester, schoolYear, faculty } = req.body;

    if (!rawText || rawText.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file appears to be empty or unreadable.",
      });
    }

    const prompt = `
You are a university schedule extraction engine. Extract ONLY the schedules that do NOT have a room assigned (online classes).
Return ONLY a valid JSON array. No markdown, no extra text.

Each object must have exactly these fields:
  "subject": string (course code)
  "section": string (section code)
  "faculty": string (instructor name, use "${faculty || "TBA"}" if not found)
  "day": string (MON, TUE, WED, THU, FRI, SAT, SUN)
  "startTime": string (24-hour format HH:mm)
  "endTime": string (24-hour format HH:mm)

Rules:
- Convert all times to 24-hour format.
- If a field is missing, use empty string or "TBA" for faculty.
- DO NOT include any schedule that has a room number/name.
- ONLY include schedules that are online classes (no room assigned).
- The faculty name should be "${faculty || "TBA"}" for all schedules.
- If a schedule has a room, skip it entirely.
- Parse ONLY online schedules listed.

Semester: ${semester}
School Year: ${schoolYear}
Faculty: ${faculty || "TBA"}

Schedule Text:
${rawText}
`;

    const text = await generateWithRetry(prompt);
    let schedules = extractJSON(text);

    if (!Array.isArray(schedules)) throw new Error("Response is not an array");

    schedules = schedules
      .map((item) => ({
        subject: item.subject || "",
        section: item.section || "",
        faculty: item.faculty || faculty || "TBA",
        day: item.day ? item.day.toUpperCase().trim() : "",
        startTime: item.startTime || "",
        endTime: item.endTime || "",
      }))
      .filter((s) => s.subject || s.day);

    console.log(
      `✅ Extracted ${schedules.length} online schedule(s) for: ${
        faculty || "Unknown"
      }`
    );
    res.json({ success: true, schedules });
  } catch (error) {
    console.error("❌ Extraction error:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to extract online schedule.",
    });
  }
});

// ---------- ENDPOINT 3: Reset Password ----------
app.post("/api/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(500).json({
        success: false,
        message: "Server config error: FIREBASE_SERVICE_ACCOUNT missing.",
      });
    }

    const result = await updateUserPassword(email, newPassword);
    console.log(`✅ Password reset for: ${email} (uid: ${result.uid})`);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("❌ Reset password error:", error.message);
    let message = "Failed to reset password.";
    if (
      error.code === "auth/user-not-found" ||
      /USER_NOT_FOUND|not found/i.test(error.message)
    ) {
      message = "No account found with that email.";
    } else if (/INVALID_PASSWORD|WEAK_PASSWORD/i.test(error.message)) {
      message = "Password is too weak. Use a stronger one.";
    }
    res.status(500).json({ success: false, message });
  }
});

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error("💥 Unhandled:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});

// ---------- LOCAL DEV LISTEN ONLY ----------
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

export default app;