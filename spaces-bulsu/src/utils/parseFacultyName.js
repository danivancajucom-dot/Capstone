/**
 * Parses a faculty name string into lastName and firstName.
 * Supports formats:
 *   - "CAPARAS, Alex" -> { lastName: "Caparas", firstName: "Alex" }
 *   - "Dela Cruz, Juan" -> { lastName: "Dela Cruz", firstName: "Juan" }
 *   - "Juan Dela Cruz"  -> { lastName: "Dela Cruz", firstName: "Juan" }
 *   - "Dr. Juan Dela Cruz" -> { lastName: "Dela Cruz", firstName: "Juan" }
 *   - "Juan C. Dela Cruz" -> { lastName: "Dela Cruz", firstName: "Juan" }
 *
 * @param {string} name - The full name string.
 * @returns {{ lastName: string, firstName: string }} Object with lastName and firstName.
 */

// Common Filipino/Spanish surname particles that belong to the LAST name,
// not the first name (e.g. "Dela Cruz", "De Guzman", "San Pedro").
const SURNAME_PARTICLES = new Set([
  "dela", "de", "del", "delos", "delas", "de-los", "de-las",
  "san", "sta", "santa", "santo",
  "mc", "mac", "van", "von", "la", "los", "las",
]);

// Strips single-letter middle initials like "C." or "M" from a word list.
const stripMiddleInitials = (words) =>
  words.filter((w) => !/^[a-z]\.?$/i.test(w));

export const parseFacultyName = (name) => {
  if (!name) return { lastName: '', firstName: '' };

  // Remove titles and suffixes (common patterns)
  let cleaned = name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Atty\.|Engr\.)\s*/i, '')
    .replace(/\s+(Jr\.|Sr\.|III|IV|PhD|MD|DDS)$/i, '')
    .trim();

  // Check if there's a comma (LastName, FirstName)
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(s => s.trim());
    const lastName = parts[0] || '';
    const firstNamePart = parts[1] || '';
    const firstName = firstNamePart.split(' ')[0] || '';
    return {
      lastName: lastName,
      firstName: firstName
    };
  } else {
    // Format: FirstName [Middle] LastName (possibly multi-word, e.g. "Dela Cruz")
    const rawWords = cleaned.split(/\s+/);
    const words = stripMiddleInitials(rawWords);

    if (words.length === 0) return { lastName: '', firstName: '' };
    if (words.length === 1) {
      return { lastName: words[0], firstName: words[0] };
    }
    if (words.length === 2) {
      return { lastName: words[1], firstName: words[0] };
    }

    // Walk backwards from the last word, absorbing known surname particles
    // e.g. ["Juan", "Dela", "Cruz"] -> splitIndex ends at 1 -> lastName "Dela Cruz"
    let splitIndex = words.length - 1;
    while (
      splitIndex > 1 &&
      SURNAME_PARTICLES.has(words[splitIndex - 1].toLowerCase())
    ) {
      splitIndex -= 1;
    }

    const lastName = words.slice(splitIndex).join(' ');
    const firstName = words.slice(0, splitIndex).join(' ') || lastName;

    return { lastName, firstName };
  }
};

/**
 * Formats a faculty name to "LastName, FirstName" with proper capitalization.
 */
export const formatFacultyName = (name) => {
  if (!name) return "TBA";

  if (name.includes(',')) {
    const parts = name.split(',').map(s => s.trim());
    const lastName = parts[0] || '';
    const firstName = parts[1] || '';
    const capitalizedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    return `${capitalizedLastName}, ${capitalizedFirstName}`;
  }

  const parsed = parseFacultyName(name);
  if (parsed.lastName && parsed.firstName) {
    const capitalizedLastName = parsed.lastName.charAt(0).toUpperCase() + parsed.lastName.slice(1).toLowerCase();
    const capitalizedFirstName = parsed.firstName.charAt(0).toUpperCase() + parsed.firstName.slice(1).toLowerCase();
    return `${capitalizedLastName}, ${capitalizedFirstName}`;
  }

  return name;
};

/**
 * Normalizes a name for comparison (case-insensitive, trimmed).
 */
export const normalizeName = (name = "") => {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
};