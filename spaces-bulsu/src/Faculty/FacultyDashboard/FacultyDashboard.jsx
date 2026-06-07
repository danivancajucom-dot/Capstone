import React, { useState } from 'react';
import './faculty-dashboard.css';
import { useNavigate } from "react-router-dom";


export default function FacultyDashboard({ onLogout }) {
  const navigate = useNavigate();


  const upcomingClasses = [
    {
      day: 'SAT',
      date: '26',
      subject: 'Project Management',
      room: 'IT 14',
      time: '11:00 AM',
    },
    {
      day: 'MON',
      date: '28',
      subject: 'Capstone',
      room: 'CT8',
      time: '10:00 AM',
    },
    {
      day: 'TUE',
      date: '29',
      subject: 'Intro to Programming',
      room: 'Prog Lab 2',
      time: '10:00 AM',
    },
  ];

  return (
    <>

      <div className="dashboard-shell">
  

        {/* MAIN */}
        <main className="dashboard-main">

          {/* RESERVE BUTTON */}
          <div className="reserve-wrapper">
              <button className="reserve-btn" onClick={() => navigate("/faculty/submit-reservation")}> 
              <i className="fa-solid fa-plus"></i>
              Reserve Room
            </button>
          </div>

          {/* TODAY'S SCHEDULE */}
          <section className="today-card">
            <div className="card-header">
              <h2>Today's Schedule</h2>

              <button className="see-all-btn">
                See All
              </button>
            </div>

            <div className="schedule-slider">
              <button className="slide-btn left">
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              <div className="schedule-banner">
                <span className="ongoing-badge">
                  ONGOING
                </span>

                <span className="schedule-time">
                  07:00 AM - 10:00 AM
                </span>

                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop"
                  alt="Classroom"
                />

                <div className="banner-overlay">
                  <h1>Prog Lab 2</h1>
                  <p>Intro to Programming</p>
                </div>
              </div>

              <button className="slide-btn right">
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            {/* UPCOMING */}
            <div className="upcoming-section">
              <h2>Upcoming Classes</h2>

              <div className="upcoming-list">
                {upcomingClasses.map((item, index) => (
                  <div className="upcoming-card" key={index}>
                    <div className="date-box">
                      <span>{item.day}</span>
                      <h3>{item.date}</h3>
                    </div>

                    <h1>{item.subject}</h1>

                    <div className="class-info">
                      <span>
                        <i className="fa-regular fa-building"></i>
                        {item.room}
                      </span>

                      <span>
                        <i className="fa-regular fa-clock"></i>
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}