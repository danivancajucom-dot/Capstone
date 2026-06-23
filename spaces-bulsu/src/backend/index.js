import dotenv from "dotenv";
dotenv.config();

console.log("API KEY:", process.env.GEMINI_API_KEY);

import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ---------- RETRY FUNCTION ----------
async function generateWithRetry(prompt, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-1.5-flash",  // or "gemini-1.5-pro"
        contents: prompt,
      });
    } catch (error) {
      lastError = error;
      // Retry only on 503 (overload) and if we have attempts left
      if (error.status === 503 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      // If not a 503 or out of retries, throw immediately
      throw error;
    }
  }
  throw lastError; // Should never get here, but just in case
}

// ---------- EXTRACTION ENDPOINT ----------
app.post("/api/extract-schedule", async (req, res) => {
  try {
    const { rawText, room, semester, schoolYear } = req.body;

    const prompt = `
You are a university schedule extraction engine.

Extract ALL schedules from the provided text.

Return ONLY valid JSON.

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

- Return ONLY JSON array.
- No markdown.
- No explanation.
- Day must be:
  MON
  TUE
  WED
  THU
  FRI
  SAT
  SUN

- Time format:
  HH:mm (24-hour)

Examples:

7:00 AM -> 07:00
10:30 AM -> 10:30
1:00 PM -> 13:00
6:00 PM -> 18:00

Semester:
${semester}

School Year:
${schoolYear}

Room:
${room}

Schedule Text:

${rawText}
`;

    // 🔥 USE THE RETRY FUNCTION HERE
    const response = await generateWithRetry(prompt);

    let text = response.text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const schedules = JSON.parse(text);

    res.json({
      success: true,
      schedules,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    // Send a user‑friendly message
    const message = error.status === 503
      ? "The AI service is currently busy. Please try again in a few minutes."
      : error.message;
    res.status(500).json({
      success: false,
      message,
    });
  }
});

// ---------- START SERVER ----------
app.listen(5000, () => {
  console.log("Server running on port 5000");
});