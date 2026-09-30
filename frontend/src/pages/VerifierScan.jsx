import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const API_URL = "http://localhost:5000/api";

const VerifierScan = () => {
  const scannerRef = useRef(null);
  const scannerStartedRef = useRef(false);

  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  const verifyCertificate = async (token) => {
    const cleanToken = token?.trim();

    if (!cleanToken) {
      setResult({
        valid: false,
        message: "Please enter or scan a certificate code.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/certificates/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: cleanToken,
        }),
      });

      const data = await response.json();

      setResult({
        valid: data.valid === true,
      });
    } catch (error) {
      console.error("Verification error:", error);

      setResult({
        valid: false,
        message: "Unable to connect to the verification server.",
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    if (scannerStartedRef.current) return;

    setCameraError("");

    try {
      const scanner = new Html5Qrcode("qr-reader");

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          await stopScanner();
          setManualCode(decodedText);
          verifyCertificate(decodedText);
        },
        () => {}
      );

      scannerStartedRef.current = true;
      setCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        "Camera could not be started. Please allow camera permission or use manual code entry."
      );
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current || !scannerStartedRef.current) return;

    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch (error) {
      console.error("Scanner stop error:", error);
    }

    scannerRef.current = null;
    scannerStartedRef.current = false;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const resetVerification = () => {
    setResult(null);
    setManualCode("");
    setCameraError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm">
                I
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  ImuinX
                </h1>

                <p className="text-xs text-slate-500">
                  Vaccination Management
                </p>
              </div>
            </div>
          </div>

          <div className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 sm:block">
            Certificate Verifier
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:py-14">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            ✓
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Verify Vaccination Certificate
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Scan the QR code or enter the certificate code manually to verify
            its authenticity.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Scanner Card */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Scan QR Certificate
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Use your device camera
                  </p>
                </div>

                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  QR SCAN
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="relative overflow-hidden rounded-2xl bg-slate-950">
                <div
                  id="qr-reader"
                  className="min-h-[330px] w-full overflow-hidden"
                />

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl text-white backdrop-blur">
                      ▣
                    </div>

                    <h4 className="font-semibold text-white">
                      Ready to scan
                    </h4>

                    <p className="mt-2 max-w-sm text-sm leading-5 text-slate-300">
                      Position the vaccination certificate QR code inside the
                      scanner frame.
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {cameraError}
                </div>
              )}

              <div className="mt-5 flex gap-3">
                {!cameraActive ? (
                  <button
                    onClick={startScanner}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Start Camera Scan
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Stop Camera
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Manual Entry Card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-7">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                #
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                Enter Code Manually
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                If scanning is unavailable, paste the certificate QR token
                below.
              </p>
            </div>

            <textarea
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste certificate code here..."
              rows={7}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

            <button
              onClick={() => verifyCertificate(manualCode)}
              disabled={loading || !manualCode.trim()}
              className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Verifying..." : "Verify Certificate"}
            </button>

            <div className="mt-6 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              OR
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              Verification only confirms certificate validity. Personal
              information is not displayed.
            </p>
          </section>
        </div>

        {/* Result */}
        {result && (
          <section
            className={`mt-6 rounded-3xl border p-8 text-center shadow-sm ${
              result.valid
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
                result.valid
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {result.valid ? "✓" : "×"}
            </div>

            <h3
              className={`mt-5 text-2xl font-bold ${
                result.valid ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {result.valid
                ? "CERTIFICATE VALID"
                : "CERTIFICATE INVALID"}
            </h3>

            <p
              className={`mx-auto mt-2 max-w-xl text-sm ${
                result.valid ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {result.message ||
                (result.valid
                  ? "This vaccination certificate has been successfully verified."
                  : "This certificate could not be verified.")}
            </p>

            <button
              onClick={resetVerification}
              className="mt-6 rounded-xl border border-current px-5 py-2.5 text-sm font-semibold transition hover:bg-white/60"
            >
              Verify Another Certificate
            </button>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-xs text-slate-400">
          ImuinX · Secure Vaccination Certificate Verification
        </div>
      </footer>
    </div>
  );
};

export default VerifierScan;