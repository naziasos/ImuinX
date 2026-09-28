import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../services/api";
import "./MyCertificate.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MyCertificate({ onBack }) {
  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printingCertificateId, setPrintingCertificateId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCertificates() {
      if (!user?.id) {
        setError("Please log in again to view your certificates.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const { data } = await api.get(`/doses/citizen/${user.id}`, {
          params: { citizenType: "user" },
        });

        const doses = data?.doses || [];
        const results = await Promise.all(
          doses.map(async (dose) => {
            try {
              const response = await api.get(
                `/certificates/dose/${dose._id}`
              );
              return {
                dose,
                certificate: response.data?.certificate || null,
              };
            } catch (err) {
              // A dose can exist without a certificate if issuance previously failed.
              if (err?.response?.status === 404) {
                return { dose, certificate: null };
              }
              throw err;
            }
          })
        );

        if (!cancelled) {
          setCertificates(results.filter((item) => item.certificate));
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCertificates();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const downloadQr = (certificate, dose) => {
    if (!certificate?.qrCode) return;

    const link = document.createElement("a");
    link.href = certificate.qrCode;
    link.download = `ImuniX-${(dose?.vaccineType || "certificate")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const printCertificate = (certificateId) => {
    setPrintingCertificateId(certificateId);
    // Let React apply the print-target class before opening the browser print dialog.
    window.setTimeout(() => {
      window.print();
    }, 50);
  };

  useEffect(() => {
    const handleAfterPrint = () => setPrintingCertificateId(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  return (
    <div className="certificate-page">
      <div className="certificate-shell">
        <header className="certificate-page-header no-print">
          <div>
            <button className="certificate-back" onClick={onBack}>
              ← Back to Dashboard
            </button>
            <p className="certificate-eyebrow">MY RECORDS</p>
            <h1>My Certificate</h1>
            <p>View and download your verified vaccination certificates.</p>
          </div>
          <div className="certificate-header-badge">✓ Verified Record</div>
        </header>

        {loading && (
          <div className="certificate-state no-print">
            <div className="certificate-spinner" />
            <h3>Loading your certificates...</h3>
            <p>Please wait while we retrieve your vaccination records.</p>
          </div>
        )}

        {!loading && error && (
          <div className="certificate-state certificate-error no-print">
            <div className="certificate-state-icon">!</div>
            <h3>Could not load certificates</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && certificates.length === 0 && (
          <div className="certificate-state no-print">
            <div className="certificate-state-icon">🪪</div>
            <h3>No certificate available yet</h3>
            <p>
              Your certificate will appear here after a vaccination dose has
              been successfully recorded.
            </p>
          </div>
        )}

        {!loading && !error && certificates.length > 0 && (
          <div className="certificate-list">
            {certificates.map(({ dose, certificate }, index) => (
              <article className={`certificate-card ${printingCertificateId === (certificate.id || certificate._id) ? "print-target" : ""}`} key={certificate.id || certificate._id}>
                <div className="certificate-top-line" />

                <div className="certificate-card-header">
                  <div>
                    <p className="certificate-label">IMMUNIX</p>
                    <h2>Vaccination Certificate</h2>
                    <p className="certificate-subtitle">
                      Official digital record of vaccination
                    </p>
                  </div>
                  <div className="certificate-number">
                    Certificate #{String(index + 1).padStart(2, "0")}
                  </div>
                </div>

                <div className="certificate-content">
                  <div className="certificate-details">
                    <div className="certificate-person">
                      <div className="certificate-avatar">
                        {(user?.name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span>Citizen Name</span>
                        <strong>{user?.name || "Citizen"}</strong>
                      </div>
                    </div>

                    <div className="certificate-grid">
                      <div className="certificate-field">
                        <span>Vaccine / Dose</span>
                        <strong>{dose.vaccineType}</strong>
                      </div>
                      <div className="certificate-field">
                        <span>Date Administered</span>
                        <strong>{formatDate(dose.dateAdministered)}</strong>
                      </div>
                      <div className="certificate-field">
                        <span>Batch Number</span>
                        <strong>{dose.batchNumber || "—"}</strong>
                      </div>
                      <div className="certificate-field">
                        <span>Certificate Issued</span>
                        <strong>{formatDate(certificate.issuedDate)}</strong>
                      </div>
                    </div>

                    <div className="certificate-clinic">
                      <span>Vaccination Center</span>
                      <strong>{dose.clinicId?.name || "ImuniX Vaccination Center"}</strong>
                      {dose.clinicId?.location && <small>{dose.clinicId.location}</small>}
                    </div>
                  </div>

                  <div className="certificate-qr-section">
                    <div className="certificate-qr-box">
                      <img src={certificate.qrCode} alt="Vaccination certificate QR code" />
                    </div>
                    <strong>Scan to verify</strong>
                    <span>Secure digital certificate</span>
                  </div>
                </div>

                <div className="certificate-footer">
                  <span>Certificate ID: {String(certificate.id).slice(-12)}</span>
                  <span>✓ Digitally verified by ImuniX</span>
                </div>

                <div className="certificate-actions no-print">
                  <button
                    className="certificate-download"
                    onClick={() => downloadQr(certificate, dose)}
                  >
                    ↓ Download QR
                  </button>
                  <button className="certificate-print" onClick={() => printCertificate(certificate.id || certificate._id)}>
                    ⬇ Download / Print Certificate
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyCertificate;
