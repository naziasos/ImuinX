import { useEffect, useRef, useState } from "react";

const LENGTH = 6;

function maskEmail(email) {
  const [user, domain] = (email || "").split("@");
  if (!user || !domain) return email || "";
  const visible = user.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

function VerifyEmail({ email: initialEmail = "", onVerifySuccess }) {
  const [email] = useState(initialEmail);
  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const [status, setStatus] = useState("idle"); // idle | loading | error | success
  const [message, setMessage] = useState("");
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const otp = digits.join("");
  const otpComplete = otp.length === LENGTH;

  const setDigitAt = (index, value) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, "");

    if (!value) {
      setDigitAt(index, "");
      return;
    }

    // Handles fast typing / autofill where more than one character lands at once
    if (value.length > 1) {
      const chars = value.slice(0, LENGTH - index).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((c, i) => {
          next[index + i] = c;
        });
        return next;
      });
      const nextIndex = Math.min(index + chars.length, LENGTH - 1);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    setDigitAt(index, value);
    if (index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      pasted.split("").forEach((c, i) => {
        next[i] = c;
      });
      return next;
    });
    inputsRef.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpComplete || status === "loading" || status === "success") return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/verify-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        setTimeout(() => {
          onVerifySuccess && onVerifySuccess(email);
        }, 1100);
      } else {
        setStatus("error");
        setMessage(data.message || "Invalid or expired OTP");
        setDigits(Array(LENGTH).fill(""));
        inputsRef.current[0]?.focus();
      }
    } catch (error) {
      setStatus("error");
      setMessage("Could not connect to server");
    }
  };

  return (
    <div className="relative isolate flex items-center justify-center py-6">
      {/* decorative background blobs */}
      <div className="pointer-events-none absolute -top-10 -left-10 h-56 w-56 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-56 w-56 rounded-full bg-cyan-200/60 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl shadow-blue-100 px-8 py-10 sm:px-10">
        {/* Lock icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-cyan-50 shadow-inner ring-1 ring-blue-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
            >
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
        </div>

        <h1 className="text-center text-2xl font-extrabold text-slate-800">
          Verify Your OTP
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          We've sent a 6-digit verification code to
          <br />
          <span className="font-semibold text-slate-700">
            {maskEmail(email)}
          </span>
        </p>

        {message && (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-center text-sm font-medium ${
              status === "success"
                ? "bg-emerald-50 text-emerald-700"
                : status === "error"
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-700"
            }`}
            role="status"
          >
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={status === "loading" || status === "success"}
                className={`h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 text-center text-lg font-bold text-slate-800 transition-all duration-150 focus:outline-none ${
                  digit
                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
                    : "border-slate-200 bg-slate-50"
                } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60`}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!otpComplete || status === "loading" || status === "success"}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-200 transition-all duration-150 hover:shadow-blue-300 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {status === "loading"
              ? "Verifying…"
              : status === "success"
              ? "Verified ✓"
              : "Verify OTP"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Didn't get a code? Check your spam folder, or go back and register
          again to request a new one.
        </p>
      </div>
    </div>
  );
}

export default VerifyEmail;
