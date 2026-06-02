import { useState } from 'react';
import './Shared/room-management-topbar.css';
import RoomManagementModals from './Modals/RoomManagementModals';
import { useDeactivationModals } from './hooks/useDeactivationModals';
import './room-management-view.css';
import DepartmentHeadNav from '../../Components/DepartmentHeadNav/DepartmentHeadNav';

function PageTopbar() {
  return (
    <div className="dashboard-topbar">
      <div className="search-box">
        <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true" />
        <input type="text" placeholder="Search rooms or users..." />
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-btn icon-btn--notify" aria-label="notifications">
          <i className="fa-regular fa-bell" aria-hidden="true" />
          <span className="notify-badge" aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" aria-label="settings">
          <i className="fa-solid fa-gear" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const INITIAL_ROOMS = [
  {
    id: 'A1',
    floor: '1st Floor',
    capacity: 30,
    type: 'lecture',
    typeLabel: 'Lecture Hall',
    equipment: ['PROJECTOR', 'AC', 'SMART BOARD'],
    status: 'active',
    iconVariant: 'peach',
  },
  {
    id: 'A2',
    floor: '1st Floor',
    capacity: 30,
    type: 'lecture',
    typeLabel: 'Lecture Hall',
    equipment: ['PROJECTOR', 'AC', 'SMART BOARD'],
    status: 'active',
    iconVariant: 'peach',
  },
  {
    id: 'IT13',
    floor: '1st Floor',
    capacity: 30,
    type: 'lab',
    typeLabel: 'Computer Lab',
    equipment: ['PC (x35)', 'FIBER INT'],
    status: 'active',
    iconVariant: 'orange',
  },
  {
    id: 'IT14',
    floor: '1st Floor',
    capacity: 30,
    type: 'lab',
    typeLabel: 'Computer Lab',
    equipment: ['PC (x35)', 'FIBER INT'],
    status: 'active',
    iconVariant: 'orange',
  },
  {
    id: 'IT15',
    floor: '1st Floor',
    capacity: 30,
    type: 'lab',
    typeLabel: 'Computer Lab',
    equipment: ['PC (x35)', 'FIBER INT'],
    status: 'inactive',
    iconVariant: 'muted',
    inactive: true,
  },
];

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
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const modals = useDeactivationModals();

  const handleSwitchClick = (room) => {
    if (room.status === 'active') {
      modals.openDeactivateFlow(room.id);
    } else {
      modals.openActivateFlow(room.id);
    }
  };

  const handleDeactivationConfirm = () => {
    const roomId = modals.roomName;
    modals.closeAll();
    setRooms((prev) =>
      prev.map((room) => (room.id === roomId ? getInactiveRoomStyle(room) : room))
    );
  };

  const handleActivateConfirm = () => {
    const roomId = modals.roomName;
    modals.closeAll();
    setRooms((prev) =>
      prev.map((room) => (room.id === roomId ? getActiveRoomStyle(room) : room))
    );
  };

  const handleViewAffectedSchedules = () => {
    const roomId = modals.roomName;
    modals.closeAll();
    onViewAffectedSchedules?.(roomId);
  };

  return (
    <>
      <DepartmentHeadNav activePage="room-management" />
      <RoomManagementModals
        roomName={modals.roomName}
        showWarningModal={modals.showWarningModal}
        showDeactivationModal={modals.showDeactivationModal}
        showActivationModal={modals.showActivationModal}
        closeWarningModal={modals.closeWarningModal}
        closeDeactivationModal={modals.closeDeactivationModal}
        closeActivationModal={modals.closeActivationModal}
        handleConfirmDeactivation={modals.handleConfirmDeactivation}
        onConfirmDeactivation={handleDeactivationConfirm}
        onActivateConfirm={handleActivateConfirm}
        onViewAffectedSchedules={handleViewAffectedSchedules}
      />
      <main className="dashboard-main rooms-page">
        <PageTopbar />

        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <h1>Room Management</h1>
            <p className="page-subtitle">
              an overview of university facilities, technical status, and occupancy.
            </p>
          </div>

          <div className="dashboard-actions">
            <button type="button" className="action-pill outline export-btn">
              <i className="fa-solid fa-download" aria-hidden="true" />
              Export
            </button>
            <button type="button" className="action-pill primary" onClick={onAddRoom}>
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Add Room
            </button>
          </div>
        </div>

        <div className="dashboard-status-grid">
          <article className="summary-card">
            <span className="summary-label">ACTIVE BOOKINGS</span>
            <strong className="summary-value summary-value--orange">8</strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">AVAILABLE NOW</span>
            <strong className="summary-value summary-value--green">10</strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">UNDER MAINTENANCE</span>
            <strong className="summary-value summary-value--grey">4</strong>
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
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className={`rooms-row ${room.inactive ? 'is-inactive' : 'clickable-row'}`}
                    onClick={() => !room.inactive && onOpenDetails(room.id)}
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
                            onEditRoom(room.id);
                          }}
                          aria-label={`Edit ${room.id}`}
                        >
                          <i className="fa-solid fa-pen" aria-hidden="true" />
                        </button>
                        <ToggleSwitch
                          checked={room.status === 'active'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchClick(room);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-row">
            <span>Showing 1 to 5 of 22 rooms</span>
            <div className="pagination-buttons">
              <button type="button" className="pagination-nav" aria-label="Previous page">
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
              <button type="button" className="pagination-page is-active">
                1
              </button>
              <button type="button" className="pagination-page">
                2
              </button>
              <button type="button" className="pagination-page">
                3
              </button>
              <button type="button" className="pagination-nav" aria-label="Next page">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default RoomManagementView;
