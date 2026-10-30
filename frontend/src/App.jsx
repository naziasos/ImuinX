
import AddWorker from "./pages/AddWorker.jsx";
import WorkerList from "./pages/clinicAdmin/WorkerList.jsx";
import BookAppointment from "./pages/citizen/BookAppointment";
import About from "./pages/About";
import Services from "./pages/Services";

import { useCallback, useState } from "react";

import Feedback from "./pages/citizen/Feedback";
import ClinicFeedback from "./pages/clinicAdmin/ClinicFeedback";
import Home from "./pages/Home";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import CreateAdmin from "./pages/CreateAdmin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AddClinic from "./pages/admin/AddClinic";
import ForgotPassword from "./pages/ForgotPassword";
import ClinicAdminDashboard from "./pages/clinicAdmin/ClinicAdminDashboard";
import AssignDuty from "./pages/clinicAdmin/AssignDuty";
import CitizenDashboard from "./pages/citizen/CitizenDashboard";
import WorkerDashboard from "./pages/worker/WorkerDashboard";
import LogDose from "./pages/worker/LogDose";
import ShowWork from "./pages/worker/ShowWork";
import WorkerAppointments from "./pages/worker/WorkerAppointments";
import VaccineInventory from "./pages/VaccineInventory";
import FamilyAccount from "./pages/citizen/FamilyAccount";
import EditProfile from "./pages/citizen/EditProfile";
import MyCertificate from "./pages/citizen/MyCertificate";
import NearbyClinics from "./pages/citizen/NearbyClinics";
import MyVaccinationRecord from "./pages/citizen/MyVaccinationRecord";
import Verify from "./pages/Verify";

import RequestInHouseVisit from "./pages/citizen/RequestInHouseVisit";
import MyInHouseRequests from "./pages/citizen/MyInHouseRequests";

import VaccineInsert from "./pages/admin/VaccineInsert";
import VaccineScheduleInsert from "./pages/admin/VaccineScheduleInsert";
import AddCampaign from "./pages/admin/AddCampaign";
import CampaignBooking from "./pages/CampaignBooking";
import GuestCertificate from "./pages/GuestCertificate";
import GuestCheckIn from "./pages/worker/GuestCheckIn";

import Navbar from "./components/Navbar";
import StaffShell from "./components/StaffShell";
import CitizenLayout from "./components/CitizenLayout";
import Footer from "./components/Footer";
import Loader from "./components/Loader";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("home");
  const [authEmail, setAuthEmail] = useState("");

  const [activeCampaign, setActiveCampaign] = useState(null);
  const [appointmentForDose, setAppointmentForDose] = useState(null);
  const [bookingClinicId, setBookingClinicId] = useState("");

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");

    setCurrentUser(null);
    setAppointmentForDose(null);
    setBookingClinicId("");
    setPage("home");
  };

  const handleBookRecovery = (recovery) => {
    if (!recovery?._id) {
      console.error("Invalid recovery record.");
      return;
    }

    setAppointmentForDose(recovery);
    setBookingClinicId("");
    setPage("bookAppointment");
  };

  const handleOpenAppointments = () => {
    setAppointmentForDose(null);
    setBookingClinicId("");
    setPage("bookAppointment");
  };

  const handleBookNearbyClinic = (clinic) => {
    setAppointmentForDose(null);
    setBookingClinicId(clinic?.id || "");
    setPage("bookAppointment");
  };

  const CITIZEN_PAGES = [
    "citizenDashboard",
    "myVaccinations",
    "nearbyClinics",
    "bookAppointment",
    "myCertificate",
    "familyAccount",
    "requestInHouseVisit",
    "myInHouseRequests",
    "feedback",
  ];

  const isCitizenRole =
    !!currentUser &&
    ![
      "admin",
      "clinicAdmin",
      "clinic_admin",
      "worker",
    ].includes(currentUser.role);

  const isClinicAdminRole =
    currentUser?.role === "clinicAdmin" ||
    currentUser?.role === "clinic_admin";

  const isCitizenArea =
    CITIZEN_PAGES.includes(page) ||
    (page === "editProfile" && isCitizenRole);

  const handleCitizenNavigate = (target) => {
    if (target === "bookAppointment") {
      handleOpenAppointments();
      return;
    }

    setPage(target);
  };

  const handleStaffNavigate = (target) => {
    if (target === "logDose") {
      setAppointmentForDose(null);
    }

    setPage(target);
  };

  return (
    <div className="app-shell min-h-screen flex flex-col">
      {showSplash && <Loader onDone={handleSplashDone} />}

      <Navbar
        page={page}
        setPage={setPage}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenCampaign={(campaign) => {
          setActiveCampaign(campaign);
          setPage("campaignBooking");
        }}
      />

      <main className="flex-1">
        <div className="w-full">
          {page === "home" && (
            <Home
              onGetStarted={() => setPage("register")}
              onLogin={() => setPage("login")}
            />
          )}

          {page === "about" && (
            <About
              onGetStarted={() => setPage("register")}
              onServices={() => setPage("services")}
            />
          )}

          {page === "services" && (
            <Services
              onGetStarted={() => setPage("register")}
              onVerify={() => setPage("verifyCertificate")}
            />
          )}

          {page !== "home" &&
            page !== "about" &&
            page !== "services" &&
            page !== "dashboard" &&
            page !== "clinicDashboard" &&
            page !== "citizenDashboard" &&
            page !== "workerDashboard" &&
            page !== "logDose" &&
            page !== "familyAccount" &&
            page !== "editProfile" &&
            page !== "bookAppointment" &&
            page !== "nearbyClinics" &&
            page !== "myCertificate" &&
            page !== "myVaccinations" &&
            page !== "verifyCertificate" &&
            page !== "showWork" &&
            page !== "feedback" &&
            page !== "clinicFeedback" &&
            page !== "workerList" &&
            page !== "requestInHouseVisit" &&
            page !== "myInHouseRequests" &&
            page !== "workerAppointments" &&
            page !== "addClinic" &&
            page !== "addVaccine" &&
            page !== "addVaccineSchedule" &&
            page !== "addCampaign" &&
            page !== "campaignBooking" &&
            page !== "guestCertificate" &&
            page !== "guestCheckIn" &&
            page !== "addWorker" &&
            page !== "inventory" &&
            page !== "assignDuty" && (
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-10 mb-10 theme-surface">
                {page === "register" && (
                  <Register
                    onRegisterSuccess={(email) => {
                      setAuthEmail(email);
                      setPage("verify");
                    }}
                    onLoginClick={() => setPage("login")}
                  />
                )}

                {page === "verify" && (
                  <VerifyEmail
                    email={authEmail}
                    onVerifySuccess={() => setPage("login")}
                  />
                )}

                {page === "login" && (
                  <Login
                    onLoginSuccess={(user) => {
                      setCurrentUser(user);

                      if (
                        user?.language === "bn" ||
                        user?.language === "en"
                      ) {
                        localStorage.setItem(
                          "imunixLanguage",
                          user.language
                        );

                        window.dispatchEvent(
                          new CustomEvent("imunix-user-updated", {
                            detail: user,
                          })
                        );
                      }

                      if (user.role === "admin") {
                        setPage("dashboard");
                      } else if (
                        user.role === "clinicAdmin" ||
                        user.role === "clinic_admin"
                      ) {
                        setPage("clinicDashboard");
                      } else if (user.role === "worker") {
                        setPage("workerDashboard");
                      } else {
                        setPage("citizenDashboard");
                      }
                    }}
                    onBack={() => setPage("register")}
                    onSignUp={() => setPage("register")}
                    onForgotPassword={() => setPage("forgotPassword")}
                  />
                )}

                {page === "forgotPassword" && (
                  <ForgotPassword
                    onBack={() => setPage("login")}
                    onSuccess={() => setPage("login")}
                  />
                )}

                {page === "admin" && <CreateAdmin />}
              </div>
            )}

          {page === "clinicDashboard" && (
            <ClinicAdminDashboard
              onAddWorker={() => setPage("addWorker")}
              onWorkers={() => setPage("workerList")}
              onAssignDuty={() => setPage("assignDuty")}
              onOpenInventory={() => setPage("inventory")}
              onFeedback={() => setPage("clinicFeedback")}
              onEditProfile={() => setPage("editProfile")}
              onLogout={handleLogout}
            />
          )}

          {page === "dashboard" && (
            <AdminDashboard
              onAddClinic={() => setPage("addClinic")}
              onManageVaccines={() => setPage("addVaccine")}
              onManageSchedules={() => setPage("addVaccineSchedule")}
              onManageCampaigns={() => setPage("addCampaign")}
            />
          )}

          {page === "verifyCertificate" && <Verify />}

          {page === "editProfile" && isClinicAdminRole && (
            <StaffShell
              role="clinicAdmin"
              activeKey="editProfile"
              user={currentUser}
              onNavigate={handleStaffNavigate}
              onLogout={handleLogout}
            >
              <EditProfile />
            </StaffShell>
          )}

          {page === "editProfile" && !isCitizenRole && !isClinicAdminRole && (
            <EditProfile
              onBack={() => {
                if (
                  currentUser?.role === "clinicAdmin" ||
                  currentUser?.role === "clinic_admin"
                ) {
                  setPage("clinicDashboard");
                } else if (currentUser?.role === "worker") {
                  setPage("workerDashboard");
                } else {
                  setPage("citizenDashboard");
                }
              }}
            />
          )}

          {isCitizenArea && (
            <CitizenLayout
              page={page}
              onNavigate={handleCitizenNavigate}
              onLogout={handleLogout}
            >
              {page === "citizenDashboard" && (
                <CitizenDashboard
                  onEditProfile={() => setPage("editProfile")}
                  onFamilyAccount={() => setPage("familyAccount")}
                  onAppointments={handleOpenAppointments}
                  onNearbyClinics={() => setPage("nearbyClinics")}
                  onCertificate={() => setPage("myCertificate")}
                  onVaccinations={() => setPage("myVaccinations")}
                  onFeedback={() => setPage("feedback")}
                  onInHouseVisit={() => setPage("requestInHouseVisit")}
                  onMyInHouseRequests={() => setPage("myInHouseRequests")}
                  onBookRecovery={handleBookRecovery}
                />
              )}

              {page === "myVaccinations" && (
                <MyVaccinationRecord
                  onAppointments={handleOpenAppointments}
                />
              )}

              {page === "bookAppointment" && (
                <BookAppointment
                  recoveryContext={appointmentForDose}
                  preselectedClinicId={bookingClinicId}
                  onOpenFeedback={() => setPage("feedback")}
                />
              )}

              {page === "nearbyClinics" && (
                <NearbyClinics
                  onBookAppointment={handleBookNearbyClinic}
                />
              )}

              {page === "myCertificate" && (
                <MyCertificate
                  onOpenFeedback={() => setPage("feedback")}
                />
              )}

              {page === "familyAccount" && <FamilyAccount />}

              {page === "requestInHouseVisit" && (
                <RequestInHouseVisit
                  onSuccess={() => setPage("myInHouseRequests")}
                  onOpenFeedback={() => setPage("feedback")}
                />
              )}

              {page === "myInHouseRequests" && (
                <MyInHouseRequests
                  onNewRequest={() => setPage("requestInHouseVisit")}
                />
              )}

              {page === "feedback" && <Feedback />}

              {page === "editProfile" && isCitizenRole && (
                <EditProfile />
              )}
            </CitizenLayout>
          )}

          {page === "workerDashboard" && (
            <WorkerDashboard
              onLogDose={() => {
                setAppointmentForDose(null);
                setPage("logDose");
              }}
              onShowWork={() => setPage("showWork")}
              onAppointments={() => setPage("workerAppointments")}
              onGuestCheckIn={() => setPage("guestCheckIn")}
              onEditProfile={() => setPage("editProfile")}
              onLogout={handleLogout}
            />
          )}

          {page === "workerAppointments" && (
            <WorkerAppointments
              onBack={() => setPage("workerDashboard")}
              onLogDose={(appointment = null) => {
                setAppointmentForDose(appointment);
                setPage("logDose");
              }}
              onShowWork={() => setPage("showWork")}
              onLogout={handleLogout}
            />
          )}

          {page === "showWork" && (
            <ShowWork
              onBack={() => setPage("workerDashboard")}
              onLogDose={(appointment = null) => {
                setAppointmentForDose(appointment);
                setPage("logDose");
              }}
              onAppointments={() => setPage("workerAppointments")}
              onLogout={handleLogout}
            />
          )}

          {page === "logDose" && (
            <LogDose
              appointmentContext={appointmentForDose}
              onBack={() => {
                setAppointmentForDose(null);
                setPage("workerDashboard");
              }}
              onAppointments={() => setPage("workerAppointments")}
              onLogout={handleLogout}
            />
          )}

          
          {page === "addClinic" && (
            <AddClinic
              onBack={() => setPage("dashboard")}
              onClinicCreated={() => setPage("dashboard")}
              onManageVaccines={() => setPage("addVaccine")}
              onManageSchedules={() => setPage("addVaccineSchedule")}
              onManageCampaigns={() => setPage("addCampaign")}
            />
          )}


          {page === "addVaccine" && (
            <StaffShell
              role="admin"
              activeKey="vaccines"
              user={currentUser}
              onNavigate={handleStaffNavigate}
            >
              <VaccineInsert
                onBack={() => setPage("dashboard")}
                onVaccineCreated={() => setPage("dashboard")}
              />
            </StaffShell>
          )}

          {page === "addVaccineSchedule" && (
            <StaffShell
              role="admin"
              activeKey="schedules"
              user={currentUser}
              onNavigate={handleStaffNavigate}
            >
              <VaccineScheduleInsert
                onBack={() => setPage("dashboard")}
              />
            </StaffShell>
          )}

          {page === "campaignBooking" && (
            <CampaignBooking
              campaign={activeCampaign}
              onBack={() => setPage("home")}
              onGetCertificate={() => setPage("guestCertificate")}
            />
          )}

          {page === "guestCertificate" && (
            <GuestCertificate
              onBack={() => setPage("home")}
              onRegister={() => setPage("register")}
            />
          )}

          {page === "guestCheckIn" && (
            <StaffShell
              role="worker"
              activeKey="guestCheckIn"
              user={currentUser}
              onNavigate={handleStaffNavigate}
              onLogout={handleLogout}
            >
              <GuestCheckIn
                onBack={() => setPage("workerDashboard")}
              />
            </StaffShell>
          )}

          {page === "addCampaign" && (
            <StaffShell
              role="admin"
              activeKey="campaigns"
              user={currentUser}
              onNavigate={handleStaffNavigate}
            >
              <AddCampaign
                onBack={() => setPage("dashboard")}
              />
            </StaffShell>
          )}

          {page === "addWorker" && (
            <StaffShell
              role="clinicAdmin"
              activeKey="addWorker"
              user={currentUser}
              onNavigate={handleStaffNavigate}
              onLogout={handleLogout}
            >
              <AddWorker
                onBack={() => setPage("clinicDashboard")}
                onWorkerCreated={() => setPage("workerList")}
              />
            </StaffShell>
          )}

          {page === "workerList" && (
            <StaffShell
              role="clinicAdmin"
              activeKey="workers"
              user={currentUser}
              onNavigate={handleStaffNavigate}
              onLogout={handleLogout}
            >
              <WorkerList
                onBack={() => setPage("clinicDashboard")}
                onAddWorker={() => setPage("addWorker")}
              />
            </StaffShell>
          )}

          {page === "inventory" && (
            <StaffShell
              role="clinicAdmin"
              activeKey="inventory"
              user={currentUser}
              onNavigate={handleStaffNavigate}
              onLogout={handleLogout}
            >
              <VaccineInventory
                onBack={() => setPage("clinicDashboard")}
              />
            </StaffShell>
          )}

          {page === "clinicFeedback" && (
            <StaffShell
              role="clinicAdmin"
              activeKey="feedback"
              user={currentUser}
              onNavigate={handleStaffNavigate}
              onLogout={handleLogout}
            >
              <ClinicFeedback
                onBack={() => setPage("clinicDashboard")}
                onWorkers={() => setPage("addWorker")}
                onDailyDuties={() => setPage("assignDuty")}
                onInventory={() => setPage("inventory")}
                onFeedback={() => setPage("clinicFeedback")}
              />
            </StaffShell>
          )}

          {page === "assignDuty" && (
            <StaffShell
              role="clinicAdmin"
              activeKey="duties"
              user={currentUser}
              onNavigate={handleStaffNavigate}
              onLogout={handleLogout}
            >
              <AssignDuty
                onBack={() => setPage("clinicDashboard")}
              />
            </StaffShell>
          )}
        </div>
      </main>

      {!isCitizenArea &&
      page !== "dashboard" &&
      page !== "clinicDashboard" &&
      page !== "citizenDashboard" &&
      page !== "editProfile" &&
      page !== "workerDashboard" &&
      page !== "logDose" &&
      page !== "bookAppointment" &&
      page !== "myCertificate" &&
      page !== "myVaccinations" &&
      page !== "verifyCertificate" &&
      page !== "showWork" &&
      page !== "feedback" &&
      page !== "clinicFeedback" &&
      page !== "workerAppointments" &&
      page !== "addWorker" &&
      page !== "addClinic" &&
      page !== "addVaccine" &&
      page !== "addVaccineSchedule" &&
      page !== "addCampaign" &&
      page !== "guestCheckIn" &&
      page !== "workerList" &&
      page !== "inventory" &&
      page !== "assignDuty" && <Footer />}
    </div>
  );
}

export default App;
