import AddWorker from "./pages/AddWorker.jsx";


import { useEffect, useState } from "react";

import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import CreateAdmin from "./pages/CreateAdmin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AddClinic from "./pages/admin/AddClinic";
import ForgotPassword from "./pages/ForgotPassword";
import ClinicAdminDashboard from "./pages/clinicAdmin/ClinicAdminDashboard";
import VaccineInventory from "./pages/VaccineInventory";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("register");
  const [authEmail, setAuthEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Splash Screen
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

          {/* Page Card */}
          {page !== "dashboard" && page !== "clinicDashboard" && (
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
                <VerifyEmail email={authEmail} />
              )}

              {page === "login" && (
                <Login
                  onLoginSuccess={(user) => {
                    setCurrentUser(user);

                    if (user.role === "clinicAdmin") {
                      setPage("clinicDashboard");
                    } else {
                      setPage("dashboard");
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
              onOpenInventory={() => setPage("inventory")}
              onLogout={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setPage("login");
              }}
            />
          )}

          {page === "dashboard" && (
            <AdminDashboard
              onAddClinic={() => setPage("addClinic")}
            />
          )}

          {/* Add Clinic */}
          {page === "addClinic" && (
            <AddClinic
              onBack={() => setPage("dashboard")}
              onClinicCreated={() => setPage("dashboard")}
            />
          )}

          {/* Add Worker - MY PART */}
          {page === "addWorker" && (
            <AddWorker
              onBack={() => setPage("clinicDashboard")}
              onWorkerCreated={() => setPage("clinicDashboard")}
            />
          )}
          {/* Vaccine Inventory */}
          {page === "inventory" && (
             <VaccineInventory
              onBack={() => setPage("clinicDashboard")} 
               />
          )}

        </div>

      </main>

      {/* Footer */}
      {page !== "dashboard" && page !== "clinicDashboard" && (
        <Footer />
      )}
    </div>
  );
}

export default App;