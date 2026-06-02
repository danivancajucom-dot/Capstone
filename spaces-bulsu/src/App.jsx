import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Local Registrar
import LocalRegistrarLayout from "./LocalRegistrar/LocalRegistrarLayout/LocalRegistrarLayout";
import LocalRegistrarViewAcademicSchedule from "./LocalRegistrar/LocalRegistrarViewAcademicSchedule/LocalRegistrarViewAcademicSchedule";
import LocalRegistrarViewRoomCard from "./LocalRegistrar/LocalRegistrarViewAcademicSchedule/LocalRegistrarViewRoomCard";
import LocalRegistrarQRCode from "./LocalRegistrar/LocalRegistrarQRCode/LocalRegistrarQRCode";
import LocalRegistrarActivityLog from "./LocalRegistrar/LocalRegistrarActivityLog/LocalRegistrarActivityLog";
import BulkScheduleUpload1 from "./LocalRegistrar/LocalRegistrarBulkUpload/bulkUpload1/BulkScheduleUpload1";
import BulkScheduleUpload2 from "./LocalRegistrar/LocalRegistrarBulkUpload/bulkUpload2/BulkScheduleUpload2";
import BulkScheduleUpload3 from "./LocalRegistrar/LocalRegistrarBulkUpload/bulkUpload3/BulkScheduleUpload3";
import BulkScheduleUpload4 from "./LocalRegistrar/LocalRegistrarBulkUpload/bulkUpload4/BulkScheduleUpload4";
import MySubmittedSchedules from "./LocalRegistrar/LocalRegistrarMySubmittedSchedules/MySubmittedSchedules";
import LocalRegistrarDashboard from "./LocalRegistrar/LocalRegistrarDashboard/LocalRegistrarDashboard";
//Nav
import LoginNav from "./Components/LoginNav/LoginNav";
import ClerkNav from "./Components/ClerkNav/ClerkNav";
import DepartmentHeadNav from "./Components/DepartmentHeadNav/DepartmentHeadNav";
import FacultyNav from "./Components/FacultyNav/FacultyNav";
import LocalRegistrarNav from "./Components/LocalRegistrarNav/LocalRegistrarNav";

// Department Head
import DepartmentHeadConflicts from "./DepartmentHead/DepartmentHeadConflicts/DepartmentHeadConflicts";
import DepartmentHeadReassignRoom from "./DepartmentHead/DepartmentHeadConflicts/DepartmentHeadReassignRoom";
import DepartmentHeadReservations from "./DepartmentHead/DepartmentHeadReservations/DepartmentHeadReservations";
import DepartmentHeadViewReservation from "./DepartmentHead/DepartmentHeadReservations/DepartmentHeadViewReservation";
import DepartmentHeadViewReservationApproved from "./DepartmentHead/DepartmentHeadReservations/DepartmentHeadViewReservationApproved";
import DepartmentHeadEditApprovedReservation from "./DepartmentHead/DepartmentHeadReservations/DepartmentHeadEditApprovedReservation";
import DepartmentHeadViewReservationDenied from "./DepartmentHead/DepartmentHeadReservations/DepartmentHeadViewReservationDenied";
import DepartmentHeadSchedule from "./DepartmentHead/DepartmentHeadSchedule/DepartmentHeadSchedule";
import DepartmentHeadRoomManagement from "./DepartmentHead/DepartmentHeadRoomManagement/RoomManagementView";
import RoomActivity from "./DepartmentHead/DepartmentHeadRoomActivity/RoomActivity";
import UserManagement from "./DepartmentHead/DepartmentHeadUserManagement/UserManagement";
import NotificationManagement from "./DepartmentHead/HeadDepartmentNotificationManagement/NotificationManagement";

// Clerk
import ClerkLayout from "./Clerk/ClerkLayout/ClerkLayout";
import ClerkDashboard from "./Clerk/ClerkDashboard/ClerkDashboard";
import ClerkSchedule from "./Clerk/ClerkSchedule/ClerkSchedule";
import ClerkOnlineReservations from "./Clerk/ClerkOnlineReservations/ClerkOnlineReservations";
import ClerkViewReservation from "./Clerk/ClerkOnlineReservations/ClerkViewReservation";
import ClerkViewReservationApproved from "./Clerk/ClerkOnlineReservations/ClerkViewReservationApproved";
import ClerkEditApprovedReservation from "./Clerk/ClerkOnlineReservations/ClerkEditApprovedReservation";
import ClerkViewReservationDenied from "./Clerk/ClerkOnlineReservations/ClerkViewReservationDenied";
import WalkInReservation from "./Clerk/ClerkWalkInReservation/WalkInReservation";
import ReleasedRooms from "./Clerk/ClerkReleasedRooms/ReleasedRooms";
import RoomDetails from "./Clerk/ClerkRoomDetails/RoomDetails";

//Faculty
import FacultyLayout from "./Faculty/FacultyLayout/FacultyLayout";
import FacultyDashboard from "./Faculty/FacultyDashboard/FacultyDashboard";
import FacultyNotification from "./Faculty/FacultyNotification/FacultyNotification";
import FacultyProfile from "./Faculty/FacultyProfile/FacultyProfile";
import FacultyReservations from "./Faculty/FacultyReservations/FacultyReservations";
import FacultyEditPendingReservations from "./Faculty/FacultyReservations/FacultyEditPendingReservation";
import FacultySubmitReservation from "./Faculty/FacultyReservations/FacultySubmitReservation";
import FacultyViewApprovedReservation from "./Faculty/FacultyReservations/FacultyViewApprovedReservation";
import FacultyViewPendingReservation from "./Faculty/FacultyReservations/FacultyViewPendingReservation";
import FacultyRoom from "./Faculty/FacultyRoom/FacultyRoom";
import FacultySchedule from "./Faculty/FacultySchedule/FacultySchedule";
//Login
import Login from "./Login/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Components */}
        <Route path="/login-nav" element={<LoginNav activePage="login" onSignIn={() => {}} onChangePage={() => {}} onLogout={() => {}} />} />
        <Route path="/clerk-nav" element={<ClerkNav activePage="login" />} />
        <Route path="/department-head-nav" element={<DepartmentHeadNav activePage="login" />} />
        <Route path="/faculty-nav" element={<FacultyNav activePage="login" />} />
        <Route path="/local-registrar-nav" element={<LocalRegistrarNav activePage="login" onNotification={() => {}} onLogout={() => {}} />} />

        {/* Department Head */}
        <Route path="/conflicts" element={<DepartmentHeadConflicts />} />
        <Route path="/reassign-room" element={<DepartmentHeadReassignRoom />} />
        <Route path="/dept-reservations" element={<DepartmentHeadReservations />} />
        <Route path="/dept-view-reservation" element={<DepartmentHeadViewReservation />} />
        <Route path="/dept-view-reservation-approved" element={<DepartmentHeadViewReservationApproved />} />
        <Route path="/dept-edit-approved-reservation" element={<DepartmentHeadEditApprovedReservation />} />
        <Route path="/dept-view-reservation-denied" element={<DepartmentHeadViewReservationDenied/>} />
        <Route path="/dept-schedule" element={<DepartmentHeadSchedule />} />
        <Route path="/dept-room-management" element={<DepartmentHeadRoomManagement />} />
        <Route path="/room-activity" element={<RoomActivity />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/notification-management" element={<NotificationManagement />} />

        {/* Local Registrar */}
        <Route path="/local-registrar" element={<LocalRegistrarLayout />}>
          <Route index element={<LocalRegistrarDashboard />}/>
          <Route path="academic-schedule" element={<LocalRegistrarViewAcademicSchedule />}/>
          <Route path="room-card" element={<LocalRegistrarViewRoomCard />}/>
          <Route path="qr-code" element={<LocalRegistrarQRCode />}/>
          <Route path="activity-log" element={<LocalRegistrarActivityLog />}/>
          <Route path="my-submitted-schedules" element={<MySubmittedSchedules />}/>
          <Route path="bulk-upload-1" element={<BulkScheduleUpload1 />}/>
          <Route path="bulk-upload-2" element={<BulkScheduleUpload2 />}/>
          <Route path="bulk-upload-3" element={<BulkScheduleUpload3 />}/>
          <Route path="bulk-upload-4" element={<BulkScheduleUpload4 />}/>
        </Route>
       
        {/* Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Clerk */}
        <Route path="/clerk" element={<ClerkLayout />} >
          <Route index element={<ClerkDashboard />}/>
          <Route path="schedule" element={<ClerkSchedule />} />
          <Route path="online-reservations" element={<ClerkOnlineReservations />} />
          <Route path="view-online-reservation" element={<ClerkViewReservation />} />
          <Route path="view-reservation-approved" element={<ClerkViewReservationApproved />} />
          <Route path="view-reservation-denied" element={<ClerkViewReservationDenied />} />
          <Route path="edit-approved-reservation" element={<ClerkEditApprovedReservation />} />
          <Route path="walk-in-reservation" element={<WalkInReservation />} />
          <Route path="released-rooms" element={<ReleasedRooms />} />
          <Route path="room-details" element={<RoomDetails />} />
        </Route>
        {/* Faculty */}
        <Route path="/faculty" element={<FacultyLayout />}>
          <Route index element={<FacultyDashboard />}/>
          <Route path="schedule" element={<FacultySchedule />}/>
          <Route path="rooms" element={<FacultyRoom />}/>
          <Route path="reservations" element={<FacultyReservations />} />
          <Route path="profile" element={<FacultyProfile />}/>
          <Route path="notifications" element={<FacultyNotification />}/>
          <Route path="submit-reservation" element={<FacultySubmitReservation />} />
          <Route path="view-approved-reservations" element={<FacultyViewApprovedReservation />} />
          <Route path="view-pending-reservation" element={<FacultyViewPendingReservation />}/>
          <Route path="edit-pending-reservation" element={<FacultyEditPendingReservations />}/>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />}/>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
