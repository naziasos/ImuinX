import { useState } from "react";

function Navbar({ page, setPage }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", value: "register" },
    { label: "About", value: "about" },
    { label: "Services", value: "services" },
  ];

  const handleNavigation = (value) => {
    setPage(value);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* ================= LOGO ================= */}
          <button
            onClick={() => handleNavigation("register")}
            className="flex items-center gap-3 group"
          >
            {/* Logo Icon */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              <span className="text-white text-xl font-extrabold">
                I
              </span>

              {/* Small medical cross */}
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">
                  +
                </span>
              </span>
            </div>

            {/* Brand Name */}
            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
                Imuin<span className="text-blue-600">X</span>
              </h1>

              <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                Vaccination Management
              </p>
            </div>
          </button>

          {/* ================= DESKTOP NAVIGATION ================= */}
          <div className="hidden md:flex items-center gap-1">

            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => handleNavigation(item.value)}
                className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  page === item.value
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                }`}
              >
                {item.label}

                {page === item.value && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}

            {/* Divider */}
            <div className="h-7 w-px bg-slate-200 mx-3" />

            {/* Register */}
            <button
              onClick={() => handleNavigation("register")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                page === "register"
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              Register
            </button>
           

            {/* Login */}
            <button
              onClick={() => handleNavigation("login")}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-200"
            >
              Login
            </button>

            {/* Notification */}
            <button
              className="ml-2 relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
              aria-label="Notifications"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.5-1.5A2 2 0 0118 14v-3a6 6 0 10-12 0v3a2 2 0 01-.5 1.5L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>

              {/* Notification dot */}
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>

          {/* ================= MOBILE BUTTON ================= */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* ================= MOBILE MENU ================= */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-4">

            <div className="flex flex-col gap-1">

              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleNavigation(item.value)}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    page === item.value
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={() => handleNavigation("register")}
                className="text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Register
              </button>
              

              <button
                onClick={() => handleNavigation("login")}
                className="mt-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Login
              </button>

            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;