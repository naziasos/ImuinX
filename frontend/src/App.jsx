import { useEffect, useState } from "react";

import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import CreateAdmin from "./pages/CreateAdmin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AddClinic from "./pages/admin/AddClinic";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("register");

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
          {page !== "dashboard" && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-10 mb-10">

              {page === "register" && <Register />}

              {page === "verify" && <VerifyEmail />}

              {page === "login" && (
                <Login
                  onLoginSuccess={() => setPage("dashboard")}
                />
              )}

              {page === "admin" && <CreateAdmin />}

            </div>
          )}

          {/* Admin Dashboard */}
          {/* Admin Dashboard */}
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

        </div>

      </main>

      {/* Footer */}
      {page !== "dashboard" && <Footer />}

    </div>
  );
}

export default App;