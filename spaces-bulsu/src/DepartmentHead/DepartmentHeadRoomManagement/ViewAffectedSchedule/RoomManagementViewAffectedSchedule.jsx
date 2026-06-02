import '../Shared/room-management-topbar.css';
import './room-management-view-affected-schedule.css';

function PageTopbar({ roomName = 'A1' }) {
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

function RoomManagementViewAffectedSchedule({ selectedRoom = 'A1', onBack = () => {} }) {
  return (
    <main className="dashboard-main room-schedule-page">
      <PageTopbar roomName={selectedRoom} />

      <section className="room-header-grid">
        <div>
          <h1>Room {selectedRoom}</h1>
          <p className="room-location">1st Floor</p>
        </div>
        <div className="room-filter-group">
          <div className="filter-item">
            <label htmlFor="semester-filter">Semester</label>
            <select id="semester-filter" defaultValue="1st">
              <option value="1st">1st Semester</option>
              <option value="2nd">2nd Semester</option>
            </select>
          </div>
          <div className="filter-item">
            <label htmlFor="year-filter">Academic Year</label>
            <select id="year-filter" defaultValue="2026">
              <option value="2026">2026 - 2027</option>
              <option value="2027">2027 - 2028</option>
            </select>
          </div>
        </div>
      </section>

      <section className="room-schedule-card">
        <div className="room-schedule-header">
          <p className="room-schedule-label">October 21 - 23, 2026</p>
          <div className="room-schedule-actions">
            <button type="button" className="calendar-nav" aria-label="Previous week">
              ‹
            </button>
            <button type="button" className="calendar-nav" aria-label="Next week">
              ›
            </button>
          </div>
        </div>

        <div className="room-calendar-grid">
          <div className="calendar-times">
            <div className="time-label">07 AM</div>
            <div className="time-label">08 AM</div>
            <div className="time-label">09 AM</div>
            <div className="time-label">10 AM</div>
            <div className="time-label">11 AM</div>
            <div className="time-label">12 PM</div>
            <div className="time-label">01 PM</div>
            <div className="time-label">02 PM</div>
            <div className="time-label">03 PM</div>
            <div className="time-label">04 PM</div>
          </div>

          <div className="calendar-column">
            <div className="calendar-column-header">
              <span>MON</span>
              <strong>21</strong>
            </div>
            <div className="event-card event-purple">
              <p className="event-code">IT307W</p>
              <p className="event-title">Game Development</p>
              <span className="event-time">08:00 AM - 11:00 AM</span>
            </div>
            <div className="event-card event-blue">
              <p className="event-code">IT308</p>
              <p className="event-title">Information Assurance and Security</p>
              <span className="event-time">01:00 PM - 04:00 PM</span>
            </div>
          </div>

          <div className="calendar-column">
            <div className="calendar-column-header">
              <span>TUE</span>
              <strong>22</strong>
            </div>
            <div className="event-card event-pink">
              <p className="event-code">CAPS 301</p>
              <p className="event-title">Capstone Project and Research</p>
              <span className="event-time">07:00 AM - 10:00 AM</span>
            </div>
            <div className="event-card event-blue">
              <p className="event-code">PERDEV</p>
              <p className="event-title">Presentation Skills and Personality Development</p>
              <span className="event-time">11:00 AM - 02:00 PM</span>
            </div>
          </div>

          <div className="calendar-column">
            <div className="calendar-column-header">
              <span>WED</span>
              <strong>23</strong>
            </div>
            <div className="event-card event-pink">
              <p className="event-code">IT302</p>
              <p className="event-title">Systems Integration and Architecture</p>
              <span className="event-time">09:00 AM - 12:00 PM</span>
            </div>
            <div className="event-card event-yellow">
              <p className="event-code">IT311</p>
              <p className="event-title">Social and Professional Issues</p>
              <span className="event-time">01:00 PM - 04:00 PM</span>
            </div>
          </div>
        </div>
      </section>

      <div className="schedule-back-button-container">
        <button type="button" className="action-pill outline" onClick={onBack}>
          Back
        </button>
      </div>
    </main>
  );
}

export default RoomManagementViewAffectedSchedule;
