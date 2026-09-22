
import { useEffect, useState } from "react";

import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import CreateAdmin from "./pages/CreateAdmin";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
    const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("register");
    useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

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
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">
            ImuinX
          </h1>

          <p className="text-slate-500 mt-2">
            Vaccination Management System
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">

          <button
            onClick={() => setPage("register")}
            className={`px-5 py-2 rounded-lg font-medium ${
              page === "register"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            Register
          </button>

          <button
            onClick={() => setPage("verify")}
            className={`px-5 py-2 rounded-lg font-medium ${
              page === "verify"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            Verify Email
          </button>

          <button
            onClick={() => setPage("login")}
            className={`px-5 py-2 rounded-lg font-medium ${
              page === "login"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            Login
          </button>

          <button
            onClick={() => setPage("admin")}
            className={`px-5 py-2 rounded-lg font-medium ${
              page === "admin"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            Create Admin
          </button>

        </div>

        {/* Page Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {page === "register" && <Register />}

          {page === "verify" && <VerifyEmail />}

          {page === "login" && (
            <Login
              onLoginSuccess={() => setPage("dashboard")}
            />
          )}

          {page === "admin" && <CreateAdmin />}

        </div>

        {/* Admin Dashboard */}
        {page === "dashboard" && <AdminDashboard />}

      </div>
    </div>
  );
}

export default App;
