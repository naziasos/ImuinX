
import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import Icon from "../../components/Icons";
import { useLanguage } from "../../i18n/LanguageProvider";
import "./AddClinic.css";

function AddClinic({
  onBack,
  onClinicCreated,
  onManageVaccines,
  onManageSchedules,
  onManageCampaigns,
}) {
  const { t } = useLanguage();

  const initialFormData = {
    clinicName: "",
    location: "",
    contact: "",
    latitude: "",
    longitude: "",
    adminName: "",
    adminEmessage: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  let currentUser = null;

  try {
    currentUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch {
    currentUser = null;
  }

  const menuGroups = [
    {
      title: "Main Menu",
      items: [
        {
          key: "dashboard",
          label: "Dashboard",
          icon: "dashboard",
          onClick: onBack,
        },
        {
          key: "addClinic",
          label: "Add New Clinic",
          icon: "building",
        },
      ],
    },
    {
      title: "Vaccination",
      items: [
        {
          key: "vaccines",
          label: "Manage Vaccines",
          icon: "syringe",
          onClick: onManageVaccines,
        },
        {
          key: "schedules",
          label: "Manage Vaccine Schedules",
          icon: "calendar",
          onClick: onManageSchedules,
        },
        {
          key: "campaigns",
          label: "Vaccine Campaigns",
          icon: "megaphone",
          onClick: onManageCampaigns,
        },
      ],
    },
  ];

  // Close confirmation popup with Escape.
  useEffect(() => {
    if (!confirmOpen && !successOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        setConfirmOpen(false);
        setSuccessOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [confirmOpen, successOpen, loading]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // First show confirmation popup. Do not call API here.
  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage("");
    setConfirmOpen(true);
  };

  // API request happens only after user confirms.
  const handleConfirmCreate = async () => {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/clinics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Failed to create clinic."
        );
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      console.error("Create clinic error:", error);

      setMessage("Could not connect to server. Please try again.");
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDone = () => {
    setSuccessOpen(false);
    setFormData(initialFormData);

    if (onClinicCreated) {
      onClinicCreated();
    }
  };

  const inputField = (
    label,
    name,
    placeholder,
    icon,
    options = {}
  ) => (
    <div
      className={`ac-field ${
        options.full ? "ac-field--full" : ""
      }`}
    >
      <label htmlFor={`clinic-${name}`}>
        {t(label)}

        {options.optional && (
          <span> ({t("Optional")})</span>
        )}
      </label>

      <div className="ac-input-wrap">
        <Icon name={icon} size={18} />

        <input
          id={`clinic-${name}`}
          type={options.type || "text"}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          required={!options.optional}
          min={options.min}
          max={options.max}
          step={options.step}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout
      ariaLabel={t("Admin menu")}
      user={{
        name: currentUser?.name || "Admin",
        subtitle: t("Administrator"),
      }}
      groups={menuGroups}
      activeKey="addClinic"
    >
      <div className="ac-page">

        {/* Page Heading */}
        <div className="ac-page-heading">
          <div className="ac-title-group">
            <div className="ac-clinic-logo">
              <Icon name="building" size={34} />
            </div>

            <div>
              <p className="cz-eyebrow">
                {t("CLINIC MANAGEMENT")}
              </p>

              <h1>{t("Add New Clinic")}</h1>

              <p>
                {t(
                  "Register a vaccination clinic and assign its administrator."
                )}
              </p>
            </div>
          </div>

          
        </div>

        {/* Clinic Registration Form */}
        <form
          className="ac-card"
          onSubmit={handleSubmit}
        >
          <div className="ac-card-heading">
            <span className="ac-heading-icon">
              <Icon name="building" size={22} />
            </span>

            <div>
              <h2>{t("Clinic details")}</h2>
              <p>
                {t(
                  "Enter the clinic's contact and location information."
                )}
              </p>
            </div>
          </div>

          {/* Clinic Information */}
          <div className="ac-section-label">
            <Icon name="building" size={17} />
            {t("Clinic Information")}
          </div>

          <div className="ac-grid">
            {inputField(
              "Clinic Name",
              "clinicName",
              "Enter clinic name",
              "building"
            )}

            {inputField(
              "Contact Number",
              "contact",
              "Enter contact number",
              "phone"
            )}

            {inputField(
              "Location",
              "location",
              "Enter clinic address or area",
              "pin",
              { full: true }
            )}
          </div>

          {/* Map Coordinates */}
          <div className="ac-section-label ac-section-label--spaced">
            <Icon name="pin" size={17} />
            {t("Map Coordinates")}
            <span>{t("Optional")}</span>
          </div>

          <div className="ac-grid">
            {inputField(
              "Latitude",
              "latitude",
              "e.g. 23.8103",
              "pin",
              {
                optional: true,
                type: "number",
                min: "-90",
                max: "90",
                step: "any",
              }
            )}

            {inputField(
              "Longitude",
              "longitude",
              "e.g. 90.4125",
              "pin",
              {
                optional: true,
                type: "number",
                min: "-180",
                max: "180",
                step: "any",
              }
            )}
          </div>

          <p className="ac-hint">
            {t(
              "Add coordinates to make this clinic visible in Nearby Clinics. You can copy them from Google Maps."
            )}
          </p>

          {/* Clinic Admin */}
          <div className="ac-section-label ac-section-label--spaced">
            <Icon name="user" size={17} />
            {t("Clinic Admin")}
          </div>

          <div className="ac-grid">
            {inputField(
              "Admin Name",
              "adminName",
              "Enter admin name",
              "user"
            )}

            {inputField(
              "Admin Emessage",
              "adminEmessage",
              "Enter admin email",
              "message",
              { type: "email" }
            )}
          </div>

          {/* Information */}
          <div className="ac-info">
            <Icon name="alert" size={19} />

            <p>
              {t(
                "A temporary password will be generated automatically and sent to the Clinic Admin's email."
              )}
            </p>
          </div>

          {/* API Error */}
          {message && (
            <div className="ac-message ac-message--error">
              {message}
            </div>
          )}

          {/* Form Actions */}
          <div className="ac-actions">
            <button
              type="button"
              className="cz-btn cz-btn--secondary"
              onClick={onBack}
            >
              {t("Cancel")}
            </button>

            <button
              type="submit"
              className="cz-btn cz-btn--primary"
              disabled={loading}
            >
              <Icon name="plus" size={18} />
              {t("Create Clinic")}
            </button>
          </div>
        </form>
      </div>

      {/* ==================================
          CONFIRMATION POPUP
      ================================== */}
      {confirmOpen && (
        <div
          className="ac-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loading
            ) {
              setConfirmOpen(false);
            }
          }}
        >
          <div
            className="ac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-confirm-title"
          >
            <button
              type="button"
              className="ac-modal-close"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
              aria-label="Close confirmation"
            >
              <Icon name="close" size={20} />
            </button>

            <div className="ac-modal-icon ac-modal-icon--confirm">
              <Icon name="building" size={32} />
            </div>

            <span className="ac-modal-eyebrow">
              {t("CLINIC REGISTRATION")}
            </span>

            <h2 id="ac-confirm-title">
              {t("Are you sure?")}
            </h2>

            <p className="ac-modal-description">
              {t(
                "Are you sure you want to add this clinic? Please review the clinic information before confirming."
              )}
            </p>

            <div className="ac-confirm-details">
              <div>
                <span>{t("Clinic Name")}</span>
                <strong>{formData.clinicName}</strong>
              </div>

              <div>
                <span>{t("Location")}</span>
                <strong>{formData.location}</strong>
              </div>

              <div>
                <span>{t("Admin Name")}</span>
                <strong>{formData.adminName}</strong>
              </div>
            </div>

            <div className="ac-modal-actions">
              <button
                type="button"
                className="ac-modal-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                {t("No, Go Back")}
              </button>

              <button
                type="button"
                className="ac-modal-confirm"
                onClick={handleConfirmCreate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Icon name="refresh" size={17} />
                    {t("Creating...")}
                  </>
                ) : (
                  <>
                    <Icon name="check" size={18} />
                    {t("Confirm & Add Clinic")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================
          SUCCESS POPUP
      ================================== */}
      {successOpen && (
        <div className="ac-modal-overlay">
          <div
            className="ac-modal ac-modal--success"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-success-title"
          >
            <div className="ac-success-animation">
              <Icon name="check" size={38} />
            </div>

            <span className="ac-modal-eyebrow">
              {t("REGISTRATION COMPLETE")}
            </span>

            <h2 id="ac-success-title">
              {t("Clinic Added Successfully!")}
            </h2>

            <p className="ac-modal-description">
              {t(
                "Your new clinic has been registered successfully. The clinic administrator can now use the assigned account."
              )}
            </p>

            <div className="ac-success-clinic-name">
              <Icon name="building" size={20} />
              <strong>{formData.clinicName || t("New Clinic")}</strong>
            </div>

            <button
              type="button"
              className="ac-success-done"
              onClick={handleSuccessDone}
            >
              <Icon name="check" size={18} />
              {t("Done")}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AddClinic;
