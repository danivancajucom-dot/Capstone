// src/utils/findFacultyUser.js
import { normalizeName } from "./normalizeName";

const generatePatterns = (name) => {
  if (!name) return [];
  // Remove commas, dots, extra spaces, lower case
  let clean = name.replace(/,/g, ' ').replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const words = clean.split(' ');
  if (words.length === 1) return [clean];

  const first = words[0];
  const last = words[words.length - 1];
  const middle = words.slice(1, -1).join(' ');

  const patterns = new Set();
  // Basic
  patterns.add(`${first} ${last}`);
  patterns.add(`${last} ${first}`);
  patterns.add(`${last}, ${first}`);
  // With middle (if any) – but we ignore middle for matching, so we don't add those
  // Actually we want to ignore middle, so we only use first+last combinations.
  // Also include the original cleaned name in case it helps
  patterns.add(clean);
  // If there was a comma, the original might be "last, first" which is already covered.
  return Array.from(patterns);
};

export const findFacultyUser = (usersSnap, facultyName) => {
  if (!facultyName || !usersSnap) {
    console.warn("findFacultyUser: missing facultyName or usersSnap");
    return null;
  }

  const schedulePatterns = generatePatterns(facultyName);
  console.log("🔍 Looking for faculty:", facultyName, "→ patterns:", schedulePatterns);

  for (const doc of usersSnap.docs) {
    const user = doc.data();
    if (user.role !== "faculty") continue;

    // Build user full name from firstName and lastName
    const userFull = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (!userFull) continue;

    const userPatterns = generatePatterns(userFull);
    // Check if any schedule pattern matches any user pattern
    const matched = schedulePatterns.some(sp => userPatterns.includes(sp));
    if (matched) {
      console.log("✅ Found faculty:", doc.id, user.firstName, user.lastName);
      return doc;
    }
  }

  console.warn("❌ Faculty not found for:", facultyName);
  return null;
};