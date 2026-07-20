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
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { isRoomUnderMaintenance } from "../../utils/Roommaintenance";
import { logActivity } from "../../utils/logActivity";
const today = new Date().toISOString().split("T")[0];
import { createNotification } from "../../utils/createNotification";

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
    requesterType: "",

    requesterId: "",
    requesterName: "",

    organizationName: "",

    purpose: "",
    customPurpose: "",

    course: "",
    yearSectionGroup: "",

    attendees: "",

    date: today,

    duration: "",

    endTime: "",
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

  const formatTime = (time) => {

    const [hour, minute] = time.split(":").map(Number);

    const suffix = hour >= 12 ? "PM" : "AM";

    const h = hour % 12 || 12;

    return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;

};

  const overlap = (aStart, aEnd, bStart, bEnd) => {

    return (

      convertToMinutes(aStart) < convertToMinutes(bEnd) &&

      convertToMinutes(aEnd) > convertToMinutes(bStart)

    );

  };

  const currentTime = useMemo(() => {

    const now = new Date();

    return (
        String(now.getHours()).padStart(2,"0") +
        ":" +
        String(now.getMinutes()).padStart(2,"0")
    );

},[]);

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

  const [nowMinutes, setNowMinutes] = useState(() => {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {

      const timer = setInterval(() => {

          const now = new Date();

          setNowMinutes(
              now.getHours() * 60 +
              now.getMinutes()
          );

      }, 60000);

      return () => clearInterval(timer);

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

    const start = nowMinutes;

    return rooms
        .map(room => {

            // ------------------------------------
            // UNDER MAINTENANCE — hindi kasama sa
            // walk-in room slots kahit paano
            // ------------------------------------

            if (
                isRoomUnderMaintenance(
                    room,
                    today,
                    currentTime,
                    currentTime
                )
            ) {
                return null;
            }

            const roomEvents = events.filter(
                e => e.roomId === room.id
            );

            const roomReservations = reservations.filter(
                r => r.roomId === room.id
            );

            const busy = [...roomEvents, ...roomReservations]
                .sort(
                    (a,b)=>
                    convertToMinutes(a.startTime)-
                    convertToMinutes(b.startTime)
                );

            const occupied = busy.find(item=>

                start>=convertToMinutes(item.startTime) &&
                start<convertToMinutes(item.endTime)

            );

            if(occupied) return null;

            const nextBusy = busy.find(item=>

                convertToMinutes(item.startTime)>start

            );

            const availableUntil = nextBusy
                ? nextBusy.startTime
                : "23:59";

            return{

                ...room,

                availableUntil,

                maxMinutes:

                    Math.min(

                        240,

                        convertToMinutes(availableUntil)-start

                    )

            };

        })
        .filter(Boolean);

},[
    rooms,
    events,
    reservations,
    nowMinutes,
    currentTime
]);

  const liveAvailability = useMemo(() => {

      return rooms.map(room => {

    //------------------------------------
    // UNDER MAINTENANCE
    //------------------------------------

    if (
        isRoomUnderMaintenance(
            room,
            today,
            currentTime,
            currentTime
        )
    ) {

          return {
              ...room,
              maintenance: true,
              available: false,
          };

      }

      const roomEvents = events.filter(
          e => e.roomId === room.id
      );

      const roomReservations = reservations.filter(
          r => r.roomId === room.id
      );

      const busy = [...roomEvents, ...roomReservations]
          .sort(
              (a,b)=>
              convertToMinutes(a.startTime)-
              convertToMinutes(b.startTime)
          );

      //------------------------------------
      // CURRENT RESERVATION
      //------------------------------------

      const current = busy.find(item =>

          nowMinutes >= convertToMinutes(item.startTime) &&
          nowMinutes < convertToMinutes(item.endTime)

      );

      if(current){

          const nextReservation = busy.find(item=>

              convertToMinutes(item.startTime) >
              convertToMinutes(current.endTime)

          );

          return{

              ...room,

              maintenance:false,

              available:false,

              nextAvailable:current.endTime,

              nextBusyStart:
                  nextReservation
                  ? nextReservation.startTime
                  : "23:59"

          };

      }

      //------------------------------------
      // AVAILABLE
      //------------------------------------

      const upcoming = busy.find(item=>

          convertToMinutes(item.startTime)>
          nowMinutes

      );

      return{

          ...room,

          maintenance:false,

          available:true,

          availableFrom:currentTime,

          availableUntil:
              upcoming
              ? upcoming.startTime
              : "23:59"

      };

  });

  },[
      rooms,
      events,
      reservations,
      nowMinutes,
      currentTime
  ]);

//---------------------------------------------------
// Live Availability
//---------------------------------------------------

useEffect(() => {

    if (!selectedRoom) {

        setAvailableSlots([]);

        return;

    }

    const roomEvents = events.filter(
        e => e.roomId === selectedRoom.id
    );

    const roomReservations = reservations.filter(
        r => r.roomId === selectedRoom.id
    );

    const busy = [...roomEvents, ...roomReservations]
        .sort(
            (a,b)=>
            convertToMinutes(a.startTime)-
            convertToMinutes(b.startTime)
        );

    const start = convertToMinutes(form.startTime);

    let nextBusy = 24*60;

    busy.forEach(item=>{

        const busyStart = convertToMinutes(item.startTime);

        if(
            busyStart > start &&
            busyStart < nextBusy
        ){

            nextBusy = busyStart;

        }

    });

    //--------------------------------

    const maxDuration =
        Math.min(
            240,
            nextBusy-start
        );

    const slots=[];

    for(let mins=30; mins<=maxDuration; mins+=30){

        slots.push({

            value:mins,

            label:

                mins<60

                ?

                `${mins} mins`

                :

                mins%60===0

                ?

                `${mins/60} Hour`

                :

                `${Math.floor(mins/60)} hr ${mins%60} mins`

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
// Select Room
//---------------------------------------------------

const selectRoom = (room) => {

    setSelectedRoom(room);

    const current = new Date();

    const currentTime =
        String(current.getHours()).padStart(2, "0") +
        ":" +
        String(current.getMinutes()).padStart(2, "0");

    const start = convertToMinutes(currentTime);
    const end = convertToMinutes(room.availableUntil);

    const duration = Math.min(240, end - start);

    setForm(prev => ({
        ...prev,
        startTime: currentTime,
        endTime: convertToTime(start + duration),
        duration
    }));

};

//---------------------------------------------------
// Confirm Reservation
//---------------------------------------------------
const notifyClerkAndDepartmentHead = async (
  title,
  message,
  reservationId
) => {
  const usersSnap = await getDocs(collection(db, "users"));

  const notifications = [];

  usersSnap.forEach((userDoc) => {
    const user = userDoc.data();

    if (
      user.role === "clerk" ||
      user.role === "department-head"
    ) {
      notifications.push(
        addDoc(collection(db, "notifications"), {
          userId: userDoc.id,

          ownerType:
            user.role === "clerk"
              ? "clerk"
              : "department-head",

          reservationId,

          title,
          message,

          type: "walk-in-reservation",

          unread: true,
          archived: false,

          badge: "NEW",

          createdAt: serverTimestamp(),
        })
      );
    }
  });

  await Promise.all(notifications);
};

const handleConfirm = async () => {

    if (!selectedRoom) {
        alert("Please select a room.");
        return;
    }

    // --------------------------------------------
    // FINAL MAINTENANCE CHECK (defensive, in case
    // ng maintenance na-set habang naka-open ang form)
    // --------------------------------------------

    if (
        isRoomUnderMaintenance(
            selectedRoom,
            today,
            form.startTime || currentTime,
            form.endTime || currentTime
        )
    ) {
        alert("This room is under maintenance and cannot be reserved.");
        return;
    }

    if (!form.requesterId.trim()) {
        alert("Requester ID is required.");
        return;
    }

    if (!form.requesterName.trim()) {
        alert("Requester Name is required.");
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

    if (
        (form.requesterType === "organization" ||
        form.purpose === "Meeting") &&
        !form.studentRange
    ) {
        alert("Please select the estimated number of attendees.");
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

        const reservationRef = await addDoc(collection(db, "reservationRequests"), {

            reservationType: "walk-in",

            requesterId: form.requesterId,

            requesterName: form.requesterName,

            organizationName: form.organizationName,

            course: form.course,

            yearSectionGroup: form.yearSectionGroup,

            estimatedAttendees: form.studentRange,

            roomId: selectedRoom.id,

            roomName: selectedRoom.roomName,

            floor: selectedRoom.floor,

            date: today,

            startTime: form.startTime,

            endTime: form.endTime,

            duration: Number(form.duration),

            purpose: form.customPurpose || form.purpose,

            status: "approved",

            approvedBy: auth.currentUser.uid,

            createdBy: auth.currentUser.uid,

            createdAt: serverTimestamp(),

        });

        await notifyClerkAndDepartmentHead(
            "Walk-In Reservation Created",
            `${form.requesterName} created a walk-in reservation for ${selectedRoom.roomName} today from ${form.startTime} to ${form.endTime}.`,
            reservationRef.id
        );

        await addDoc(collection(db, "notifications"), {
            userId: auth.currentUser.uid,
            ownerType: "clerk",

            reservationId: reservationRef.id,

            title: "Walk-In Reservation Saved",

            message: `The walk-in reservation for ${selectedRoom.roomName} has been successfully recorded.`,

            type: "walk-in-created",

            unread: true,
            archived: false,

            badge: "INFO",

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

        // ===============================
        // ACTIVITY LOG
        // ===============================
        await logActivity({
            user: auth.currentUser.displayName || "Local Registrar",
            userId: auth.currentUser.uid,
            role: "Local Registrar",

            action: "Created Walk-In Reservation",
            actionType: "CREATE",

            target: `${selectedRoom.roomName} | ${form.requesterName}`,

            status: "SUCCESS",
        });

        alert("Walk-in reservation successful!");

        setShowModal(false);

        setSelectedRoom(null);

        setAvailableSlots([]);

        setForm({

            requesterId: "",
            requesterName: "",
            organizationName: "",
            course: "",
            yearSectionGroup: "",
            studentRange: "",
            customPurpose: "",

        });

    }

    catch (err) {

        console.error(err);

        await logActivity({
            user: auth.currentUser?.displayName || "Local Registrar",
            userId: auth.currentUser?.uid || "",
            role: "Clerk",

            action: "Created Walk-In Reservation",
            actionType: "CREATE",

            target: selectedRoom?.roomName || "Unknown Room",

            status: "FAILED",
        });

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

          {/* Requester Type */}

          <div className="wir-field">

              <label>Requester Type</label>

              <select
                  className="wir-input"
                  value={form.requesterType}
                  onChange={handleChange("requesterType")}
              >

                  <option value="">
                      Select Requester
                  </option>

                  <option value="faculty">
                      Faculty
                  </option>

                  <option value="organization">
                      Organization
                  </option>

              </select>

          </div>

          <div className="wir-row">

              <div className="wir-field">

                  <label>
                      {form.requesterType === "faculty"
                          ? "Faculty ID"
                          : "Organization / Student ID"}
                  </label>

                  <input
                      className="wir-input"
                      value={form.requesterId}
                      onChange={handleChange("requesterId")}
                  />

              </div>

              <div className="wir-field">

                  <label>

                      {form.requesterType === "faculty"
                          ? "Faculty Name"
                          : "Requester Name"}

                  </label>

                  <input
                      className="wir-input"
                      value={form.requesterName}
                      onChange={handleChange("requesterName")}
                  />

              </div>

          </div>
          {form.requesterType === "organization" && (

            <div className="wir-field">

            <label>Organization Name</label>

            <input
            className="wir-input"
            placeholder="Computer Society"
            value={form.organizationName}
            onChange={handleChange("organizationName")}
            />

            </div>
          )}
          <div className="wir-field">

          {/*PURPOSE */}
          <label>Purpose</label>

          <select
          className="wir-input"
          value={form.purpose}
          onChange={handleChange("purpose")}
          >

          <option value="">Select Purpose</option>

          {
          form.requesterType==="faculty" ? (

          <>

          <option value="Class">Class</option>

          <option value="Meeting">Meeting</option>

          </>

          ):(

          <>

          <option value="Training">Training</option>

          <option value="Meeting">Meeting</option>

          <option value="Seminar">Seminar</option>

          <option value="Other Activity">Other Activity</option>

          </>

          )

          }

          </select>

          </div>

          {form.requesterType==="faculty" &&
            form.purpose==="Class" && (

            <div className="wir-row">

            <div className="wir-field">

            <label>Course</label>

            <input
            className="wir-input"
            placeholder="BSIT"
            value={form.course}
            onChange={handleChange("course")}
            />

            </div>

            <div className="wir-field">

            <label>Year / Section / Group</label>

            <input
            className="wir-input"
            placeholder="4F-G2"
            value={form.yearSectionGroup}
            onChange={handleChange("yearSectionGroup")}
            />

            </div>

            </div>

            )}{ form.requesterType==="faculty" &&
              form.purpose==="Meeting" && (

              <div className="wir-field">

                <label>Estimated Number of Attendees</label>

                <select
                    className="wir-input"
                    value={form.studentRange}
                    onChange={handleChange("studentRange")}
                >

                    <option value="">
                        Select Range
                    </option>

                    <option value="1-30">
                        1 - 30 Persons
                    </option>

                    <option value="31-50">
                        31 - 50 Persons
                    </option>

                    <option value="51-80">
                        51 - 80 Persons
                    </option>

                    <option value="81-100">
                        81 - 100 Persons
                    </option>

                    <option value="101+">
                        101+ Persons
                    </option>

                </select>

            </div>

              )
              }{
              form.requesterType==="organization" && (

              <div className="wir-field">

              <label>Estimated Number of Attendees</label>

                <select
                    className="wir-input"
                    value={form.studentRange}
                    onChange={handleChange("studentRange")}
                >

                    <option value="">
                        Select Range
                    </option>

                    <option value="1-30">
                        1 - 30 Persons
                    </option>

                    <option value="31-50">
                        31 - 50 Persons
                    </option>

                    <option value="51-80">
                        51 - 80 Persons
                    </option>

                    <option value="81-100">
                        81 - 100 Persons
                    </option>

                    <option value="101+">
                        101+ Persons
                    </option>

                </select>

              </div>

              )
              }{
                form.purpose==="Other Activity" && (

                <div className="wir-field">

                <label>Specify Activity</label>

                <input
                className="wir-input"
                placeholder="Specify..."
                value={form.customPurpose}
                onChange={handleChange("customPurpose")}
                />

                </div>

                )
                }

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
                    className={`wir-room-card ${
                        selectedRoom?.id===room.id
                            ? "selected"
                            : ""
                    }`}
                    onClick={()=>selectRoom(room)}
                >

                    <div className="wir-room-card-top">

                        <div>

                            <h4>{room.roomName}</h4>

                            <p>{room.roomType}</p>

                        </div>

                        <span className="wir-room-status">

                            AVAILABLE

                        </span>

                    </div>

                    <div className="wir-room-card-info">

                        <div>

                            <span>Start</span>

                            <strong>{formatTime(currentTime)}</strong>

                        </div>

                        <div>

                            <span>Until</span>

                            <strong>{formatTime(room.availableUntil)}</strong>

                        </div>

                    </div>

                    <div className="wir-room-duration">

                        Maximum Booking

                        <strong>

                            {Math.floor(room.maxMinutes/60) > 0 &&
                                `${Math.floor(room.maxMinutes/60)} hr `}

                            {room.maxMinutes%60}

                            mins

                        </strong>

                    </div>

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
            {

              selectedRoom && availableSlots.length>0 && (

              <div className="wir-max-duration">

              <i className="fa-solid fa-clock"/>

              Maximum Booking

              <strong>

              {

              availableSlots[
              availableSlots.length-1
              ].label

              }

              </strong>

              </div>

              )

              }
            <div className="wir-booking-preview">

              <div className="wir-preview-header">
                  <i className="fa-solid fa-clock"></i>
                  <span>Booking Summary</span>
              </div>

              <div className="wir-preview-grid">

                  <div className="wir-preview-box">
                      <small>START</small>
                      <h3>
                          {form.startTime
                              ? formatTime(form.startTime)
                              : "--"}
                      </h3>
                  </div>

                  <div className="wir-preview-box">
                      <small>END</small>
                      <h3>
                          {form.endTime
                              ? formatTime(form.endTime)
                              : "--"}
                      </h3>
                  </div>

                  <div className="wir-preview-box full">
                      <small>DURATION</small>
                      <h3>
                          {form.duration
                              ? form.duration >= 60
                                  ? `${Math.floor(form.duration / 60)} hr ${form.duration % 60 || ""}`
                                  : `${form.duration} mins`
                              : "--"}
                      </h3>
                  </div>

              </div>

          </div>
          </div>

          <div className="wir-footer">
            <button className="wir-confirm-btn" onClick={() => setShowModal(true)}>
              Confirm Booking
            </button>
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
            {

              selectedRoom && (

              <div className="wir-room-timeline">

              <h4>

              Today's Schedule

              </h4>

              {

              [...events,...reservations]

              .filter(item=>item.roomId===selectedRoom.id)

              .sort(

              (a,b)=>

              convertToMinutes(a.startTime)-

              convertToMinutes(b.startTime)

              )

              .map(item=>(

              <div
              key={item.id}
              className="timeline-item"
              >

              <div className="timeline-time">

              {formatTime(item.startTime)}

              -

              {formatTime(item.endTime)}

              </div>

              <div className="timeline-label">

              {

              item.subject ||

              item.purpose ||

              "Reservation"

              }

              </div>

              </div>

              ))

              }

              </div>

              )
              }
            <div className="wir-avail-date">

            {new Date().toLocaleDateString("en-US",{
                weekday:"long",
                month:"long",
                day:"numeric",
                year:"numeric"
            })}

            </div>

            <div className="wir-avail-list">

              {

              liveAvailability.map(room=>(

              <div
              key={room.id}
              className={`wir-live-room ${
              room.available
              ? "available"
              : "occupied"
              }`}
              >

              <div className="wir-live-top">

              <div>

              <div className="wir-live-room-name">

              {room.roomName}

              </div>

              <div className="wir-live-room-type">

              {room.roomType}

              </div>

              </div>

              <span
              className={`wir-live-badge ${
                  room.maintenance
                      ? "gray"
                      : room.available
                      ? "green"
                      : "red"
              }`}
              >

              {
              room.maintenance
                  ? "MAINTENANCE"
                  : room.available
                  ? "AVAILABLE"
                  : "OCCUPIED"
              }

              </span>

              </div>

              <div className="wir-live-bottom">

                {
                room.maintenance ? (

                    <strong>
                        Room is currently under maintenance
                    </strong>

                ) : room.available ? (

                    <>
                        <div className="live-info-row">
                            <span>Available</span>
                            <strong>
                                {formatTime(currentTime)}
                                {" "}until{" "}
                                {formatTime(room.availableUntil)}
                            </strong>
                        </div>
                    </>

                ) : (

                    <>
                        <div className="live-info-row">
                            <span>Occupied</span>
                            <strong>
                                Until {formatTime(room.nextAvailable)}
                            </strong>
                        </div>

                        <div className="live-info-row">
                            <span>Available Again</span>
                            <strong>

                                {
                                    room.nextBusyStart === "23:59"
                                    ? `${formatTime(room.nextAvailable)} onwards`
                                    : `${formatTime(room.nextAvailable)} - ${formatTime(room.nextBusyStart)}`
                                }

                            </strong>
                        </div>
                    </>

                )}

                </div>

              </div>

              ))

              }

              </div>

            <button className="wir-view-btn" onClick={()=>navigate("/clerk/schedule-view-academic-schedule")}>View Full Schedule</button>
          </div>
        </div>

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