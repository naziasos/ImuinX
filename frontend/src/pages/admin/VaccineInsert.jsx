
import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Icon from "../../components/Icons";

const VaccineInsert = ({ onBack, onVaccineCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!formData.name.trim() || !formData.code.trim()) {
      setError("Vaccine name and code are required.");
      return;
    }

    try {
      setLoading(true);

      
    const token = localStorage.getItem("token");

    if (!token) {
    throw new Error("Please log in again. Authentication token not found.");
    }

    const response = await fetch(
    "http://localhost:5000/api/vaccines",
    {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        }),
    }
    );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to add vaccine.");
      }

      setMessage(result.message || "Vaccine added successfully.");

      setFormData({
        name: "",
        code: "",
        description: "",
      });
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        icon="syringe"
        eyebrow="Vaccination"
        title="Add New Vaccine"
        description="Enter the vaccine information below."
        
      />

      <section className="cz-card cz-form-card cz-form-card--narrow fx-rise" style={{ "--fx-i": 0 }}>
        {message && (
          <div className="cz-alert cz-alert--success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="cz-alert cz-alert--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="cz-field">
            <label className="cz-label" htmlFor="name">
              Vaccine Name *
            </label>
            <input
              id="name"
              className="cz-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Hepatitis B"
              required
            />
          </div>

          <div className="cz-field">
            <label className="cz-label" htmlFor="code">
              Vaccine Code *
            </label>
            <input
              id="code"
              className="cz-input"
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. HEPB"
              required
            />
          </div>

          <div className="cz-field">
            <label className="cz-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="cz-textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter a short description"
              rows="4"
            />
          </div>

          <button type="submit" className="cz-btn cz-btn--primary cz-btn--block" disabled={loading}>
            {loading ? "Adding Vaccine..." : "Add Vaccine"}
          </button>
        </form>
      </section>
    </>
  );
};

export default VaccineInsert;
