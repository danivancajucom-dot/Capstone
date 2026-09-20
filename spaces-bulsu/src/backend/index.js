import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set in env vars");
}

// ✅ Use gemini-3.6-flash (original model)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

// ---------- RETRY FUNCTION ----------
async function generateWithRetry(prompt, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data?.error?.message || "Unknown Gemini error";
        const err = new Error(errMsg);
        err.status = response.status;
        throw err;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");

      return text;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      const shouldRetry = (error.status === 503 || error.status === 429) && attempt < maxRetries;
      if (shouldRetry) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (error.status === 401 || error.status === 403) {
        throw new Error("Invalid API key. Please check your GEMINI_API_KEY in .env");
      }
      throw error;
    }
  }
  throw lastError;
}

// ---------- SAFE JSON PARSER ----------
function extractJSON(text) {
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("No JSON array found: " + cleaned.slice(0, 300));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ---------- TEST ENDPOINT ----------
app.get("/api/test-key", async (req, res) => {
  try {
    const text = await generateWithRetry("Say the word OK and nothing else.");
    res.json({ success: true, response: text });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------- ENDPOINT 1: With rooms (Local Registrar) ----------
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

    if (!Array.isArray(schedules)) {
      throw new Error("Response is not an array");
    }

    schedules = schedules.map((item) => ({
      subject: item.subject || "",
      section: item.section || "",
      faculty: item.faculty || "TBA",
      room: item.room || room,
      day: item.day ? item.day.toUpperCase().trim() : "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
    }));

    schedules = schedules.filter((s) => s.subject || s.day);

    console.log(`✅ Extracted ${schedules.length} schedule(s)`);
    res.json({ success: true, schedules });

  } catch (error) {
    console.error("❌ Extraction error:", error.message);
    const status = error.status || 500;
    const message = error.message || "Failed to extract schedule.";
    res.status(status).json({ success: false, message });
  }
});

// ---------- ENDPOINT 2: Online classes (Faculty) ----------
// ✅ Only extracts schedules WITHOUT room (online classes)
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
  "faculty": string (instructor name, use "${faculty || 'TBA'}" if not found)
  "day": string (MON, TUE, WED, THU, FRI, SAT, SUN)
  "startTime": string (24-hour format HH:mm)
  "endTime": string (24-hour format HH:mm)

Rules:
- Convert all times to 24-hour format.
- If a field is missing, use empty string or "TBA" for faculty.
- DO NOT include any schedule that has a room number/name.
- ONLY include schedules that are online classes (no room assigned).
- The faculty name should be "${faculty || 'TBA'}" for all schedules.
- If a schedule has a room, skip it entirely.
- Parse ONLY online schedules listed.

Semester: ${semester}
School Year: ${schoolYear}
Faculty: ${faculty || 'TBA'}

Schedule Text:
${rawText}
`;

    const text = await generateWithRetry(prompt);
    let schedules = extractJSON(text);

    if (!Array.isArray(schedules)) {
      throw new Error("Response is not an array");
    }

    schedules = schedules.map((item) => ({
      subject: item.subject || "",
      section: item.section || "",
      faculty: item.faculty || faculty || "TBA",
      day: item.day ? item.day.toUpperCase().trim() : "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
    }));

    // Additional filter to ensure no room field accidentally appears
    schedules = schedules.filter((s) => s.subject || s.day);

    console.log(`✅ Extracted ${schedules.length} online schedule(s) for faculty: ${faculty || 'Unknown'}`);
    res.json({ success: true, schedules });

  } catch (error) {
    console.error("❌ Extraction error:", error.message);
    const status = error.status || 500;
    const message = error.message || "Failed to extract online schedule.";
    res.status(status).json({ success: false, message });
  }
});

// ---------- FIREBASE ADMIN SETUP ----------
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.error("❌ Firebase Admin init failed:", err.message);
  }
}

// ---------- ENDPOINT 3: Reset Password (Forgot Password flow) ----------
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

    const auth = getAuth();
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password: newPassword });

    console.log(`✅ Password reset for: ${email}`);
    res.json({ success: true, message: "Password updated successfully." });

  } catch (error) {
    console.error("❌ Reset password error:", error.message);
    let message = "Failed to reset password.";
    if (error.code === "auth/user-not-found") {
      message = "No account found with that email.";
    }
    res.status(500).json({ success: false, message });
  }
});

// ---------- START ----------
export default app;

// Kung gusto mo pa ring mag-test locally gamit ang "npm run dev:backend", 
// pwede mong i-conditional yung listen:
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}