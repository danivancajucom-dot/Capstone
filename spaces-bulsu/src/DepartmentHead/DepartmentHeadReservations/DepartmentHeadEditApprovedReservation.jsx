import "./department-head-edit-approved-reservation.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import SavePopup from "../../Popup/SavePopup/SavePopup";

function DepartmentHeadEditApprovedReservation() {

  const navigate = useNavigate();

  const [confirmModalType, setConfirmModalType] = useState(null);

  const [formData, setFormData] = useState({
    courseTitle: "Course Title",
    faculty: "Faculty Name",
    section: "Section",
    date: "2026-05-11",
    startTime: "Start Time",
    endTime: "End Time"
  });


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };


  const closeConfirmModal = () => {
    setConfirmModalType(null);
  };


  const handleSaveClick = () => {
    setConfirmModalType("save");
  };


  const handleSaveReservation = () => {

    console.log("Saved reservation:", formData);

    setConfirmModalType(null);

    navigate("/department-head/reservations");
  };



  return (
    <div className="dh-edit-approved-room">


      <div className="white-box-edit-approved">


        <h2 className="dh-edit-approved-title">
          Reservation Details
        </h2>



        <div className="dh-edit-approved-sections">



          {/* LEFT SIDE */}
          <div className="dh-edit-approved-section">


            <div className="dh-edit-approved-section-label">
              <span>General Information</span>
            </div>



            <div className="dh-edit-approved-form-group">

              <label>Course Title</label>

              <input
                type="text"
                name="courseTitle"
                className="dh-edit-approved-form-input"
                value={formData.courseTitle}
                onChange={handleChange}
              />

            </div>




            <div className="dh-edit-approved-form-group">

              <label>Assigned Faculty</label>

              <input
                type="text"
                name="faculty"
                className="dh-edit-approved-form-input"
                value={formData.faculty}
                onChange={handleChange}
              />

            </div>




            <div className="dh-edit-approved-form-group">

              <label>Section</label>

              <input
                type="text"
                name="section"
                className="dh-edit-approved-form-input"
                value={formData.section}
                onChange={handleChange}
              />

            </div>




            <div className="dh-edit-approved-form-group">


              <label>Date</label>


              <div className="dh-edit-approved-input-icon-wrapper">


                <i className="fa-regular fa-calendar dh-edit-approved-input-icon"></i>


                <input
                  type="date"
                  name="date"
                  className="dh-edit-approved-form-input"
                  value={formData.date}
                  onChange={handleChange}
                />


              </div>


            </div>



          </div>





          {/* RIGHT SIDE */}
          <div className="dh-edit-approved-section">


            <div className="dh-edit-approved-section-label">
              <span>Venue & Timing</span>
            </div>




            <div className="dh-edit-approved-venue-header">


              <span className="dh-edit-approved-venue-title">
                Available Room Slots
              </span>



              <div className="dh-edit-approved-dropdown-wrapper-venue">


                <select
                  className="dh-edit-approved-dropdown-venue"
                >

                  <option>Floor</option>
                  <option>1st Floor</option>
                  <option>3rd Floor</option>
                  <option>4th Floor</option>

                </select>


                <i className="fa-solid fa-angle-down dh-edit-approved-dropdown-icon-venue"></i>


              </div>


            </div>






            <div className="dh-edit-approved-time-fields">



              <div className="dh-edit-approved-form-group">

                <label>Start Time</label>

                <input
                  type="text"
                  name="startTime"
                  className="dh-edit-approved-form-input"
                  value={formData.startTime}
                  onChange={handleChange}
                />


              </div>





              <div className="dh-edit-approved-form-group">

                <label>End Time</label>

                <input
                  type="text"
                  name="endTime"
                  className="dh-edit-approved-form-input"
                  value={formData.endTime}
                  onChange={handleChange}
                />


              </div>



            </div>



          </div>


        </div>


      </div>






      <div className="dh-edit-approved-footer">



        <button
          className="dh-edit-approved-back-btn"
          onClick={() => navigate(-1)}
        >
          Back
        </button>




        <button
          className="dh-edit-save-btn"
          onClick={handleSaveClick}
        >
          Save
        </button>



      </div>





      {confirmModalType === "save" && (

        <SavePopup
          onCancel={closeConfirmModal}
          onConfirm={handleSaveReservation}
        />

      )}



    </div>
  );
}


export default DepartmentHeadEditApprovedReservation;