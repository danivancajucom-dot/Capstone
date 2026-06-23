import { useState } from "react";
import "./released-rooms.css";
import ReleasedRoomCard from "../../Components/ReleasedRoomCard/ReleasedRoomCard";
import RoomDetails from "../ClerkRoomDetails/RoomDetails";

const placeholder = [
  { id: 1, room: "ROOM A2",   name: "Juan Dela Cruz", time: "10:00 AM - 1:00 PM",  subject: "Game Development",    ago: "2 mins ago",  image: "https://placehold.co/160x100" },
  { id: 2, room: "ROOM CT8",  name: "Juan Dela Cruz", time: "02:00 PM - 05:00 PM", subject: "IT308",               ago: "15 mins ago", image: "https://placehold.co/160x100" },
  { id: 3, room: "ROOM SDL2", name: "Juan Dela Cruz", time: "10:00 AM - 01:00 PM", subject: "CICT Event Meeting",  ago: "20 mins ago", image: "https://placehold.co/160x100" },
];

export default function ReleasedRooms() {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return <RoomDetails onBack={() => setSelected(null)} />;
  }

  return (
    <>
      <div className="page">
      <i className="fa-solid fa-arrow-left back-arrow"></i>
      <h1>Released Rooms</h1>

      <div className="list-card">
        {placeholder.map(item => (
          <ReleasedRoomCard
            key={item.id}
            room={item.room}
            name={item.name}
            time={item.time}
            subject={item.subject}
            ago={item.ago}
            image={item.image}
            onClick={() => setSelected(item)}
          />
        ))}

        <div className="load-more-wrapper">
          <button className="btn-load-more">Load More</button>
        </div>
      </div>
    </div>
    </>
  );
}