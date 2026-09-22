function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center">
                <span className="text-xl font-extrabold">I</span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold">
                  Imuin<span className="text-blue-400">X</span>
                </h2>

                <p className="text-xs text-slate-400">
                  Vaccination Management System
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-400 max-w-md">
              A unified platform designed to make vaccination management
              simpler, safer, and more accessible for citizens and healthcare
              providers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              Quick Links
            </h3>

            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <button className="hover:text-blue-400 transition">
                  Home
                </button>
              </li>

              <li>
                <button className="hover:text-blue-400 transition">
                  About
                </button>
              </li>

              <li>
                <button className="hover:text-blue-400 transition">
                  Services
                </button>
              </li>

              <li>
                <button className="hover:text-blue-400 transition">
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              Support
            </h3>

            <ul className="space-y-3 text-sm text-slate-400">
              <li>Help Center</li>
              <li>Privacy Policy</li>
              <li>Terms & Conditions</li>
              <li>Contact Support</li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ImuinX. All rights reserved.
          </p>

          <p className="text-xs text-slate-500">
            Vaccination Management System
          </p>

        </div>

      </div>
    </footer>
  );
}

export default Footer;