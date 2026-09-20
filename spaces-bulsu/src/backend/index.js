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

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" })); // Vercel hard-caps ~4.5MB

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ---------- Boot diagnostics (visible in Vercel → Logs) ----------
console.log("🚀 Boot:", {
  hasGemini: !!GEMINI_API_KEY,
  onVercel: !!process.env.VERCEL,
  nodeEnv: process.env.NODE_ENV,
  nodeVersion: process.version,
});

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set");
}

const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  : null;

// ---------- GEMINI WITH RETRY + TIMEOUT ----------
async function generateWithRetry(prompt, maxRetries = 1) {
  if (!GEMINI_URL) throw new Error("GEMINI_API_KEY is not configured on server.");

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 8s — safe sa 10s Hobby cap
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(GEMINI_URL, {
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
        throw err;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (error) {
      lastError = error;
      console.error(`Gemini attempt ${attempt} failed:`, error.message);

      if (error.name === "AbortError") {
        throw new Error("Gemini request timed out. Try a smaller file.");
      }
      if ((error.status === 503 || error.status === 429) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (error.status === 401 || error.status === 403) {
        throw new Error("Invalid Gemini API key.");
      }
      throw error;
    }
  }
  throw lastError;
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
//  ROUTES
// =============================================================

app.get("/api/test-key", async (req, res) => {
  try {
    const text = await generateWithRetry("Say the word OK and nothing else.", 1);
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

// ---------- ENDPOINT 3: Reset Password — DISABLED ----------
// Firebase Admin removed to fix the `jose` ESM crash on Vercel.
// If you need password reset, do it from the client using Firebase SDK:
//   import { sendPasswordResetEmail } from "firebase/auth";
//   await sendPasswordResetEmail(auth, email);
app.post("/api/reset-password", (req, res) => {
  res.status(501).json({
    success: false,
    message:
      "Password reset is disabled on the server. Use client-side Firebase reset instead.",
  });
});

// ---------- GLOBAL ERROR HANDLER (must be last) ----------
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