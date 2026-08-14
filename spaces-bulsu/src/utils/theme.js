// theme.js
// Central place for the app's selectable color themes.
//
// applyTheme(id, uid) sets CSS custom properties on <html> so every
// stylesheet that references var(--fs-accent, ...) updates immediately.
//
// Storage is scoped PER ACCOUNT (uid) — not a single shared key — so if
// two different faculty log into the same browser/device, one person's
// theme choice never carries over to someone who hasn't picked one yet.
// Anyone without a saved choice simply sees the default (orange).
//
// To wire a new theme into more of the app, swap hardcoded oranges like
// #f57c00 / #FEF0E7 / #f6c396 in your CSS for:
//   var(--fs-accent, #f57c00)
//   var(--fs-accent-soft, #FEF0E7)
//   var(--fs-accent-border, #f6c396)
//   var(--fs-accent-hover, #d96a00)

export const THEMES = [
  {
    id: "orange",
    name: "Sunset Orange",
    description: "The default SpaceS look — warm orange on white.",
    accent: "#f57c00",
    accentHover: "#d96a00",
    accentSoft: "#FEF0E7",
    accentBorder: "#f6c396",
  },
  {
    id: "blue",
    name: "Ocean Blue",
    description: "Cool, professional blue on white.",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    accentSoft: "#e8f0fe",
    accentBorder: "#b6cffb",
  },
  {
    id: "gray",
    name: "Slate Gray",
    description: "Neutral, minimal gray on white.",
    accent: "#475569",
    accentHover: "#334155",
    accentSoft: "#eef1f4",
    accentBorder: "#cbd5e1",
  },
  {
    id: "navy",
    name: "Blue Slate",
    description: "Muted blue-gray combo for a calmer feel.",
    accent: "#3b5c7a",
    accentHover: "#2c4560",
    accentSoft: "#eaf1f6",
    accentBorder: "#bcd2e0",
  },
];

const STORAGE_PREFIX = "spaces-theme:"; // + uid
export const DEFAULT_THEME_ID = "orange";

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

// Reads the theme cached for THIS account only. No uid → no lookup, just
// the default — so a signed-out / not-yet-loaded state never shows
// whatever theme the last person on this device happened to pick.
export function getStoredThemeId(uid) {
  if (!uid) return DEFAULT_THEME_ID;
  try {
    return localStorage.getItem(STORAGE_PREFIX + uid) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

// Applies the theme's CSS variables. Pass the current user's uid so the
// choice is cached per-account for a flash-free reload; omit it to apply
// without persisting (e.g. resetting to default before a user is known).
export function applyTheme(themeId, uid) {
  const theme = getThemeById(themeId);
  const root = document.documentElement;

  root.style.setProperty("--fs-accent", theme.accent);
  root.style.setProperty("--fs-accent-hover", theme.accentHover);
  root.style.setProperty("--fs-accent-soft", theme.accentSoft);
  root.style.setProperty("--fs-accent-border", theme.accentBorder);

  if (uid) {
    try {
      localStorage.setItem(STORAGE_PREFIX + uid, theme.id);
    } catch {
      // ignore — private browsing / storage disabled
    }
  }

  return theme;
}