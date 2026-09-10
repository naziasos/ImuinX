import React from 'react'

const App = () => {
  return (
    <div>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="bg-indigo-600 text-white font-black px-3 py-1.5 rounded-xl text-lg shadow-sm">
                ImuniX
              </span>
              
            </div>
            <div className="flex items-center space-x-6 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-indigo-600 transition">Features</a>
              <a href="#modules" className="hover:text-indigo-600 transition">Modules</a>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
                Citizen Portal
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
              <span>🛡️</span>
              <span>Unified Vaccination Management Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Smart Immunization & <span className="text-indigo-600">Live Queue Tracking</span>
            </h1>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Designed for Bangladesh's immunization ecosystem. ImuniX introduces automated missed-dose recovery, family accounts, live queue tracking, and verifiable digital QR certificates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition shadow-sm text-center">
                Book Appointment
              </button>
              <button className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium px-6 py-3 rounded-xl transition text-center">
                Find Nearby Clinic
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-600 text-xs font-bold px-4 py-2 rounded-bl-2xl">
              Live Preview
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">🟢 Active Queue Token</h3>
            <div className="bg-indigo-900 text-white p-6 rounded-2xl mb-6 shadow-inner">
              <p className="text-xs uppercase tracking-wider text-indigo-300">Current Serving Token</p>
              <h2 className="text-4xl font-black mt-1">Token #14</h2>
              <p className="text-xs text-indigo-200 mt-2">Mirpur Clinic Branch • Estimated wait: ~12 mins</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700">Missed-Dose Recovery</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Active Rule</span>
              </div>
              <div className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700">QR Certificate</span>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium">Verifiable</span>
              </div>
            </div>
          </div>
        </header>

        {/* Feature Highlights Section */}
        <section id="features" className="bg-white border-y border-slate-200 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Core System Capabilities</h2>
              <p className="text-slate-600 text-sm mt-2">Bridging the gap between manual health records and modern digital infrastructure.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition">
                <div className="text-3xl mb-3">🔄</div>
                <h3 className="font-bold text-slate-900 mb-1">Missed-Dose Recovery</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Auto-generated medical catch-up schedules that track missed doses until complete.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition">
                <div className="text-3xl mb-3">👨‍👩‍👧‍👦</div>
                <h3 className="font-bold text-slate-900 mb-1">Family Account Management</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Manage multiple children and dependents from a single unified citizen login profile.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-bold text-slate-900 mb-1">Demand Prediction</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Forecast vaccine stock demand across clinics to prevent shortages and streamline distribution.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-slate-500">
          ImuniX 
        </footer>
      </div>
    </div>
  )
}

export default App