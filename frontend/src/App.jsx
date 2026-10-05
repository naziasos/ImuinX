import AddWorker from "./pages/AddWorker.jsx";
import BookAppointment from "./pages/citizen/BookAppointment";

import { useEffect, useState } from "react";
import Feedback from "./pages/citizen/Feedback";
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
import MyCertificate from "./pages/citizen/MyCertificate";
import MyVaccinationRecord from "./pages/citizen/MyVaccinationRecord";
import Verify from "./pages/Verify";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("home");
  const [authEmail, setAuthEmail] = useState("");

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-blue-600">
            ImuinX
          </h1>

          <p className="text-xl text-slate-500 mt-3">
            Vaccination Management System
          </p>

          <div className="mt-8 flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* Navbar */}
      <Navbar page={page} setPage={setPage} />

      {/* Main Content */}
      <main className="flex-1">
        <div className="w-full">

          {/* Home Page */}
          {page === "home" && (
            <Home
              onGetStarted={() => setPage("register")}
              onLogin={() => setPage("login")}
            />
          )}

          {/* Page Card */}
          {page !== "home" &&
            page !== "dashboard" &&
            page !== "clinicDashboard" &&
            page !== "citizenDashboard" &&
            page !== "workerDashboard" &&
            page !== "logDose" &&
            page !== "familyAccount" &&
            page !== "bookAppointment" &&
            page !== "myCertificate" &&
            page !== "myVaccinations" &&
            page !== "verifyCertificate" &&
            page !== "showWork" &&
            page !== "feedback" && (
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-10 mb-10">

                {/* Register */}
                {page === "register" && (
                  <Register
                    onRegisterSuccess={(email) => {
                      setAuthEmail(email);
                      setPage("verify");
                    }}
                    onLoginClick={() => setPage("login")}
                  />
                )}

                {/* Verify Email */}
                {page === "verify" && (
                  <VerifyEmail
                    email={authEmail}
                    onVerifySuccess={() => setPage("login")}
                  />
                )}

                {/* Login */}
                {page === "login" && (
                  <Login
                    onLoginSuccess={(user) => {
                      setCurrentUser(user);

                      if (user.role === "admin") {
                        setPage("dashboard");
                      } else if (user.role === "clinicAdmin") {
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

                {/* Forgot Password */}
                {page === "forgotPassword" && (
                  <ForgotPassword
                    onBack={() => setPage("login")}
                    onSuccess={() => setPage("login")}
                  />
                )}

                {/* Create Admin */}
                {page === "admin" && <CreateAdmin />}

              </div>
            )}

          {/* Clinic Admin Dashboard */}
          {page === "clinicDashboard" && (
            <ClinicAdminDashboard
              onAddWorker={() => setPage("addWorker")}
              onAssignDuty={() => setPage("assignDuty")}
              onOpenInventory={() => setPage("inventory")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Admin Dashboard */}
          {page === "dashboard" && (
            <AdminDashboard
              onAddClinic={() => setPage("addClinic")}
            />
          )}

          {/* Citizen Dashboard */}
          {page === "citizenDashboard" && (
            <CitizenDashboard
              onFamilyAccount={() => setPage("familyAccount")}
              onAppointments={() => setPage("bookAppointment")}
              onCertificate={() => setPage("myCertificate")}
              onVaccinations={() => setPage("myVaccinations")}
              onFeedback={() => setPage("feedback")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Feedback Page */}
          {page === "feedback" && (
            <Feedback
              onBack={() => setPage("citizenDashboard")}
            />
          )}

          {/* Family Account */}
          {page === "familyAccount" && (
            <FamilyAccount
              onBack={() => setPage("citizenDashboard")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Public Certificate Verifier */}
          {page === "verifyCertificate" && <Verify />}

          {/* My Certificate */}
          {page === "myCertificate" && (
            <MyCertificate
              onBack={() => setPage("citizenDashboard")}
            />
          )}

          {/* My Vaccination Record */}
          {page === "myVaccinations" && (
            <MyVaccinationRecord
              onDashboard={() => setPage("citizenDashboard")}
              onAppointments={() => setPage("bookAppointment")}
              onCertificate={() => setPage("myCertificate")}
              onFamilyAccount={() => setPage("familyAccount")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Book Appointment */}
          {page === "bookAppointment" && (
            <BookAppointment
              onBack={() => setPage("citizenDashboard")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Worker Dashboard */}
          {page === "workerDashboard" && (
            <WorkerDashboard
              onLogDose={() => setPage("logDose")}
              onShowWork={() => setPage("showWork")}
              onAppointments={() => setPage("workerAppointments")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Worker Appointments */}
          {page === "workerAppointments" && (
            <WorkerAppointments
              onBack={() => setPage("workerDashboard")}
              onLogDose={() => setPage("logDose")}
              onShowWork={() => setPage("showWork")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Show Work */}
          {page === "showWork" && (
            <ShowWork
              onBack={() => setPage("workerDashboard")}
              onLogDose={() => setPage("logDose")}
              onAppointments={() => setPage("workerAppointments")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Log Dose */}
          {page === "logDose" && (
            <LogDose
              onBack={() => setPage("workerDashboard")}
              onAppointments={() => setPage("workerAppointments")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {/* Add Clinic */}
          {page === "addClinic" && (
            <AddClinic
              onBack={() => setPage("dashboard")}
              onClinicCreated={() => setPage("dashboard")}
            />
          )}

          {/* Add Worker */}
          {page === "addWorker" && (
            <AddWorker
              onBack={() => setPage("clinicDashboard")}
              onWorkerCreated={() => setPage("clinicDashboard")}
            />
          )}

          {/* Vaccine Inventory */}
          {page === "inventory" && (
            <VaccineInventory />
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
        page !== "workerDashboard" &&
        page !== "logDose" &&
        page !== "bookAppointment" &&
        page !== "myCertificate" &&
        page !== "myVaccinations" &&
        page !== "verifyCertificate" &&
        page !== "showWork" &&
        page !== "feedback" && (
          <Footer />
        )}

    </div>
  );
}

export default App;