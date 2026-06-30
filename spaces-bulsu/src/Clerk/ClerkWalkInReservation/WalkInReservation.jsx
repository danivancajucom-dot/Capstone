import { useEffect, useMemo, useState } from "react";
import "./WalkInReservation.css";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

const today = new Date().toISOString().split("T")[0];

export default function WalkInReservation() {

  const [pageLoading, setPageLoading] = useState(true);
  const [savingReservation, setSavingReservation] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [selectedRoom, setSelectedRoom] = useState(null);

  const [floor, setFloor] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [availableSlots, setAvailableSlots] = useState([]);

  const [form, setForm] = useState({

    studentId: "",

    name: "",

    date: today,

    startTime: "",

    duration: "",

    endTime: "",

    purpose: "",

  });

  //---------------------------------------------------
  // Utilities
  //---------------------------------------------------

  const convertToMinutes = (time) => {

    if (!time) return 0;

    const [h, m] = time.split(":").map(Number);

    return h * 60 + m;

  };

  const convertToTime = (mins) => {

    const h = Math.floor(mins / 60);

    const m = mins % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  };

  const overlap = (aStart, aEnd, bStart, bEnd) => {

    return (

      convertToMinutes(aStart) < convertToMinutes(bEnd) &&

      convertToMinutes(aEnd) > convertToMinutes(bStart)

    );

  };

  //---------------------------------------------------
  // Load Rooms
  //---------------------------------------------------

  useEffect(() => {

    const unsub = onSnapshot(

      collection(db, "rooms"),

      (snap) => {

        const data = snap.docs.map(doc => ({

          id: doc.id,

          ...doc.data(),

        }));

        setRooms(data);
        setLoadingRooms(false);

      }

    );

    return unsub;

  }, []);

  //---------------------------------------------------
  // Load Academic Schedule
  //---------------------------------------------------

  useEffect(() => {

    const q = query(

      collection(db, "events"),

      where("date", "==", today)

    );

    const unsub = onSnapshot(q, (snap) => {

      const data = snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data(),

      }));

      setEvents(data);
      setLoadingSchedule(false);

    });

    return unsub;

  }, []);

  //---------------------------------------------------
  // Load Approved Reservations
  //---------------------------------------------------

  useEffect(() => {

    const q = query(

      collection(db, "reservations"),

      where("date", "==", today),

      where("status", "==", "approved")

    );

    const unsub = onSnapshot(q, (snap) => {

      const data = snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data(),

      }));

      setReservations(data);

    });

    return unsub;

  }, []);

  //---------------------------------------------------
  // Current Time
  //---------------------------------------------------

  const nowMinutes = useMemo(() => {

    const now = new Date();

    return now.getHours() * 60 + now.getMinutes();

  }, []);

  //---------------------------------------------------
  // Handle Inputs
  //---------------------------------------------------

  const handleChange = (field) => (e) => {

    setForm(prev => ({

      ...prev,

      [field]: e.target.value,

    }));

  };

  //---------------------------------------------------
// Available Rooms
//---------------------------------------------------

const availableRooms = useMemo(() => {

    if (!form.startTime) return [];

    const start = convertToMinutes(form.startTime);

    return rooms.filter(room => {

        if (floor && room.floor !== floor)
            return false;

        // cannot book past time
        if (start < nowMinutes)
            return false;

        // Today's academic schedule
        const roomEvents = events.filter(
            e => e.roomId === room.id
        );

        // Today's approved reservations
        const roomReservations = reservations.filter(
            r => r.roomId === room.id
        );

        // Room occupied at selected start time?
        const occupied = [...roomEvents, ...roomReservations].some(item => {

            return (
                start >= convertToMinutes(item.startTime) &&
                start < convertToMinutes(item.endTime)
            );

        });

        return !occupied;

    });

}, [
    rooms,
    events,
    reservations,
    floor,
    form.startTime,
    nowMinutes
]);

//---------------------------------------------------
// Live Availability
//---------------------------------------------------

useEffect(() => {

    if (!selectedRoom || !form.startTime) {

        setAvailableSlots([]);
        return;

    }

    const roomEvents = events.filter(
        e => e.roomId === selectedRoom.id
    );

    const roomReservations = reservations.filter(
        r => r.roomId === selectedRoom.id
    );

    const busy = [...roomEvents, ...roomReservations].sort((a,b)=>
        convertToMinutes(a.startTime)-convertToMinutes(b.startTime)
    );

    const start = convertToMinutes(form.startTime);

    let nextBusy = 24 * 60;

    busy.forEach(item=>{

        const busyStart = convertToMinutes(item.startTime);

        if(
            busyStart > start &&
            busyStart < nextBusy
        ){

            nextBusy = busyStart;

        }

    });

    const maxMinutes = Math.min(
        240,
        nextBusy - start
    );

    const slots = [];

    for(let mins=30; mins<=maxMinutes; mins+=30){

        slots.push({
            label:`${mins/60} hr`,
            value:mins
        });

    }

    setAvailableSlots(slots);

},[
    selectedRoom,
    form.startTime,
    events,
    reservations
]);

//---------------------------------------------------
// Auto End Time
//---------------------------------------------------

useEffect(()=>{

    if(
        !form.startTime ||
        !form.duration
    ){

        setForm(prev=>({
            ...prev,
            endTime:""
        }));

        return;

    }

    const end =

        convertToMinutes(form.startTime)+
        Number(form.duration);

    setForm(prev=>({

        ...prev,

        endTime:convertToTime(end)

    }));

},[
    form.startTime,
    form.duration
]);

//---------------------------------------------------
// Select Room
//---------------------------------------------------

const selectRoom=(room)=>{

    setSelectedRoom(room);

};

//---------------------------------------------------
// Confirm Reservation
//---------------------------------------------------

const handleConfirm = async () => {

    if (!selectedRoom) {
        alert("Please select a room.");
        return;
    }

    if (!form.studentId.trim()) {
        alert("Student/Faculty ID is required.");
        return;
    }

    if (!form.name.trim()) {
        alert("Name is required.");
        return;
    }

    if (!form.startTime) {
        alert("Select a start time.");
        return;
    }

    if (!form.duration) {
        alert("Select a duration.");
        return;
    }

    if (!form.purpose.trim()) {
        alert("Purpose is required.");
        return;
    }

    const start = convertToMinutes(form.startTime);
    const end = convertToMinutes(form.endTime);

    //-------------------------------------------------
    // Double Check Conflict
    //-------------------------------------------------

    const roomEvents = events.filter(
        e => e.roomId === selectedRoom.id
    );

    const roomReservations = reservations.filter(
        r => r.roomId === selectedRoom.id
    );

    const conflict = [...roomEvents, ...roomReservations].find(item =>
        overlap(
            form.startTime,
            form.endTime,
            item.startTime,
            item.endTime
        )
    );

    if (conflict) {
        alert("Room is no longer available.");
        return;
    }

    try {

        setSavingReservation(true);

        await addDoc(collection(db, "reservations"), {

            reservationType: "walk-in",

            requesterId: form.studentId,

            requesterName: form.name,

            roomId: selectedRoom.id,

            roomName: selectedRoom.roomName,

            floor: selectedRoom.floor,

            date: today,

            startTime: form.startTime,

            endTime: form.endTime,

            duration: Number(form.duration),

            purpose: form.purpose,

            status: "approved",

            approvedBy: auth.currentUser.uid,

            createdBy: auth.currentUser.uid,

            createdAt: serverTimestamp(),

        });

        //-------------------------------------------------
        // Optional Room Status Update
        //-------------------------------------------------

        const current = new Date();

        const currentMinutes =
            current.getHours() * 60 +
            current.getMinutes();

        if (
            currentMinutes >= start &&
            currentMinutes < end
        ) {

            await updateDoc(
                doc(db, "rooms", selectedRoom.id),
                {
                    status: "Occupied"
                }
            );

        }

        alert("Walk-in reservation successful!");

        setShowModal(false);

        setSelectedRoom(null);

        setAvailableSlots([]);

        setForm({

            studentId: "",

            name: "",

            date: today,

            startTime: "",

            duration: "",

            endTime: "",

            purpose: "",

        });

    }

    catch (err) {

        console.error(err);

        alert("Failed to save reservation.");

    }

    finally {

        setSavingReservation(false);

    }

};

useEffect(() => {
    if (
        !loadingRooms &&
        !loadingSchedule &&
        reservations.length >= 0
    ) {
        setPageLoading(false);
    }
}, [loadingRooms, loadingSchedule, reservations]);

if(pageLoading){

  return(

  <div className="wir-loading-page">

  <div className="spinner"></div>

  <p>Loading walk-in reservation...</p>

  </div>

  );

  }

  return (
    <>
    <div className="container">
      <div className="wir-page">
      

      <h1 className="wir-title">Walk-In Reservation</h1>
      <p className="wir-subtitle">Instant Booking</p>

      <div className="wir-layout">

        <div className="wir-card">

          <div className="wir-section-title">
            <span className="wir-section-bar" />
            Requester Information
          </div>

          <div className="wir-row">
            <div className="wir-field">
              <label>Student or Faculty ID</label>
              <input className="wir-input" placeholder="Enter ID"
                value={form.studentId} onChange={handleChange("studentId")} />
            </div>
            <div className="wir-field">
              <label>Name</label>
              <input className="wir-input" placeholder="Enter name"
                value={form.name} onChange={handleChange("name")} />
            </div>
          </div>

          <div className="wir-section-title" style={{ marginTop: 24 }}>
            <span className="wir-section-bar" />
            Room And Schedule
          </div>

          <div className="wir-slots-header">
            <span className="wir-slots-label">Available Room Slots</span>
            <div className="wir-floor-pill">
              {floor}
              <i className="fa-solid fa-chevron-down" />
            </div>
          </div>

          <div className="wir-slots">
            {loadingRooms ? (
              <div className="wir-inline-loading">
              Loading rooms...
              </div>

              ) : (availableRooms.map(room => (
                <button
                    key={room.id}
                    className={`wir-slot ${
                        selectedRoom?.id === room.id ? "selected" : "available"
                    }`}
                    onClick={() => selectRoom(room)}
                >
                    {room.roomName}
                </button>
            )))}
          </div>

          <div className="wir-row" style={{ marginTop: 20 }}>
            <div className="wir-field">
              <label>Date</label>
              <div className="wir-icon-input">
                <i className="fa-regular fa-calendar" />
                <input
                type="date"
                className="wir-plain-input"
                value={today}
                readOnly
                />
              </div>
            </div>
            <div className="wir-field">
              <label>Duration</label>
              <select
                  className="wir-input"
                  value={form.duration}
                  onChange={handleChange("duration")}
              >

              <option value="">
              Select Duration
              </option>

              {availableSlots.map(slot=>(

              <option
              key={slot.value}
              value={slot.value}
              >

              {slot.label}

              </option>

              ))}

              </select>
            </div>
          </div>

          <div className="wir-row">
            <div className="wir-field">
              <label>Start Time</label>
              <div className="wir-icon-input">
                <i className="fa-regular fa-clock" />
                <input
                type="time"
                className="wir-plain-input"
                min={ new Date().toLocaleTimeString("en-GB", {hour:"2-digit", minute:"2-digit"})}
                value={form.startTime}
                onChange={handleChange("startTime")}
                />
              </div>
            </div>
            <div className="wir-field">
              <label>End Time</label>
              <div className="wir-icon-input">
                <i className="fa-regular fa-clock" />
                <input
                className="wir-plain-input"
                value={form.endTime}
                readOnly
                />
              </div>
            </div>
          </div>

          <div className="wir-field">
            <label>Purpose</label>
            <textarea className="wir-textarea" placeholder="Enter purpose..."
              value={form.purpose} onChange={handleChange("purpose")} />
          </div>
        </div>

        <div className="wir-right-col">

          <div className="wir-quick-note">
            <i className="fa-solid fa-circle-info" />
            <div>
              <div className="wir-note-title">Quick Note</div>
              <div className="wir-note-text">Walk-in reservations are limited to a maximum of 4 hours.</div>
            </div>
          </div>

          <div className="wir-availability-card">
            <div className="wir-avail-header">
              <span className="wir-avail-title">Live Availability</span>
              <span className="wir-live-dot" />
            </div>
            <div className="wir-avail-date">

            {new Date().toLocaleDateString("en-US",{
                weekday:"long",
                month:"long",
                day:"numeric",
                year:"numeric"
            })}

            </div>

            <div className="wir-avail-list">

            {loadingSchedule ? (

            <div className="wir-inline-loading">
            Loading schedule...
            </div>

            ) : selectedRoom ? (

                [...events, ...reservations]
                    .filter(item => item.roomId === selectedRoom.id)
                    .sort(
                        (a,b)=>
                        convertToMinutes(a.startTime)-
                        convertToMinutes(b.startTime)
                    )
                    .map(item=>(

                        <div
                            key={item.id}
                            className="wir-avail-item reserved"
                        >

                            <span className="wir-avail-time">
                                {item.startTime} - {item.endTime}
                            </span>

                            <span className="wir-avail-label">
                                {item.purpose || item.subject}
                            </span>

                        </div>

                    ))

            ) : (

                <div className="wir-empty">
                    Select a room first
                </div>

            )}

        </div>

            <button className="wir-view-btn">View Full Schedule</button>
          </div>
        </div>
      </div>

      <div className="wir-footer">
        <button className="wir-confirm-btn" onClick={() => setShowModal(true)}>
          Confirm Booking
        </button>
      </div>

      {showModal && (
        <div className="wir-modal-overlay">
          <div className="wir-modal">
            <div className="wir-modal-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3 className="wir-modal-title">Are you sure?</h3>
            <p className="wir-modal-text">Do you want to proceed<br />with this operation?</p>
            <button className="wir-modal-cancel"  onClick={() => setShowModal(false)}>Cancel</button>
            <button
            className="wir-modal-confirm"
            disabled={savingReservation}
            onClick={handleConfirm}
            >

            {savingReservation ? (

            <>

            <span className="small-spinner"></span>

            Saving...

            </>

            ):(

            "Confirm"

            )}

            </button>
          </div>
        </div>
      )}
    </div>
    </div>
    </>

  );
}