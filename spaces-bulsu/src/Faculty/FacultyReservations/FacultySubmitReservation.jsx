import { useState, useEffect } from "react";
import "./faculty-submit-reservation.css";
import Toast from "../../Popup/Toast/Toast";
import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

function FacultySubmitReservation() {
  const [purpose, setPurpose] = useState("");
  const [courseTitle, setCourseTitle] = useState("");

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [selectedFloor, setSelectedFloor] = useState("");

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [studentRange, setStudentRange] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [course, setCourse] = useState("");
  const [yearSectionGroup, setYearSectionGroup] = useState("");
  const [organization, setOrganization] = useState("");
  const [otherAudience, setOtherAudience] = useState("");
  const [loading, setLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    if (type !== "loading") {
      setTimeout(() => {
        setToast((prev) => ({
          ...prev,
          show: false,
        }));
      }, 4000);
    }
  };

  const EQUIPMENT_OPTIONS = [
    { id: "projector", label: "Projector", icon: "📽" },
    { id: "tvDisplay", label: "TV Display", icon: "📺" },
    { id: "ac", label: "AC", icon: "❄️" },
    { id: "computer", label: "Computer", icon: "💻" },
    { id: "smartBoard", label: "Smart Board", icon: "🖊" },
  ];

  const toggleEquipment = (id) => {
    setSelectedEquipment((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  useEffect(() => {

      loadAvailableRooms();

  },[
      date,
      startTime,
      endTime,
      selectedFloor,
      purpose,
      selectedEquipment,
      studentRange,
  ]);

  const convertToMinutes=(time)=>{

      if(!time) return 0;

      const [h,m]=time.split(":").map(Number);

      return h*60+m;

  };

  const isToday = (selectedDate) => {
    if (!selectedDate) return false;

    const today = new Date();

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    return selectedDate === `${yyyy}-${mm}-${dd}`;
  };

  const getCurrentMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  const getMinimumCapacity = (range) => {
    switch (range) {
      case "30-50":
        return 30;

      case "50-60":
        return 50;

      case "60-80":
        return 60;

      case "80-100":
        return 80;

      default:
        return 0;
    }
  };

  const isOverlapping=(

      start1,
      end1,
      start2,
      end2

  )=>{

      const s1=convertToMinutes(start1);
      const e1=convertToMinutes(end1);

      const s2=convertToMinutes(start2);
      const e2=convertToMinutes(end2);

      return s1<e2 && e1>s2;

  };

  const getDay=(date)=>{

      const days=[
          "SUN",
          "MON",
          "TUE",
          "WED",
          "THU",
          "FRI",
          "SAT"
      ];

      return days[new Date(date).getDay()];

  };

  const loadAvailableRooms = async () => {

    if (!date || !startTime || !endTime) {
      setRooms([]);
      return;
    }

    setLoading(true);

    try {

      const roomSnapshot = await getDocs(
        collection(db, "rooms")
      );

      const activitySnapshot = await getDocs(
        collection(db, "events")
      );

      const requestSnapshot = await getDocs(
        collection(db, "reservationRequests")
      );

      const roomList = [];

      for (const roomDoc of roomSnapshot.docs) {

        const room = {
          id: roomDoc.id,
          ...roomDoc.data(),
        };

        // ----------------------------
        // FLOOR FILTER
        // ----------------------------

        if (selectedFloor) {

          const roomFloor =
              String(room.floor).toLowerCase();

          const selected =
              selectedFloor.toLowerCase();

          if (
              !roomFloor.includes(selected)
          ) {
              continue;
          }

      }

        // ----------------------------
        // EQUIPMENT FILTER
        // ----------------------------

        if (
          purpose === "Hands-on" &&
          selectedEquipment.length > 0
        ) {

          const roomEquipment = Object.entries(room.equipment || {})
            .filter(([key, value]) => value === true)
            .map(([key]) => key.toLowerCase());

          const hasAllEquipment = selectedEquipment.every(eq =>
            roomEquipment.includes(eq.toLowerCase())
          );

          if (!hasAllEquipment) {
            continue;
          }

        }

        let occupied = false;

        // ----------------------------
        // CAPACITY FILTER
        // ----------------------------

        if (
          (purpose === "Lecture" ||
            purpose === "Examination") &&
          studentRange
        ) {
          const requiredCapacity =
            getMinimumCapacity(studentRange);

          if (
            Number(room.capacity || 0) <
            requiredCapacity
          ) {
            continue;
          }
        }

        // ----------------------------
        // CLASS SCHEDULES
        // ----------------------------

        const scheduleSnapshot = await getDocs(
          collection(
            db,
            "rooms",
            room.id,
            "schedules"
          )
        );

        occupied = scheduleSnapshot.docs.some(doc => {

          const sched = doc.data();

          if (sched.initialized)
            return false;

          if (sched.day !== getDay(date))
            return false;

          return isOverlapping(

            startTime,
            endTime,

            sched.startTime,
            sched.endTime

          );

        });

        // ----------------------------
        // ROOM ACTIVITIES
        // ----------------------------

        if (!occupied) {

          occupied = activitySnapshot.docs.some(doc => {

            const event = doc.data();

            if (event.roomId !== room.id)
              return false;

            if (event.date !== date)
              return false;

            if (event.status === "Cancelled")
              return false;

            return isOverlapping(

              startTime,
              endTime,

              event.startTime,
              event.endTime

            );

          });

        }

        // ----------------------------
        // PENDING RESERVATIONS
        // ----------------------------

        if (!occupied) {

          occupied = requestSnapshot.docs.some(doc => {

            const req = doc.data();

            if (req.roomId !== room.id)
              return false;

            if (req.date !== date)
              return false;

            if (req.status === "Rejected")
              return false;

            return isOverlapping(

              startTime,
              endTime,

              req.startTime,
              req.endTime

            );

          });

        }

        roomList.push({

          ...room,

          available: !occupied,

        });

      }

      setRooms(roomList);

    } catch (err) {

      console.error(err);

      showToast(
        "error",
        "Error",
        "Unable to load rooms."
      );

    }

    setLoading(false);

  };

  const validate = () => {
    if (!courseTitle)
      return "Course title is required.";

    if (!date)
      return "Select a reservation date.";

    if (!audienceType)
      return "Select audience type.";

    if (audienceType === "Class") {

      if (!course)
        return "Enter course.";

      if (!yearSectionGroup)
        return "Enter Year / Section Group.";
    }

    if (audienceType === "Organization" && !organization)
      return "Enter organization name.";

    if (audienceType === "Others" && !otherAudience)
      return "Describe the attendees.";

    // -------------------------
    // NO PAST DATES
    // -------------------------

    const today = new Date();

    today.setHours(0,0,0,0);

    const selectedDate = new Date(date);

    selectedDate.setHours(0,0,0,0);

    if (selectedDate < today) {
      return "You cannot reserve a past date.";
    }

    if (!startTime)
      return "Select a start time.";

    if (!endTime)
      return "Select an end time.";

    const start = convertToMinutes(startTime);
    const end = convertToMinutes(endTime);

    // -------------------------
    // ONLY 7AM - 8PM
    // -------------------------

    if (start < 420)
      return "Reservations can only start from 7:00 AM.";

    if (end > 1200)
      return "Reservations must end before 8:00 PM.";

    if (start >= end)
      return "End time must be after start time.";

    // -------------------------
    // IF TODAY, NO PAST TIME
    // -------------------------

    if (isToday(date)) {

      const now = getCurrentMinutes();

      if (start <= now) {

        return "You cannot reserve a past time today.";

      }

    }

    if (!purpose)
      return "Select reservation purpose.";

    if (
      purpose === "Hands-on" &&
      selectedEquipment.length === 0
    ) {
      return "Select at least one required equipment.";
    }

    if (
      (purpose === "Lecture" ||
        purpose === "Examination") &&
      !studentRange
    ) {
      return "Select the estimated number of students.";
    }

    if (!selectedRoom)
      return "Select an available room.";

    return null;
  };

  const handleSubmit=async()=>{

      const error=validate();

      if(error){

          showToast(
              "error",
              "Validation Error",
              error
          );

          return;

      }
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      let facultyName = "";

      if (userSnap.exists()) {
        const userData = userSnap.data();

        facultyName = `${userData.firstName} ${userData.lastName}`;
      }


      try{

          showToast(
              "loading",
              "Submitting",
              "Please wait..."
          );

         await addDoc(collection(db, "reservationRequests"), {
          userId: auth.currentUser.uid,
          facultyName,

          roomId: selectedRoom.id,
          roomName: selectedRoom.roomName,

          audienceType,

          attendees: {
            course,
            yearSectionGroup,
            organization,
            otherAudience,
          },

          courseTitle,
          purpose,

          requiredEquipment: selectedEquipment,
          studentRange,

          date,
          startTime,
          endTime,

          status: "Pending",

          createdAt: serverTimestamp(),
        });

          setShowConfirm(false);

          showToast(

              "success",

              "Reservation Submitted",

              "Your reservation request has been sent for approval."

          );

          setCourseTitle("");
          setAudienceType("");

          setCourse("");
          setYearSectionGroup("");

          setOrganization("");

          setOtherAudience("");
          setPurpose("");
          setDate("");
          setStartTime("");
          setEndTime("");
          setSelectedRoom(null);
          setRooms([]);

      }

      catch(err){

          console.error(err);

          showToast(

              "error",

              "Firestore Error",

              err.message

          );

      }

  };
  
    return (
    <>
      <div className="container">

        <div className="faculty-submit-header">
          <h1>Reservation Request</h1>
          <p>
            Submit a reservation request for approval.
          </p>
        </div>

        <div className="faculty-submit-box">

          <div className="faculty-submit-sections">

            {/* LEFT SIDE */}

            <div className="faculty-submit-section">

            {/* COURSE TITLE */}

            <div className="faculty-submit-form-group">
              <label>Course Title</label>

              <input
                className="faculty-submit-input"
                placeholder="Enter course title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
              />
            </div>

            {/* AUDIENCE */}
            <div className="faculty-submit-form-group">
              <label>Audience Type</label>

              <div className="faculty-submit-dropdown-wrapper">
                <select
                  className="faculty-submit-input faculty-submit-dropdown"
                  value={audienceType}
                  onChange={(e) => {
                    setAudienceType(e.target.value);

                    setCourse("");
                    setYearSectionGroup("");
                    setOrganization("");
                    setOtherAudience("");
                  }}
                >
                  <option value="">Select Audience</option>
                  <option value="Class">Class</option>
                  <option value="Organization">Organization</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Others">Others</option>
                </select>

                <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>
              </div>
              {audienceType === "Class" && (
                  <>
                    <div className="faculty-submit-form-group">
                      <label>Course</label>

                      <input
                        className="faculty-submit-input"
                        placeholder="BSIT"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                      />
                    </div>

                    <div className="faculty-submit-form-group">
                      <label>Year / Section Group</label>

                      <input
                        className="faculty-submit-input"
                        placeholder="Ex. 3F-G2"
                        value={yearSectionGroup}
                        onChange={(e) => setYearSectionGroup(e.target.value)}
                      />
                    </div>
                  </>
                )}
                {audienceType === "Organization" && (
                  <div className="faculty-submit-form-group">
                    <label>Organization Name</label>

                    <input
                      className="faculty-submit-input"
                      placeholder="Computer Society"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                  </div>
                )}
                {audienceType === "Faculty" && (
                  <div className="faculty-submit-form-group">
                    <label>Faculty Group</label>

                    <input
                      className="faculty-submit-input"
                      value="Faculty Members"
                      readOnly
                    />
                  </div>
                )}
                {audienceType === "Others" && (
                  <div className="faculty-submit-form-group">
                    <label>Describe Attendees</label>

                    <input
                      className="faculty-submit-input"
                      placeholder="Seminar Participants"
                      value={otherAudience}
                      onChange={(e) => setOtherAudience(e.target.value)}
                    />
                  </div>
                )}

            </div>

            {/* DATE */}

            <div className="faculty-submit-form-group">

              <label>Date</label>

              <div className="faculty-submit-icon-wrapper">

                <i
                  className="fa-regular fa-calendar faculty-submit-icon"
                  onClick={() =>
                    document
                      .getElementById("date-input")
                      .showPicker()
                  }
                ></i>

                <input
                    id="date-input"
                    type="date"
                    className="faculty-submit-input"
                    min={new Date().toISOString().split("T")[0]}
                    value={date}
                    onChange={(e)=>setDate(e.target.value)}
                />

              </div>

            </div>

            {/* TIME */}

            <div className="faculty-submit-time-fields">

              <div className="faculty-submit-form-group">

                <label>Start Time</label>

                <div className="faculty-submit-time-wrapper">

                  <i
                    className="fa-regular fa-clock faculty-submit-time-icon"
                    onClick={() =>
                      document
                        .getElementById("start-input")
                        .showPicker()
                    }
                  ></i>

                  <input
                      id="start-input"
                      type="time"
                      className="faculty-submit-input faculty-submit-time-input"
                      min="07:00"
                      max="20:00"
                      value={startTime}
                      onChange={(e)=>setStartTime(e.target.value)}
                  />

                </div>

              </div>

              <div className="faculty-submit-form-group">

                <label>End Time</label>

                <div className="faculty-submit-time-wrapper">

                  <i
                    className="fa-regular fa-clock faculty-submit-time-icon"
                    onClick={() =>
                      document
                        .getElementById("end-input")
                        .showPicker()
                    }
                  ></i>

                  <input
                      id="end-input"
                      type="time"
                      className="faculty-submit-input faculty-submit-time-input"
                      min="07:00"
                      max="20:00"
                      value={endTime}
                      onChange={(e)=>setEndTime(e.target.value)}
                  />

                </div>

              </div>

            </div>

            {/* PURPOSE */}

            <div className="faculty-submit-form-group">

              <label>Purpose of Reservation</label>

              <div className="faculty-submit-dropdown-wrapper">

                <select
                  className="faculty-submit-input faculty-submit-dropdown"
                  value={purpose}
                  onChange={(e) => {

                    setPurpose(e.target.value);

                    setSelectedEquipment([]);
                    setStudentRange("");

                  }}
                >

                  <option value="">
                    Select Purpose
                  </option>

                  <option value="Lecture">
                    Lecture
                  </option>

                  <option value="Hands-on">
                    Hands-on
                  </option>

                  <option value="Examination">
                    Examination
                  </option>

                </select>

                <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>

              </div>

            </div>

            {/* HANDS ON */}

            {purpose === "Hands-on" && (
              <div className="faculty-submit-form-group">
                <label>Required Equipment</label>

                <div className="equipment-grid">
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`equipment-card ${
                        selectedEquipment.includes(item.id) ? "selected" : ""
                      }`}
                      onClick={() => toggleEquipment(item.id)}
                    >
                      <span className="equipment-icon">
                        {item.icon}
                      </span>

                      <span className="equipment-name">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LECTURE / EXAM */}

            {(purpose === "Lecture" ||
              purpose === "Examination") && (

              <div className="faculty-submit-form-group">

                <label>
                  Estimated Number of Students
                </label>

                <div className="faculty-submit-dropdown-wrapper">

                  <select
                    className="faculty-submit-input faculty-submit-dropdown"
                    value={studentRange}
                    onChange={(e) =>
                      setStudentRange(e.target.value)
                    }
                  >

                    <option value="">
                      Select Range
                    </option>

                    <option value="30-50">
                      30 - 50 Students
                    </option>

                    <option value="50-60">
                      50 - 60 Students
                    </option>

                    <option value="60-80">
                      60 - 80 Students
                    </option>

                    <option value="80-100">
                      80 - 100 Students
                    </option>

                  </select>

                  <i className="fa-solid fa-angle-down faculty-submit-dropdown-icon"></i>

                </div>

              </div>

            )}

          </div>

            {/* RIGHT SIDE */}

            <div className="faculty-submit-section">

              <div className="faculty-submit-venue-header">

                <span className="faculty-submit-venue-title">

                  Available Rooms

                </span>

                <div className="faculty-submit-venue-dropdown-wrapper">

                  <select
                    className="faculty-submit-venue-dropdown"
                    value={selectedFloor}
                    onChange={(e)=>
                      setSelectedFloor(e.target.value)
                    }
                  >

                    <option value="">
                      All Floors
                    </option>

                    <option value="1st">
                      1st Floor
                    </option>

                    <option value="3rd">
                      3rd Floor
                    </option>

                    <option value="4th">
                      4th Floor
                    </option>

                  </select>

                  <i className="fa-solid fa-angle-down faculty-submit-venue-dropdown-icon"></i>

                </div>

              </div>

              {loading ? (

                <div className="faculty-loading">
                  Loading available rooms...
                </div>

              ) : !date || !startTime || !endTime ? (

                <div className="faculty-empty">
                  <i className="fa-regular fa-calendar"></i>
                  <p>Select a date and reservation time first.</p>
                </div>

              ) : rooms.length === 0 ? (

                <div className="faculty-empty">
                  <i className="fa-solid fa-circle-xmark"></i>
                  <p>
                    No rooms match your selected schedule, 
                    purpose,equipment, capacity, or floor.
                  </p>
                </div>

              ) : (

                <div className="room-grid">

                  {rooms.map(room=>(

                    <div

                      key={room.id}

                      className={`
                        room-card
                        ${room.available ? "available":"occupied"}
                        ${
                          selectedRoom?.id===room.id
                          ? "selected"
                          :""
                        }
                      `}

                      onClick={()=>{

                        if(!room.available)
                          return;

                        setSelectedRoom(room);

                      }}

                    >

                      <div className="room-name">
                          <i className="fa-solid fa-door-open"></i>{" "}
                          {room.roomName}
                      </div>

                      <div className="room-floor">
                          <i className="fa-solid fa-building"></i>{" "}
                          {room.floor} Floor
                      </div>

                      {room.capacity && (
                          <div className="room-floor">
                              <i className="fa-solid fa-users"></i>{" "}
                              {room.capacity} Seats
                          </div>
                      )}

                      <div className="room-status">
                          <i
                              className={`fa-solid ${
                                  room.available
                                      ? "fa-circle-check"
                                      : "fa-circle-xmark"
                              }`}
                          ></i>{" "}
                          {room.available
                              ? "Available"
                              : "Occupied"}
                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        </div>

        <div className="faculty-submit-footer">

          <button
            className="faculty-submit-back-btn"
            onClick={()=>window.history.back()}
          >

            Back

          </button>

          <button
            className="faculty-submit-confirm-btn"
            onClick={()=>{

              const err=validate();

              if(err){

                showToast(
                  "error",
                  "Validation Error",
                  err
                );

                return;

              }

              setShowConfirm(true);

            }}
          >

            Submit Request

          </button>

        </div>

        {showConfirm && (

          <div className="ra-modal-overlay">

            <div className="ra-modal">

              <h3>

                Submit Reservation Request?

              </h3>

              <p>

                Your reservation will be sent
                for approval.

              </p>

              <div
                style={{
                  display:"flex",
                  gap:"10px",
                  justifyContent:"center",
                  marginTop:"20px"
                }}
              >

                <button
                  className="ra-modal-cancel"
                  onClick={()=>
                    setShowConfirm(false)
                  }
                >

                  Cancel

                </button>

                <button
                  className="ra-modal-confirm"
                  onClick={handleSubmit}
                >

                  Confirm

                </button>

              </div>

            </div>

          </div>

        )}

        <Toast
          show={toast.show}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={()=>
            setToast(prev=>({
              ...prev,
              show:false
            }))
          }
        />

      </div>
    </>
  );
}

export default FacultySubmitReservation;