import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ---------- RETRY FUNCTION ----------
async function generateWithRetry(prompt, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json", // ✅ Forces JSON response
          },
        }),
      });

      const data = await response.json();

      // ✅ Log full response so we can debug
      console.log("Gemini response status:", response.status);
      console.log("Gemini data:", JSON.stringify(data, null, 2));

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
    res.json({ success: false, status: error.status, message: error.message });
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
You are a university schedule extraction engine.
Extract ALL schedules from the provided text.
Return ONLY a valid JSON array. No markdown. No explanation.

Format:
[
  {
    "subject": "",
    "section": "",
    "faculty": "",
    "room": "${room}",
    "day": "",
    "startTime": "",
    "endTime": ""
  }
]

Rules:
- Return ONLY the JSON array, nothing else.
- Day must be one of: MON, TUE, WED, THU, FRI, SAT, SUN
- Time format: HH:mm (24-hour). Example: 7:00 AM = 07:00, 1:00 PM = 13:00

Semester: ${semester}
School Year: ${schoolYear}
Room: ${room}

Schedule Text:
${rawText}
`;

    const text = await generateWithRetry(prompt);
    const schedules = extractJSON(text);

    console.log(`✅ Extracted ${schedules.length} schedule(s)`);
    res.json({ success: true, schedules });

  } catch (error) {
    console.error("❌ Extraction error:", error.message);

    let message = "Failed to extract schedule.";
    if (error.status === 400) message = "Bad request — API key may be invalid.";
    else if (error.status === 401 || error.status === 403) message = "Unauthorized — check your GEMINI_API_KEY.";
    else if (error.status === 429) message = "Rate limit hit — please wait and try again.";
    else if (error.status === 503) message = "Gemini is busy. Please try again in a few minutes.";

    res.status(500).json({ success: false, message });
  }
});

// ---------- START ----------
app.listen(5000, () => {
  console.log("✅ Server running on port 5000");
  console.log("🔑 API Key prefix:", GEMINI_API_KEY?.slice(0, 10) + "...");
});