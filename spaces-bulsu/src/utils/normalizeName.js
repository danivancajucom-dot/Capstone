// src/utils/normalizeName.js
export const normalizeName = (name = "") => {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
};