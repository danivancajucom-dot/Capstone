// scheduleNormalizer.js
//
// I-convert ang raw Firestore docs papunta sa iisang consistent na shape
// na kayang basahin ng <ClassDetailsCard />.
//
// May 3 posibleng source ang isang schedule block:
//   "schedule"    -> galing sa rooms/{id}/schedules  (regular recurring class)
//   "event"       -> galing sa "events" collection    (one-time room activity)
//   "reservation" -> galing sa "reservationRequests"  (walk-in o faculty reservation)
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
  // Ito yung ginagawa ng Department Head sa RoomActivity.jsx (override ng
  // existing class schedule). Walang "faculty"/"purpose" field dito, kundi
  // "title", "reason", at "status: active" lang.
  if (source === "event") {

    // department-head-created override kapag may "reason" field
    // (ito lang ang unique sa RoomActivity.jsx flow)
    const isDeptHeadEvent = item.reason !== undefined;

    return {
      sourceType: isDeptHeadEvent
        ? "Department Head Override"
        : "Room Activity",
      isReservation: true, // gamit din ang "reservation-style" layout (walang semester/sy)
      isDeptHeadEvent,
      status: item.status || (isDeptHeadEvent ? "active" : null),

      faculty:
        item.faculty ||
        item.organizer ||
        item.requesterName ||
        (isDeptHeadEvent ? "DEPARTMENT HEAD" : "ROOM ACTIVITY"),

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