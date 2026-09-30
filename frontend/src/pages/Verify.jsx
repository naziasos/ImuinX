import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeCode, verifyCertificateToken } from "../services/verifyService";

const SCAN_INTERVAL_MS = 150;
const MAX_IMAGE_SIDE = 1600;

// Decode a QR code from an uploaded image file. Returns "" if none found.
async function decodeQrFromFile(file) {
  const bitmap = await createImageBitmap(file);
  try {
    if ("BarcodeDetector" in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const results = await detector.detect(bitmap);
        if (results[0]?.rawValue) return results[0].rawValue;
      } catch {
        /* fall through to jsQR */
      }
    }

    const jsQR = (await import("jsqr")).default;
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height)?.data || "";
  } finally {
    bitmap.close?.();
  }
}

function ResultPanel({ status, onReset }) {
  const config = {
    valid: {
      box: "bg-green-50 border-green-300 text-green-800",
      badge: "bg-green-600",
      title: "VALID",
      text: "This vaccination certificate is genuine and current.",
      icon: "M5 13l4 4L19 7",
    },
    invalid: {
      box: "bg-red-50 border-red-300 text-red-800",
      badge: "bg-red-600",
      title: "INVALID",
      text: "This code could not be verified. It may be tampered with, expired or revoked.",
      icon: "M6 6l12 12M18 6L6 18",
    },
    error: {
      box: "bg-amber-50 border-amber-300 text-amber-800",
      badge: "bg-amber-500",
      title: "COULD NOT CHECK",
      text: "We couldn't reach the server. Check your connection and try again. This is not a result for the certificate.",
      icon: "M12 8v5m0 3h.01",
    },
  }[status];

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`rounded-2xl border-2 p-8 text-center ${config.box}`}
    >
      <div
        className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${config.badge}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-11 h-11 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={config.icon} />
        </svg>
      </div>

      <h2 className="mt-5 text-3xl font-extrabold tracking-wide">{config.title}</h2>
      <p className="mt-2 text-sm">{config.text}</p>

      <button
        type="button"
        onClick={onReset}
        className="mt-6 px-6 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition"
      >
        {status === "error" ? "Try again" : "Verify another"}
      </button>
    </div>
  );
}

function Verify() {
  const [mode, setMode] = useState("scan"); 
  const [status, setStatus] = useState("idle"); 
  const [cameraState, setCameraState] = useState("starting"); 
  const [code, setCode] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [reading, setReading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false); // stops one QR being submitted many times
  const lastCodeRef = useRef("");

  const stopCamera = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const runVerification = useCallback(
    async (raw) => {
      if (busyRef.current) return;
      busyRef.current = true;
      lastCodeRef.current = raw;

      stopCamera();
      setStatus("checking");

      try {
        const ok = await verifyCertificateToken(raw);
        setStatus(ok ? "valid" : "invalid");
      } catch {
        setStatus("error");
      } finally {
        busyRef.current = false;
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (mode !== "scan" || status !== "idle") return undefined;

    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("unsupported");
        return;
      }

      setCameraState("starting");

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        if (!cancelled) setCameraState("denied");
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (cancelled) return;
      setCameraState("live");

      let detector = null;
      if ("BarcodeDetector" in window) {
        try {
          detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        } catch {
          detector = null;
        }
      }

      let jsQR = null;
      if (!detector) {
        try {
          jsQR = (await import("jsqr")).default;
        } catch {
          if (!cancelled) setCameraState("unsupported");
          return;
        }
      }

      const tick = async () => {
        if (cancelled || busyRef.current) return;

        const v = videoRef.current;
        let found = "";

        if (v && v.readyState >= 2 && v.videoWidth > 0) {
          try {
            if (detector) {
              const results = await detector.detect(v);
              found = results[0]?.rawValue || "";
            } else {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              found = jsQR(img.data, img.width, img.height)?.data || "";
            }
          } catch {
            found = "";
          }
        }

        if (found && !cancelled) {
          runVerification(found);
          return;
        }

        if (!cancelled) {
          timerRef.current = setTimeout(tick, SCAN_INTERVAL_MS);
        }
      };

      tick();
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, status, runVerification, stopCamera]);

  const reset = () => {
    lastCodeRef.current = "";
    setStatus("idle");
  };

  const retry = () => {
    if (lastCodeRef.current && mode !== "scan") {
      runVerification(lastCodeRef.current);
    } else {
      reset();
    }
  };

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setStatus("idle");
    setCode("");
    setUploadMsg("");
  };

  const submitTyped = (e) => {
    e.preventDefault();
    if (!normalizeCode(code)) return;
    runVerification(code);
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; 
    if (!file) return;

    setUploadMsg("");
    if (!file.type.startsWith("image/")) {
      setUploadMsg("Please choose an image file.");
      return;
    }

    setReading(true);
    let raw = "";
    try {
      raw = await decodeQrFromFile(file);
    } catch {
      raw = "";
    }
    setReading(false);

    if (!raw) {
      setUploadMsg("No QR code found in this image. Try a clearer photo or use “Enter code”.");
      return;
    }
    runVerification(raw);
  };

  const showResult = ["valid", "invalid", "error"].includes(status);
  const uploadBusy = reading || status === "checking";

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-extrabold text-slate-800">
          Verify a vaccination certificate
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Scan the QR code, upload its image, or type in the code. You will only see whether it
          is valid.
        </p>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          {showResult ? (
            <ResultPanel status={status} onReset={status === "error" ? retry : reset} />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 mb-5">
                {[
                  ["scan", "Scan QR"],
                  ["upload", "Upload"],
                  ["type", "Enter code"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => switchMode(value)}
                    disabled={uploadBusy}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                      mode === value
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "scan" && (
                <div>
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraState === "live" && status === "idle" && (
                      <div
                        className="absolute inset-[15%] rounded-2xl border-4 border-white/80 pointer-events-none"
                        aria-hidden="true"
                      />
                    )}

                    {(cameraState === "starting" || status === "checking") && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/70 text-white text-sm">
                        <div className="w-9 h-9 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        {status === "checking" ? "Checking…" : "Starting camera…"}
                      </div>
                    )}

                    {(cameraState === "denied" || cameraState === "unsupported") && (
                      <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white text-sm bg-slate-900">
                        {cameraState === "denied"
                          ? "Camera access was blocked. Allow camera permission in your browser, or use “Upload” or “Enter code”."
                          : "Camera scanning isn't available in this browser. Use “Upload” or “Enter code” instead."}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-500">
                    Hold the QR code inside the frame. It is checked automatically.
                  </p>
                </div>
              )}

              {mode === "upload" && (
                <div>
                  <label
                    htmlFor="cert-image"
                    className={`flex flex-col items-center justify-center gap-2 aspect-square w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-600 transition ${
                      uploadBusy
                        ? "opacity-60 pointer-events-none"
                        : "cursor-pointer hover:bg-slate-100"
                    }`}
                  >
                    {uploadBusy ? (
                      <>
                        <div className="w-9 h-9 border-4 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                        {reading ? "Reading image…" : "Checking…"}
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          className="w-10 h-10 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                        </svg>
                        <span className="font-semibold">Choose a QR image</span>
                        <span className="text-xs text-slate-500">
                          PNG or JPG, screenshot or photo
                        </span>
                      </>
                    )}
                  </label>
                  <input
                    id="cert-image"
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    disabled={uploadBusy}
                    className="sr-only"
                  />
                  {uploadMsg && (
                    <p role="alert" className="mt-3 text-center text-xs text-red-600">
                      {uploadMsg}
                    </p>
                  )}
                </div>
              )}

              {mode === "type" && (
                <form onSubmit={submitTyped}>
                  <label
                    htmlFor="cert-code"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Certificate code
                  </label>
                  <textarea
                    id="cert-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={5}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    placeholder="Paste or type the code shown with the QR"
                    className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs break-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={status === "checking" || !normalizeCode(code)}
                    className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {status === "checking" ? "Checking…" : "Verify"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Verify;