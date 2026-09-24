// scheduleNormalizer.js
//
// I-convert ang raw Firestore docs papunta sa iisang consistent na shape
// na kayang basahin ng <ClassDetailsCard />.
//
// May 4 na posibleng source ang isang schedule block:
//   "schedule"     -> galing sa rooms/{id}/schedules  (regular recurring class)
//   "event"        -> galing sa "events" collection    (one-time room activity)
//   "reservation"  -> galing sa "reservationRequests"  (walk-in o faculty reservation)
//   "reassignment" -> galing sa "roomReassignments"    (moved class)
//
// Gamitin: normalizeScheduleItem(item, "reservation")

export function normalizeScheduleItem(item, source = "schedule") {

  // ---------------- RESERVATION (walk-in / faculty) ----------------
  if (source === "reservation") {

    const isWalkIn = item.reservationType === "walk-in";

    return {
      sourceType: isWalkIn ? "Walk-in Reservation" : "Faculty Reservation",
      isReservation: true,
      status: item.status || "Pending",

      faculty:
        item.requesterName ||
        item.facultyName ||
        "-",

      subject:
        item.customPurpose ||
        item.courseTitle ||
        item.purpose ||
        "-",

      section:
        item.yearSectionGroup ||
        item.attendees?.yearSectionGroup ||
        item.organizationName ||
        item.attendees?.organization ||
        item.attendees?.otherAudience ||
        item.estimatedAttendees ||
        item.studentRange ||
        "-",

      startTime: item.startTime || "-",
      endTime: item.endTime || "-",

      day: item.day || null,
      date: item.date || null,

      semester: item.semester || "-",
      schoolYear: item.schoolYear || "-",
    };
  }

  // ---------------- ONE-TIME ROOM ACTIVITY ("events" collection) ----------------
  if (source === "event") {

    const isAdminEvent = item.reason !== undefined;

    return {
      sourceType: isAdminEvent
        ? "Admin Override"
        : "Room Activity",
      isReservation: true,
      isAdminEvent,
      status: item.status || (isAdminEvent ? "active" : null),

      faculty:
        item.faculty ||
        item.organizer ||
        item.requesterName ||
        (isAdminEvent ? "ADMIN" : "ROOM ACTIVITY"),

      subject:
        item.title ||
        item.subject ||
        item.purpose ||
        "-",

      section:
        item.section ||
        item.audience ||
        "-",

      reason: item.reason || null,

      startTime: item.startTime || "-",
      endTime: item.endTime || "-",

      day: item.day || null,
      date: item.date || null,

      semester: item.semester || "-",
      schoolYear: item.schoolYear || "-",
    };
  }

  // ---------------- REASSIGNMENT (roomReassignments collection) ----------------
  // Ito yung block na "Moved" sa schedule view. Ang doc ay may
  // facultyName / courseTitle / oldRoomName / newRoomName / status
  // imbes na faculty / subject / roomName.
  if (source === "reassignment") {

    const isEvent = item.reassignType === "event";

    return {
      sourceType: "Reassignment",
      isReassignment: true,
      isReservation: false,
      isAdminEvent: false,
      status: item.status || null,

      faculty:
        item.facultyName ||
        item.faculty ||
        "-",

      subject:
        item.courseTitle ||
        item.subject ||
        item.eventTitle ||
        (isEvent ? "Untitled Activity" : "Moved Class"),

      section: item.section || "-",

      // Reassignment-specific fields
      oldRoomName: item.oldRoomName || "-",
      newRoomName: item.newRoomName || "-",
      adminNote: item.adminNote || "",
      denialReason: item.denialReason || "",

      startTime: item.startTime || "-",
      endTime: item.endTime || "-",

      day: item.day || null,
      date: item.date || null,

      semester: item.semester || "-",
      schoolYear: item.schoolYear || "-",
    };
  }

  // ---------------- REGULAR RECURRING CLASS SCHEDULE ----------------
  return {
    sourceType: "Class Schedule",
    isReservation: false,
    status: null,

    faculty: item.faculty || "-",
    subject: item.subject || "-",
    section: item.section || "-",

    startTime: item.startTime || "-",
    endTime: item.endTime || "-",

    day: item.day || null,
    date: item.date || null,

    semester: item.semester || "-",
    schoolYear: item.schoolYear || "-",
  };
}