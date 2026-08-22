import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { logActivity } from "../../utils/logActivity";
import { useNavigate } from "react-router-dom";
import RoomManagementModals from "./Modals/RoomManagementModals";
import { useDeactivationModals } from "./hooks/useDeactivationModals";
import "./room-management-view.css";
import Toast from "../../Popup/Toast/Toast";
import DeleteRoomPopup from "../../Popup/DeleteRoomPopup/DeleteRoomPopup";
// NEW: PDF libraries and logos
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import universityLogo from "../../assets/BSU-Logo.png";
import collegeLogo from "../../assets/CICT-Logo.png";

// NEW: School header constant (same as other components)
const SCHOOL_HEADER = {
  universityLogoUrl: universityLogo,
  collegeLogoUrl: collegeLogo,
  universityName: "Bulacan State University",
  collegeName: "College of Information and Communications Technology",
  systemName: "SpaceS CICT",
};

function getActiveRoomStyle(room) {
  const iconVariant = room.type === "lecture" ? "peach" : "orange";
  return { ...room, status: "active", inactive: false, iconVariant };
}

function getInactiveRoomStyle(room) {
  return { ...room, status: "inactive", inactive: true, iconVariant: "muted" };
}
const getStatusInfo = (status) => {
  switch (status) {
    case "active":
      return { label: "ACTIVE", className: "room-status--active" };
    case "inactive":
      return { label: "INACTIVE", className: "room-status--inactive" };
    case "maintenance":
      return { label: "MAINTENANCE", className: "room-status--maintenance" };
    default:
      return { label: "UNKNOWN", className: "room-status--unknown" };
  }
};
function ToggleSwitch({ checked, onClick }) {
  return (
    <button
      type="button"
      className={`room-toggle ${checked ? "is-on" : "is-off"}`}
      onClick={onClick}
      aria-pressed={checked}
      aria-label={checked ? "Deactivate room" : "Activate room"}
    >
      <span className="room-toggle-thumb" />
    </button>
  );
}

function RoomManagementView({
  onOpenDetails,
  onAddRoom,
  onEditRoom,
  onViewAffectedSchedules,
}) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const modals = useDeactivationModals();
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const itemsPerPage = 10;
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const getToday = () => DAYS[new Date().getDay()];

  const toMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const isRoomOccupiedNow = (schedules = []) => {
    const today = getToday();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return schedules.some((schedule) => {
      if (schedule.day !== today) return false;
      const start = toMinutes(schedule.startTime);
      const end = toMinutes(schedule.endTime);
      return currentMinutes >= start && currentMinutes < end;
    });
  };

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    if (type !== "loading") {
      setTimeout(() => {
        setToast({ show: false, type: "", message: "" });
      }, 2500);
    }
  };

  // ─── NEW: PDF Export ─────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (rooms.length === 0) {
      showToast("error", "No rooms to export.");
      return;
    }

    showToast("loading", "Generating PDF...");

    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 40;
      const logoSize = 50;
      const centerX = pageWidth / 2;

      // ---- Letterhead ----
      if (SCHOOL_HEADER.universityLogoUrl) {
        pdf.addImage(SCHOOL_HEADER.universityLogoUrl, "PNG", marginX, 22, logoSize, logoSize);
      }
      if (SCHOOL_HEADER.collegeLogoUrl) {
        pdf.addImage(
          SCHOOL_HEADER.collegeLogoUrl,
          "PNG",
          pageWidth - marginX - logoSize,
          22,
          logoSize,
          logoSize
        );
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(20, 27, 45);
      pdf.text(SCHOOL_HEADER.universityName, centerX, 36, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(SCHOOL_HEADER.collegeName, centerX, 50, { align: "center" });
      pdf.text(SCHOOL_HEADER.systemName, centerX, 62, { align: "center" });

      pdf.setDrawColor(245, 124, 0);
      pdf.setLineWidth(1.5);
      pdf.line(marginX, 82, pageWidth - marginX, 82);

      // ---- Title & filters ----
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(245, 124, 0);
      pdf.text("Room Management Report", marginX, 104);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - marginX, 120, {
        align: "right",
      });

      // ---- Table ----
      const rows = rooms.map((room) => [
        room.id,
        room.capacity,
        room.typeLabel,
        room.equipment.join(", "),
        room.roomStatus.toUpperCase(),
      ]);

      autoTable(pdf, {
        startY: 134,
        head: [["Room Name", "Capacity", "Type", "Equipment", "Status"]],
        body: rows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, cellPadding: 6, valign: "middle" },
        headStyles: {
          fillColor: [245, 124, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { textColor: [26, 26, 26] },
        alternateRowStyles: { fillColor: [253, 246, 240] },
        margin: { left: marginX, right: marginX },
      });

      // ---- Footer ----
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - marginX,
          pdf.internal.pageSize.getHeight() - 20,
          { align: "right" }
        );
        pdf.text(
          `${SCHOOL_HEADER.systemName} — Confidential`,
          marginX,
          pdf.internal.pageSize.getHeight() - 20
        );
      }

      pdf.save(`rooms_export_${Date.now()}.pdf`);
      showToast("success", "PDF exported successfully!");
    } catch (error) {
      console.error("PDF export failed:", error);
      showToast("error", "Export failed. Try again.");
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);

    const roomListeners = [];

    const checkExpiredMaintenance = async () => {
      const roomSnapshot = await getDocs(collection(db, "rooms"));
      const now = new Date();
      for (const roomDoc of roomSnapshot.docs) {
        const room = roomDoc.data();
        if (room.roomStatus !== "maintenance") continue;
        if (!room.maintenanceEndDate || !room.maintenanceEndTime) continue;
        const endDateTime = new Date(
          `${room.maintenanceEndDate}T${room.maintenanceEndTime}`
        );
        if (now >= endDateTime) {
          await updateDoc(doc(db, "rooms", roomDoc.id), {
            roomStatus: "active",
            maintenanceStartDate: null,
            maintenanceStartTime: null,
            maintenanceEndDate: null,
            maintenanceEndTime: null,
          });
        }
      }
    };

    checkExpiredMaintenance();

    const unsubscribeRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        roomListeners.forEach((u) => u());
        roomListeners.length = 0;

        if (snapshot.empty) {
          setRooms([]);
          setLoading(false);
          return;
        }

        const roomCache = [];

        snapshot.docs.forEach((roomDoc) => {
          const roomData = roomDoc.data();

          const unsub = onSnapshot(
            collection(db, "rooms", roomDoc.id, "schedules"),
            (scheduleSnapshot) => {
              const schedules = scheduleSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));

              const index = roomCache.findIndex(
                (r) => r.firestoreId === roomDoc.id
              );

              const occupied = isRoomOccupiedNow(schedules);

              const room = {
                firestoreId: roomDoc.id,
                id: roomData.roomName,
                floor: roomData.floor,
                capacity: roomData.capacity,
                type: roomData.roomType === "Computer Lab" ? "lab" : "lecture",
                typeLabel: roomData.roomType,
                equipment: [
                  roomData.equipment?.projector && "PROJECTOR",
                  roomData.equipment?.ac && "AC",
                  roomData.equipment?.computer && "COMPUTER",
                  roomData.equipment?.smartBoard && "SMART BOARD",
                  roomData.equipment?.tvDisplay && "TV DISPLAY",
                ].filter(Boolean),
                schedules,
                occupied,
                roomStatus: (roomData.roomStatus || "active").toLowerCase(),
                status: occupied ? "OCCUPIED" : "AVAILABLE",
              };

              if (index >= 0) roomCache[index] = room;
              else roomCache.push(room);

              setRooms([...roomCache]);
              setLoading(false);
            }
          );

          roomListeners.push(unsub);
        });
      }
    );

    return () => {
      unsubscribeRooms();
      roomListeners.forEach((u) => u());
    };
  }, []);

  const handleSwitchClick = (room) => {
    if (room.roomStatus === "active") {
      modals.openDeactivateFlow(room.id);
    } else {
      modals.openActivateFlow(room.id);
    }
  };

  const handleDeactivationConfirm = async ({
    startDate,
    startTime,
    endDate,
    endTime,
  }) => {
    const room = rooms.find((r) => r.id === modals.roomName);
    if (!room) return;

    try {
      showToast("loading", "Putting room under maintenance...");

      const firebaseUser = auth.currentUser;
      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      const currentUser = userSnap.data();

      const fullName =
        `${currentUser.firstName} ${currentUser.lastName}`.trim();

      await logActivity({
        userId: firebaseUser.uid,
        user: fullName,
        role: currentUser.role,
        action: "Marked Room Under Maintenance",
        actionType: "warning",
        target: room.roomName,
        details: "Changed room status to Under Maintenance",
        status: "SUCCESS",
      });

      await updateDoc(doc(db, "rooms", room.firestoreId), {
        roomStatus: "maintenance",
        maintenanceStartDate: startDate,
        maintenanceStartTime: startTime,
        maintenanceEndDate: endDate,
        maintenanceEndTime: endTime,
      });

      //---------------------------------------
      // Notify affected faculty
      //---------------------------------------

      const usersSnap = await getDocs(collection(db, "users"));

      const normalizeName = (name) =>
        name
          ?.toLowerCase()
          .replace(/\./g, "")
          .replace(/,/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const flipName = (name) => {
        if (!name) return "";
        const parts = name.split(",");
        if (parts.length !== 2) return normalizeName(name);
        return normalizeName(`${parts[1]} ${parts[0]}`);
      };

      for (const schedule of room.schedules) {
        if (!schedule.faculty) continue;
        const faculty = usersSnap.docs.find((docUser) => {
          const user = docUser.data();
          const fullname = normalizeName(`${user.firstName} ${user.lastName}`);
          return fullname === flipName(schedule.faculty);
        });
        if (!faculty) continue;

        await addDoc(collection(db, "notifications"), {
          userId: faculty.id,
          ownerType: "faculty",
          title: "Room Under Maintenance",
          message: `Room ${room.id} has been placed under maintenance from ${startDate} ${startTime} until ${endDate} ${endTime}. Your scheduled class may be affected.`,
          type: "room-maintenance",
          unread: true,
          archived: false,
          badge: "NEW",
          createdAt: serverTimestamp(),
        });
      }

      showToast("success", "Room is now under maintenance.");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to put room under maintenance.");
    }

    modals.closeAll();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const room = rooms.find((r) => r.id === deleteTarget);
    if (!room) {
      showToast("error", "Room not found.");
      setDeleteTarget(null);
      return;
    }

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        showToast("error", "You must be logged in to delete a room.");
        return;
      }

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      const currentUser = userSnap.exists() ? userSnap.data() : {};

      const fullName =
        `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
        firebaseUser.displayName ||
        "Unknown";

      await deleteDoc(doc(db, "rooms", room.firestoreId));

      await logActivity({
        userId: firebaseUser.uid,
        user: fullName,
        role: currentUser.role || "Department Head",
        action: "Deleted Room",
        actionType: "failed",
        target: deleteTarget,
        status: "SUCCESS",
      });

      showToast("success", `Room "${deleteTarget}" deleted successfully.`);
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("error", `Delete failed: ${error.message}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleActivateConfirm = async () => {
    const room = rooms.find((r) => r.id === modals.roomName);
    if (!room) return;
    await updateDoc(doc(db, "rooms", room.firestoreId), {
      roomStatus: "active",
      maintenanceStartDate: null,
      maintenanceStartTime: null,
      maintenanceEndDate: null,
      maintenanceEndTime: null,
    });
    modals.closeAll();
  };

  const handleViewAffectedSchedules = () => {
    modals.closeAll();
    navigate(`/department-head/affected-schedules`);
  };

  const activeRooms = rooms.filter(
    (room) => room.roomStatus === "active"
  ).length;

  const inactiveRooms = rooms.filter(
    (room) => room.roomStatus === "inactive"
  ).length;

  const maintenanceRooms = rooms.filter(
    (room) => room.roomStatus === "maintenance"
  ).length;
  const availableRooms = rooms.filter(
    (room) => room.roomStatus === "active" && room.status === "AVAILABLE"
  ).length;

  if (loading) {
    return <div className="rooms-loading">Loading rooms...</div>;
  }

  const totalRooms = rooms.length;
  const totalPages = Math.ceil(totalRooms / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRooms = rooms.slice(startIndex, endIndex);

  const renderPages = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, startPage + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <>
      <RoomManagementModals
        roomName={modals.roomName}
        showWarningModal={modals.showWarningModal}
        showDeactivationModal={modals.showDeactivationModal}
        showActivationModal={modals.showActivationModal}
        showDeleteModal={modals.showDeleteModal}
        closeWarningModal={modals.closeWarningModal}
        closeDeactivationModal={modals.closeDeactivationModal}
        closeActivationModal={modals.closeActivationModal}
        closeDeleteModal={modals.closeDeleteModal}
        handleConfirmDeactivation={modals.handleConfirmDeactivation}
        onConfirmDeactivation={handleDeactivationConfirm}
        onActivateConfirm={handleActivateConfirm}
        onDeleteConfirm={handleDeleteConfirm}
        onViewAffectedSchedules={handleViewAffectedSchedules}
      />

      {deleteTarget && (
        <DeleteRoomPopup
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <main className="dashboard-main rooms-page">
        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <h1>Room Management</h1>
            <p className="page-subtitle">
              an overview of university facilities, technical status, and
              occupancy.
            </p>
          </div>

          <div className="dashboard-actions">
            <button
              type="button"
              className="action-pill outline export-btn"
              onClick={handleExportPDF}
            >
              <i className="fa-solid fa-download" aria-hidden="true" />
              Export PDF
            </button>
            <button
              type="button"
              className="action-pill primary"
              onClick={() => navigate("/department-head/add-room")}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Add Room
            </button>
          </div>
        </div>

        <div className="dashboard-status-grid">
          <article className="summary-card">
            <span className="summary-label">ACTIVE ROOMS</span>
            <strong className="summary-value summary-value--orange">
              {activeRooms}
            </strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">AVAILABLE NOW</span>
            <strong className="summary-value summary-value--green">
              {availableRooms}
            </strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">UNDER MAINTENANCE</span>
            <strong className="summary-value summary-value--grey">
              {maintenanceRooms}
            </strong>
          </article>
        </div>

        <div className="dashboard-table-card">
          <div className="table-scroll">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>ROOM NAME</th>
                  <th>CAPACITY</th>
                  <th>TYPE</th>
                  <th>EQUIPMENT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((room) => (
                  <tr
                    key={room.firestoreId}
                    className={`rooms-row ${
                      room.roomStatus !== "active"
                        ? "is-inactive"
                        : "clickable-row"
                    }`}
                    onClick={() => {
                      if (
                        room.roomStatus === "active" &&
                        typeof onOpenDetails === "function"
                      ) {
                        onOpenDetails(room.id);
                      }
                    }}
                  >
                    <td>
                      <div className="room-name-cell">
                        <span
                          className={`room-icon room-icon--${
                            room.roomStatus !== "active"
                              ? "muted"
                              : room.type === "lab"
                                ? "orange"
                                : "peach"
                          }`}
                        >
                          {room.id}
                        </span>
                        <span>
                          <div className="rm-room-name">{room.id}</div>
                          <span className="room-floor">{room.floor}</span>
                        </span>
                      </div>
                    </td>
                    <td>{room.capacity} Seats</td>
                    <td>
                      <span
                        className={`type-pill type-pill--${room.type} ${room.roomStatus !== "active" ? "type-pill--inactive" : ""}`}
                      >
                        {room.typeLabel}
                      </span>
                    </td>
                    <td>
                      <div className="equipment-tags">
                        {room.equipment.map((item) => (
                          <span
                            key={item}
                            className={`equipment-pill ${room.roomStatus !== "active" ? "equipment-pill--inactive" : ""}`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const normalized = (
                          room.roomStatus || "active"
                        ).toLowerCase();
                        let label, className;
                        switch (normalized) {
                          case "active":
                            label = "ACTIVE";
                            className = "room-status--active";
                            break;
                          case "inactive":
                            label = "INACTIVE";
                            className = "room-status--inactive";
                            break;
                          case "maintenance":
                            label = "MAINTENANCE";
                            className = "room-status--maintenance";
                            break;
                          default:
                            label = "UNKNOWN";
                            className = "room-status--unknown";
                        }
                        return (
                          <span className={`room-status ${className}`}>
                            <span className="room-status-dot" />
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/department-head/edit-room/${room.firestoreId}`
                            );
                          }}
                          aria-label={`Edit ${room.id}`}
                        >
                          <i className="fa-solid fa-pen" aria-hidden="true" />
                        </button>
                        <ToggleSwitch
                          checked={room.roomStatus === "active"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchClick(room);
                          }}
                        />
                        <button
                          type="button"
                          className="action-icon-btn danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(room.id);
                          }}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-row">
            <span>
              Showing {totalRooms === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, totalRooms)} of {totalRooms} rooms
            </span>

            <div className="pagination-buttons">
              <button
                type="button"
                className="pagination-nav"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left" />
              </button>

              {renderPages().map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination-page ${currentPage === page ? "is-active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="pagination-nav"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ show: false, type: "", message: "" })}
      />
    </>
  );
}

export default RoomManagementView;