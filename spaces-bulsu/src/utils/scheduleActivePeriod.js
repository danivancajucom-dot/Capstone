// ─── Date helpers ──────────────────────────────────────────────────
export const toDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayStr = () => toDateStr(new Date());

export const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

export const yesterdayStr = () => addDays(todayStr(), -1);

// ─── Core check ────────────────────────────────────────────────────
// Schedule applies to a date if:
//   - it has an activeFrom (i.e. was activated at least once)
//   - activeFrom <= date
//   - activeUntil is null OR date <= activeUntil
export const isActiveOnDate = (schedule, dateStr) => {
  if (!schedule) return false;
  if (!schedule.activeFrom) return false;
  if (schedule.activeFrom > dateStr) return false;
  if (schedule.activeUntil && dateStr > schedule.activeUntil) return false;
  return true;
};

// Convenience for group (SY/sem) level checks
export const isGroupActive = (schedules = []) =>
  schedules.some((s) => s.isActive === true);