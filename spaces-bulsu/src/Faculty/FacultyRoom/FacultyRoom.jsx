import { useState } from "react";
import "./faculty-room.css";
import RoomCard from "../../Components/RoomCard/RoomCard";

const PLACEHOLDER_ROOMS = [
  { id: 1, name: "SDL2",      subject: null,                 status: "available", capacity: 30, until: "3:30 PM", image: null },
  { id: 2, name: "Prog Lab 1", subject: "Intro to Programming", status: "occupied",  capacity: 30, until: null,      image: null },
  { id: 3, name: "Room A1",   subject: null,                 status: "available", capacity: 40, until: "5:00 PM", image: null },
  { id: 4, name: "Room CT8",  subject: "IT308",              status: "occupied",  capacity: 35, until: null,      image: null },
];

const TABS = ["All", "Available", "Occupied"];

export default function RoomAvailability() {
  const [activeTab, setActiveTab] = useState("All");

  const filtered = PLACEHOLDER_ROOMS.filter(r => {
    if (activeTab === "Available") return r.status === "available";
    if (activeTab === "Occupied")  return r.status === "occupied";
    return true;
  });

  return (
    <>
    <div className="ra2-page">

      <div className="ra2-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`ra2-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="ra2-list">
        {filtered.map(room => (
          <RoomCard
            key={room.id}
            item={room}
            onReserve={() => console.log("Reserve:", room.name)}
            onNotify={()  => console.log("Notify:", room.name)}
          />
        ))}

        <div className="ra2-load-more">
          <button className="ra2-load-btn">Load More</button>
        </div>
      </div>
    </div>
    </>

  );
}