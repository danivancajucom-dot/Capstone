import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

// ✅ UPDATE: Use the correct model name
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

// ---------- RETRY FUNCTION ----------
async function generateWithRetry(prompt, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY, // ✅ Header authentication
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

// ---------- EXTRACTION ENDPOINT ----------
app.post("/api/extract-schedule", async (req, res) => {
  try {
    const { rawText, room, semester, schoolYear } = req.body;

    if (!rawText || rawText.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file appears to be empty or unreadable.",
      });
    }

    const prompt = `
You are a university schedule extraction engine. Extract ALL schedules from the text below.
Return ONLY a valid JSON array. Do not include any explanation, markdown, or extra text.

Each object must have exactly these fields:
  "subject": string (course code, e.g., "CS101")
  "section": string (section code, e.g., "A")
  "faculty": string (instructor name, e.g., "Dr. Smith")
  "room": string (room name, use "${room}" if not found)
  "day": string (one of: MON, TUE, WED, THU, FRI, SAT, SUN)
  "startTime": string (24-hour format HH:mm, e.g., "08:00")
  "endTime": string (24-hour format HH:mm, e.g., "10:00")

Rules:
- Convert all times to 24-hour format (e.g., 2:30 PM -> 14:30).
- If a field is missing, use an empty string for text fields, and "TBA" for faculty.
- Parse every schedule entry you find, even if the text is messy or in tables.
- If you see a schedule with no day or no subject, skip it.

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

    let message = "Failed to extract schedule.";
    if (error.status === 400) message = "Bad request – invalid API key or authentication.";
    else if (error.status === 401 || error.status === 403) message = "Unauthorized – check your GEMINI_API_KEY.";
    else if (error.status === 429) message = "Rate limit hit – please wait and try again.";
    else if (error.status === 503) message = "Gemini is busy. Please try again in a few minutes.";
    else if (error.message) message = error.message;

    res.status(500).json({ success: false, message });
  }
});

// ---------- START ----------
app.listen(5000, () => {
  console.log("✅ Server running on port 5000");
  console.log("🔑 API Key prefix:", GEMINI_API_KEY?.slice(0, 10) + "...");
});