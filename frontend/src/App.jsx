
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
import Footer from "./components/Footer";
import Loader from "./components/Loader";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("home");
  const [authEmail, setAuthEmail] = useState("");

  // Campaign opened from the notification bell (public booking, no login)
  const [activeCampaign, setActiveCampaign] = useState(null);

  // Shared context for worker dose logging and citizen recovery booking.
  const [appointmentForDose, setAppointmentForDose] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Clear authentication and shared appointment context.
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");

    setCurrentUser(null);
    setAppointmentForDose(null);
    setPage("home");
  };

  // Open booking with the selected missed-dose record.
  const handleBookRecovery = (recovery) => {
    if (!recovery?._id) {
      console.error("Invalid recovery record.");
      return;
    }

    setAppointmentForDose(recovery);
    setPage("bookAppointment");
  };

  // Normal appointment booking must not reuse an old recovery record.
  const handleOpenAppointments = () => {
    setAppointmentForDose(null);
    setPage("bookAppointment");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
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
          {/* Home */}
          {page === "home" && (
            <Home
              onGetStarted={() => setPage("register")}
              onLogin={() => setPage("login")}
            />
          )}

          {/* About */}
          {page === "about" && (
            <About
              onGetStarted={() => setPage("register")}
              onServices={() => setPage("services")}
            />
          )}

          {/* Services */}
          {page === "services" && (
            <Services
              onGetStarted={() => setPage("register")}
              onVerify={() => setPage("verifyCertificate")}
            />
          )}

          {/* Register, Login, Email Verification, Forgot Password */}
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
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-10 mb-10">
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

          {/* Clinic Admin Dashboard */}
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

          {/* Admin Dashboard */}
          {page === "dashboard" && (
            <AdminDashboard
              onAddClinic={() => setPage("addClinic")}
              onManageVaccines={() => setPage("addVaccine")}
              onManageSchedules={() => setPage("addVaccineSchedule")}
              onManageCampaigns={() => setPage("addCampaign")}
            />
          )}

          {/* Citizen Dashboard: T9.4 integration */}
          {page === "citizenDashboard" && (
            <CitizenDashboard
              onEditProfile={() => setPage("editProfile")}
              onFamilyAccount={() => setPage("familyAccount")}
              onAppointments={handleOpenAppointments}
              onCertificate={() => setPage("myCertificate")}
              onVaccinations={() => setPage("myVaccinations")}
              onFeedback={() => setPage("feedback")}
              onInHouseVisit={() => setPage("requestInHouseVisit")}
              onMyInHouseRequests={() => setPage("myInHouseRequests")}

              // pass selected recovery to appointment booking.
              onBookRecovery={handleBookRecovery}

              onLogout={handleLogout}
            />
          )}

          {/* Edit Profile */}
          {page === "editProfile" && (
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

          {/* Feedback */}
          {page === "feedback" && (
            <Feedback
              onBack={() => setPage("citizenDashboard")}
            />
          )}

          {/* Family Account */}
          {page === "familyAccount" && (
            <FamilyAccount
              onBack={() => setPage("citizenDashboard")}
              onLogout={handleLogout}
            />
          )}

          {/* In-house Visit */}
          {page === "requestInHouseVisit" && (
            <RequestInHouseVisit
              onBack={() => setPage("citizenDashboard")}
            />
          )}

          {page === "myInHouseRequests" && (
            <MyInHouseRequests
              onBack={() => setPage("citizenDashboard")}
            />
          )}

          {/* Public Certificate Verifier */}
          {page === "verifyCertificate" && <Verify />}

          {/* My Certificate */}
          {page === "myCertificate" && (
            <MyCertificate
              onBack={() => setPage("citizenDashboard")}
              onOpenFeedback={() => setPage("feedback")}
            />
          )}

          {/* My Vaccination Record */}
          {page === "myVaccinations" && (
            <MyVaccinationRecord
              onDashboard={() => setPage("citizenDashboard")}
              onAppointments={handleOpenAppointments}
              onCertificate={() => setPage("myCertificate")}
              onFamilyAccount={() => setPage("familyAccount")}
              onLogout={handleLogout}
            />
          )}

          {/* Book Appointment: T9.4 recoveryContext integration */}
          {page === "bookAppointment" && (
            <BookAppointment
              recoveryContext={appointmentForDose}
              onBack={() => {
                setAppointmentForDose(null);
                setPage("citizenDashboard");
              }}
              onLogout={handleLogout}
            />
          )}

          {/* Worker Dashboard */}
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

          {/* Worker Appointments */}
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

          {/* Show Work */}
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

          {/* Log Dose */}
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

          {/* Add Clinic */}
          {page === "addClinic" && (
            <AddClinic
              onBack={() => setPage("dashboard")}
              onClinicCreated={() => setPage("dashboard")}
            />
          )}

          {/* Add Vaccine */}
          {page === "addVaccine" && (
            <VaccineInsert
              onBack={() => setPage("dashboard")}
              onVaccineCreated={() => setPage("dashboard")}
            />
          )}

          {/* Vaccine Schedule */}
          {page === "addVaccineSchedule" && (
            <VaccineScheduleInsert
              onBack={() => setPage("dashboard")}
            />
          )}

          {/* Public campaign booking - no login needed */}
          {page === "campaignBooking" && (
            <CampaignBooking
              campaign={activeCampaign}
              onBack={() => setPage("home")}
              onGetCertificate={() => setPage("guestCertificate")}
            />
          )}

          {/* Public: guest certificate access (Appointment ID + email OTP) */}
          {page === "guestCertificate" && (
            <GuestCertificate
              onBack={() => setPage("home")}
              onRegister={() => setPage("register")}
            />
          )}

          {/* Worker: campaign guest check-in (ID check -> dose -> certificate) */}
          {page === "guestCheckIn" && (
            <GuestCheckIn onBack={() => setPage("workerDashboard")} />
          )}

          {/* Publish campaign (admin) */}
          {page === "addCampaign" && (
            <AddCampaign onBack={() => setPage("dashboard")} />
          )}

          {/* Add Worker */}
          {page === "addWorker" && (
            <AddWorker
              onBack={() => setPage("clinicDashboard")}
              onWorkerCreated={() => setPage("workerList")}
            />
          )}

          {/* Clinic Worker Management */}
          {page === "workerList" && (
            <WorkerList
              onBack={() => setPage("clinicDashboard")}
              onAddWorker={() => setPage("addWorker")}
            />
          )}

          {/* Vaccine Inventory */}
          {page === "inventory" && (
            <VaccineInventory
              onBack={() => setPage("clinicDashboard")}
            />
          )}

          {/* Clinic Feedback */}
          {page === "clinicFeedback" && (
            <ClinicFeedback
              onBack={() => setPage("clinicDashboard")}
              onWorkers={() => setPage("addWorker")}
              onDailyDuties={() => setPage("assignDuty")}
              onInventory={() => setPage("inventory")}
              onFeedback={() => setPage("clinicFeedback")}
            />
          )}

          {/* Assign Duty */}
          {page === "assignDuty" && (
            <AssignDuty
              onBack={() => setPage("clinicDashboard")}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      {page !== "dashboard" &&
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
        page !== "workerAppointments" && (
          <Footer />
        )}
    </div>
  );
}

export default App;
