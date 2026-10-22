
import { useState } from "react";

const API = "http://localhost:5000/api/guest/certificate";

const field =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function GuestCertificate({ onBack, onRegister }) {
  const [bookingCode, setBookingCode] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const fmt = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Find the guest certificate using Appointment ID and booking email.
  const showCertificate = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);

    try {
      const res = await fetch(`${API}/lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingCode: bookingCode.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not load certificate.");
      }

      if (!data.holder || !data.dose || !data.certificate?.qrCode) {
        throw new Error("Certificate information is incomplete.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setBusy(false);
    }
  };

  // Build a complete certificate in a separate window.
  const openFullCertificate = () => {
    if (!result?.certificate?.qrCode) {
      setError("Certificate information is unavailable.");
      return;
    }

    const certificateWindow = window.open("", "_blank");

    if (!certificateWindow) {
      setError("Please allow pop-ups in your browser and try again.");
      return;
    }

    const doc = certificateWindow.document;

    doc.title = `Vaccination Certificate - ${result.holder.name}`;

    const style = doc.createElement("style");

    style.textContent = `
      @page {
        size: A4;
        margin: 12mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 20px;
        background: #f1f5f9;
        color: #1e293b;
        font-family: Arial, Helvetica, sans-serif;
      }

      .certificate {
        position: relative;
        max-width: 760px;
        margin: 0 auto;
        padding: 36px;
        border: 4px solid #2563eb;
        outline: 1px solid #93c5fd;
        outline-offset: -12px;
        border-radius: 14px;
        background: white;
        text-align: center;
      }

      .brand {
        color: #2563eb;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 3px;
        text-transform: uppercase;
      }

      .heading {
        margin: 22px 0 8px;
        font-size: 28px;
        color: #0f172a;
      }

      .subtitle {
        margin: 0 0 28px;
        color: #64748b;
        font-size: 13px;
      }

      .recipient-label {
        margin-top: 20px;
        color: #64748b;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .recipient {
        margin: 8px 0 24px;
        font-size: 26px;
        font-weight: bold;
        overflow-wrap: anywhere;
      }

      .details {
        max-width: 520px;
        margin: 0 auto;
        padding: 18px 22px;
        border: 1px solid #dbeafe;
        border-radius: 10px;
        background: #f8fafc;
        text-align: left;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 9px 0;
        border-bottom: 1px solid #e2e8f0;
        font-size: 13px;
      }

      .detail-row:last-child {
        border-bottom: none;
      }

      .detail-label {
        color: #475569;
        font-weight: bold;
      }

      .detail-value {
        text-align: right;
        overflow-wrap: anywhere;
      }

      .qr {
        display: block;
        width: 165px;
        height: 165px;
        object-fit: contain;
        margin: 22px auto 10px;
      }

      .verification {
        margin: 8px auto 0;
        max-width: 430px;
        color: #64748b;
        font-size: 11px;
        line-height: 1.6;
      }

      .footer {
        margin-top: 25px;
        padding-top: 14px;
        border-top: 1px solid #cbd5e1;
        color: #64748b;
        font-size: 11px;
      }

      .print-button {
        display: block;
        margin: 22px auto;
        padding: 12px 24px;
        border: none;
        border-radius: 24px;
        background: #2563eb;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
      }

      @media print {
        body {
          padding: 0;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .certificate {
          max-width: none;
          margin: 0;
          break-inside: avoid;
        }

        .print-button {
          display: none;
        }
      }
    `;

    doc.head.appendChild(style);

    const certificate = doc.createElement("main");
    certificate.className = "certificate";

    const addText = (tag, className, value, parent = certificate) => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = value;
      parent.appendChild(element);
      return element;
    };

    addText("div", "brand", "ImuinX");

    addText("h1", "heading", "Vaccination Certificate");

    addText(
      "p",
      "subtitle",
      "Certificate of vaccination administered through a campaign"
    );

    addText("p", "recipient-label", "This certificate is issued to");

    addText("div", "recipient", result.holder.name || "N/A");

    const details = doc.createElement("section");
    details.className = "details";

    const vaccine =
      result.dose.vaccine || result.dose.vaccineType || "N/A";

    const doseNumber =
      result.dose.doseNumber != null
        ? String(result.dose.doseNumber)
        : "N/A";

    const rows = [
      ["Appointment ID", bookingCode.trim().toUpperCase()],
      ["Vaccine", vaccine],
      ["Dose Number", doseNumber],
      ["Vaccination Date", fmt(result.dose.dateAdministered)],
      ["Batch Number", result.dose.batchNumber || "N/A"],
      ["Certificate Expiry", fmt(result.certificate.expiryDate)],
    ];

    rows.forEach(([label, value]) => {
      const row = doc.createElement("div");
      row.className = "detail-row";

      const labelElement = doc.createElement("span");
      labelElement.className = "detail-label";
      labelElement.textContent = label;

      const valueElement = doc.createElement("span");
      valueElement.className = "detail-value";
      valueElement.textContent = value;

      row.append(labelElement, valueElement);
      details.appendChild(row);
    });

    certificate.appendChild(details);

    const qr = doc.createElement("img");
    qr.className = "qr";
    qr.src = result.certificate.qrCode;
    qr.alt = "Certificate verification QR code";
    certificate.appendChild(qr);

    addText(
      "p",
      "verification",
      "Scan this QR code to verify the certificate using the official ImuinX verification page."
    );

    addText(
      "div",
      "footer",
      "Keep this certificate for your records. Certificate validity is subject to official verification."
    );

    doc.body.appendChild(certificate);

    const printButton = doc.createElement("button");
    printButton.className = "print-button";
    printButton.textContent = "Download / Save as PDF";

    printButton.onclick = () => {
      certificateWindow.focus();
      certificateWindow.print();
    };

    doc.body.appendChild(printButton);

    // Wait for the QR image before opening the print dialog.
    qr.onload = () => {
      certificateWindow.focus();
    };

    qr.onerror = () => {
      setError("The certificate opened, but its QR code could not be loaded.");
    };

    if (qr.complete && qr.naturalWidth > 0) {
      certificateWindow.focus();
    }
  };

  const viewCertificate = () => {
    openFullCertificate();
  };

  const downloadCertificate = () => {
    openFullCertificate();
  };

  return (
    <div className="max-w-xl mx-auto my-10 p-8 bg-white rounded-2xl shadow-lg">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-blue-600 mb-4"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-extrabold text-slate-800">
        Get your certificate
      </h2>

      <p className="text-sm text-slate-500 mt-1">
        For people vaccinated through a campaign without an account.
      </p>

      {error && (
        <div
          className="mt-4 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={showCertificate} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Appointment ID
          </label>

          <input
            className={`${field} uppercase tracking-widest font-bold`}
            placeholder="IMX-XXXXXX"
            value={bookingCode}
            onChange={(e) => {
              setBookingCode(e.target.value.toUpperCase());
              setResult(null);
              setError("");
            }}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Email used for booking
          </label>

          <input
            className={field}
            type="email"
            placeholder="Enter your booking email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setResult(null);
              setError("");
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold disabled:opacity-50"
        >
          {busy ? "Loading certificate..." : "Show Certificate"}
        </button>
      </form>

      {result && (
        <div className="mt-5">
          <div className="rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              ImuinX · Vaccination Certificate
            </p>

            <h3 className="text-xl font-extrabold text-slate-800 mt-2">
              {result.holder.name}
            </h3>

            <p className="text-sm text-slate-600 mt-2">
              {result.dose.vaccine || result.dose.vaccineType || "Vaccine"}
              {result.dose.doseNumber != null
                ? ` · Dose ${result.dose.doseNumber}`
                : ""}
            </p>

            <p className="text-sm text-slate-600 mt-1">
              Vaccination date: {fmt(result.dose.dateAdministered)}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Batch: {result.dose.batchNumber || "N/A"}
            </p>

            <img
              src={result.certificate.qrCode}
              alt="Certificate QR code"
              className="mx-auto mt-4 w-48 h-48 object-contain"
            />

            <p className="text-xs text-slate-500 mt-2">
              Valid until {fmt(result.certificate.expiryDate)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={viewCertificate}
              className="w-full py-3 rounded-full border border-blue-600 text-blue-600 font-bold hover:bg-blue-50"
            >
              View Certificate
            </button>

            <button
              type="button"
              onClick={downloadCertificate}
              className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold"
            >
              Download Full Certificate
            </button>
          </div>

          {!result.hasAccount && onRegister && (
            <div className="mt-5 rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-slate-700">
              <p className="font-semibold">
                Want to keep this in one place? (optional)
              </p>

              <p className="mt-1">
                Create an account to manage your certificates and future
                vaccinations.
              </p>

              <button
                type="button"
                onClick={onRegister}
                className="mt-3 px-5 py-2 rounded-full bg-blue-600 text-white font-semibold"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
