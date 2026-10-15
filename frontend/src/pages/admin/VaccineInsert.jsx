
import { useState } from "react";
import "./VaccineInsert.css";

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

      const response = await fetch(
        "http://localhost:5000/api/vaccines",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
    <div className="vaccine-insert-page">

        <button type="button" onClick={onBack}>
            Back to Dashboard
            </button>
            
      <h2>Add New Vaccine</h2>
      <p>Enter the vaccine information below.</p>

      {message && (
        <div className="success-message" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Vaccine Name *</label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Hepatitis B"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="code">Vaccine Code *</label>
          <input
            id="code"
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="e.g. HEPB"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter a short description"
            rows="4"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Adding Vaccine..." : "Add Vaccine"}
        </button>
      </form>
    </div>
  );
};

export default VaccineInsert;
