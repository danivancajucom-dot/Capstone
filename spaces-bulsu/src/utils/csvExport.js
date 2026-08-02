// src/utils/csvExport.js

export const downloadReservationsCSV = (reservations, filename = "reservations_report.csv") => {
  if (!reservations || reservations.length === 0) {
    alert("No reservations to export.");
    return;
  }

  const headers = [
    "Reservation ID",
    "Requester Name",
    "Requester ID",
    "Room Name",
    "Room ID",
    "Date",
    "Start Time",
    "End Time",
    "Duration (mins)",
    "Purpose",
    "Status",
    "Reservation Type",
    "Course Title",
    "Course",
    "Year/Section/Group",
    "Organization",
    "Attendees Range",
    "Created At",
    "Updated At",
    "Reviewed At",
    "Denial Reason",
    "Created By",
    "Approved By",
  ];

  const rows = reservations.map((r) => {
    const created = r.createdAt?.toDate?.() || r.createdAt;
    const updated = r.updatedAt?.toDate?.() || r.updatedAt;
    const reviewed = r.reviewedAt?.toDate?.() || r.reviewedAt;
    return [
      r.id || "",
      r.facultyName || r.requesterName || "",
      r.requesterId || "",
      r.roomName || "",
      r.roomId || "",
      r.date || "",
      r.startTime || "",
      r.endTime || "",
      r.duration || "",
      r.purpose || r.customPurpose || "",
      r.status || "",
      r.reservationType || "online",
      r.courseTitle || "",
      r.course || (r.attendees?.course || ""),
      r.yearSectionGroup || (r.attendees?.yearSectionGroup || ""),
      r.organizationName || (r.attendees?.organization || ""),
      r.studentRange || r.estimatedAttendees || "",
      created ? new Date(created).toLocaleString() : "",
      updated ? new Date(updated).toLocaleString() : "",
      reviewed ? new Date(reviewed).toLocaleString() : "",
      r.denialReason || "",
      r.createdBy || "",
      r.approvedBy || "",
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};