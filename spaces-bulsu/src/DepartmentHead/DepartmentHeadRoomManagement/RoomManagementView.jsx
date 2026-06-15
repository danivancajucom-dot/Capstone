import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc, 
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import RoomManagementModals from "./Modals/RoomManagementModals";
import { useDeactivationModals } from "./hooks/useDeactivationModals";
import "./room-management-view.css";
import Toast from "../../Popup/Toast/Toast";

function getActiveRoomStyle(room) {
  const iconVariant = room.type === 'lecture' ? 'peach' : 'orange';
  return { ...room, status: 'active', inactive: false, iconVariant };
}

function getInactiveRoomStyle(room) {
  return { ...room, status: 'inactive', inactive: true, iconVariant: 'muted' };
}

function ToggleSwitch({ checked, onClick }) {
  return (
    <button
      type="button"
      className={`room-toggle ${checked ? 'is-on' : 'is-off'}`}
      onClick={onClick}
      aria-pressed={checked}
      aria-label={checked ? 'Deactivate room' : 'Activate room'}
    >
      <span className="room-toggle-thumb" />
    </button>
  );
}

function RoomManagementView({ onOpenDetails, onAddRoom, onEditRoom, onViewAffectedSchedules }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const modals = useDeactivationModals();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [toast, setToast] = useState({
    show: false,
    type: "", // "loading" | "success" | "error"
    message: ""
  });

  const showToast = (type, message) => {
  setToast({ show: true, type, message });

  if (type !== "loading") {
    setTimeout(() => {
      setToast({ show: false, type: "", message: "" });
    }, 2500);
  }
};

const handleExport = async () => {
  try {
    showToast("loading", "Exporting rooms...");

    if (!rooms.length) {
      showToast("error", "No rooms to export");
      return;
    }

    await new Promise((res) => setTimeout(res, 800));
    const headers = [
      "Room Name",
      "Capacity",
      "Type",
      "Status",
      "Equipment"
    ];

    const rows = rooms.map((r) => [
      r.id,
      r.capacity,
      r.typeLabel,
      r.status,
      r.equipment.join(", ")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((v) => `"${v}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", `rooms_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("success", "Export successful!");
  } catch (error) {
    console.error(error);
    showToast("error", "Export failed. Try again.");
  }
};

  const navigate = useNavigate();
    useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const roomData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          const equipment = [];

          if (data.equipment?.projector)
            equipment.push("PROJECTOR");

          if (data.equipment?.ac)
            equipment.push("AC");

          if (data.equipment?.computer)
            equipment.push("COMPUTER");

          if (data.equipment?.smartBoard)
            equipment.push("SMART BOARD");

          if (data.equipment?.tvDisplay)
            equipment.push("TV DISPLAY");

          return {
            firestoreId: docSnap.id,
            id: data.roomName,
            floor: data.floor || "-",
            capacity: data.capacity || 0,

            type:
              data.roomType === "Computer Lab"
                ? "lab"
                : "lecture",

            typeLabel: data.roomType,

            equipment,

            status:
              data.status === "inactive"
                ? "inactive"
                : "active",

            inactive:
              data.status === "inactive",

            iconVariant:
              data.status === "inactive"
                ? "muted"
                : data.roomType === "Computer Lab"
                ? "orange"
                : "peach",
          };
        });

        setRooms(roomData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSwitchClick = (room) => {
    if (room.status === 'active') {
      modals.openDeactivateFlow(room.id);
    } else {
      modals.openActivateFlow(room.id);
    }
  };

  const handleDeactivationConfirm = async () => {
    const room = rooms.find(
      (r) => r.id === modals.roomName
    );

    if (!room) return;

    await updateDoc(
      doc(db, "rooms", room.firestoreId),
      {
        status: "inactive",
      }
    );

    modals.closeAll();
  };

    const handleDeleteConfirm = async () => {
      const room = rooms.find(
        (r) => r.id === modals.roomName
      );

      if (!room) return;

      await deleteDoc(doc(db, "rooms", room.firestoreId));
      await logActivity({
        user: currentUser.displayName,
        role: currentUser.role,
        action: "Deleted Room",
        actionType: "failed",
        target: roomName,
        status: "SUCCESS",
        userId: currentUser.uid
      });
      modals.closeDeleteModal();
    };

    const handleActivateConfirm = async () => {
      const room = rooms.find(
        (r) => r.id === modals.roomName
      );

      if (!room) return;

      await updateDoc(
        doc(db, "rooms", room.firestoreId),
        {
          status: "active",
        }
      );

    modals.closeAll();
  };

  const handleViewAffectedSchedules = () => {
    const roomId = modals.roomName;
    modals.closeAll();
    onViewAffectedSchedules?.(roomId);
  };

  const activeRooms =
    rooms.filter(
      (room) => room.status === "active"
    ).length;

  const inactiveRooms =
    rooms.filter(
      (room) => room.status === "inactive"
    ).length;

  if (loading) {
  return (
    <div className="rooms-loading">
      Loading rooms...
    </div>
  );
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
      <main className="dashboard-main rooms-page">

        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <h1>Room Management</h1>
            <p className="page-subtitle">
              an overview of university facilities, technical status, and occupancy.
            </p>
          </div>

          <div className="dashboard-actions">
            <button
              type="button"
              className="action-pill outline export-btn"
              onClick={handleExport}
            >
              <i className="fa-solid fa-download" aria-hidden="true" />
              Export
            </button>
            <button type="button" className="action-pill primary" onClick={() => navigate("/department-head/add-room")}>
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Add Room
            </button>
          </div>
        </div>

        <div className="dashboard-status-grid">
          <article className="summary-card">
            <span className="summary-label">ACTIVE BOOKINGS</span>
            <strong className="summary-value summary-value--orange">
              {activeRooms}
            </strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">AVAILABLE NOW</span>
            <strong className="summary-value summary-value--green">
              {totalRooms}
            </strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">UNDER MAINTENANCE</span>
            <strong className="summary-value summary-value--grey">
              {inactiveRooms}
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
                    key={room.id}
                    className={`rooms-row ${room.inactive ? 'is-inactive' : 'clickable-row'}`}
                    onClick={() => {
                      if (!room.inactive && typeof onOpenDetails === "function") {
                        onOpenDetails(room.id);
                      }
                    }}
                  >
                    <td>
                      <div className="room-name-cell">
                        <span className={`room-icon room-icon--${room.iconVariant}`}>
                          {room.id}
                        </span>
                        <span>
                          <span className="room-name">{room.id}</span>
                          <span className="room-floor">{room.floor}</span>
                        </span>
                      </div>
                    </td>
                    <td>{room.capacity} Seats</td>
                    <td>
                      <span
                        className={`type-pill type-pill--${room.type} ${
                          room.inactive ? 'type-pill--inactive' : ''
                        }`}
                      >
                        {room.typeLabel}
                      </span>
                    </td>
                    <td>
                      <div className="equipment-tags">
                        {room.equipment.map((item) => (
                          <span
                            key={item}
                            className={`equipment-pill ${room.inactive ? 'equipment-pill--inactive' : ''}`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`room-status ${
                          room.status === 'active' ? 'room-status--active' : 'room-status--inactive'
                        }`}
                      >
                        <span className="room-status-dot" />
                        {room.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
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
                          <i
                            className="fa-solid fa-pen"
                            aria-hidden="true"
                          />
                        </button>
                        <ToggleSwitch
                          checked={room.status === 'active'}
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
                            modals.openDeleteFlow(room.id);
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
                  className={`pagination-page ${
                    currentPage === page ? "is-active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="pagination-nav"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
        onClose={() =>
          setToast({ show: false, type: "", message: "" })
        }
      />
    </>
  );
}

export default RoomManagementView;
