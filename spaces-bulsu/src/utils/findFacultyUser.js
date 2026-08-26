import { parseFacultyName, normalizeName } from "./parseFacultyName";

const normalizeRole = (role = "") => role.toString().trim().toLowerCase();

/**
 * Finds a faculty user by comparing lastName and firstName.
 */
export const findFacultyUser = (usersSnap, lastName, firstName) => {
  if (!usersSnap) {
    console.warn("findFacultyUser: missing usersSnap");
    return null;
  }

  if (!lastName || !firstName) {
    console.warn("findFacultyUser: missing lastName or firstName");
    return null;
  }

  const targetLastName = normalizeName(lastName);
  const targetFirstName = normalizeName(firstName);
  const targetFirstToken = targetFirstName.split(" ")[0];

  let looseMatch = null;
  const scannedFaculty = []; // for debugging only

  for (const doc of usersSnap.docs) {
    const user = doc.data();

    // Case/whitespace-insensitive role check
    if (normalizeRole(user.role) !== "faculty") continue;

    const userLastName = normalizeName(user.lastName || "");
    const userFirstName = normalizeName(user.firstName || "");

    if (!userLastName || !userFirstName) continue;

    scannedFaculty.push(`${userLastName} ${userFirstName}`);

    if (userLastName === targetLastName && userFirstName === targetFirstName) {
      return doc;
    }

    if (
      !looseMatch &&
      userLastName === targetLastName &&
      (userFirstName.split(" ")[0] === targetFirstToken ||
        targetFirstName.startsWith(userFirstName) ||
        userFirstName.startsWith(targetFirstName))
    ) {
      looseMatch = doc;
    }
  }

  if (looseMatch) return looseMatch;

  if (lastName !== "tba" && firstName !== "tba") {
    console.warn(
      `❌ Faculty not found for: ${lastName} ${firstName}. Scanned ${scannedFaculty.length} faculty user(s):`,
      scannedFaculty
    );
  }
  return null;
};

/**
 * Finds a faculty user by full name (parses internally).
 */
export const findFacultyUserByName = (usersSnap, fullName) => {
  if (!fullName) return null;
  if (fullName === "TBA" || fullName === "tba" || !fullName.trim()) return null;

  const parsed = parseFacultyName(fullName);
  return findFacultyUser(usersSnap, parsed.lastName, parsed.firstName);
};