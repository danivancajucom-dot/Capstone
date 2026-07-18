// roomMaintenance.js
//
// Sinusuri kung "naka-maintenance" ang isang room sa loob ng
// hinihiling na petsa/oras ng reservation — hindi lang basta ang
// kasalukuyang roomStatus flag, kundi ikinukumpara rin sa aktwal na
// maintenance window (maintenanceStartDate/Time - maintenanceEndDate/
// Time na naka-set sa Room Management).
//
// Kung wala namang tiyak na window (halimbawa hindi pa na-set ang mga
// petsa), ituturing na naka-maintenance ito sa buong oras hangga't
// hindi pa na-reactivate manually.

export const isRoomUnderMaintenance = (
  room,
  date,
  startTime = "00:00",
  endTime = "23:59"
) => {

  if (String(room?.roomStatus || "").toLowerCase() !== "maintenance") {
    return false;
  }

  if (!room.maintenanceStartDate || !room.maintenanceEndDate) {
    return true;
  }

  if (!date) return true;

  const reqStart = new Date(`${date}T${startTime || "00:00"}`);
  const reqEnd = new Date(`${date}T${endTime || "23:59"}`);

  const maintStart = new Date(
    `${room.maintenanceStartDate}T${room.maintenanceStartTime || "00:00"}`
  );

  const maintEnd = new Date(
    `${room.maintenanceEndDate}T${room.maintenanceEndTime || "23:59"}`
  );

  return reqStart < maintEnd && reqEnd > maintStart;

};