
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

const RequestInHouseVisit = ({ onBack}) => {
  const navigate = useNavigate();

  const [familyMembers, setFamilyMembers] = useState([]);

  const [formData, setFormData] = useState({
    forFamilyMember: false,
    familyMemberId: "",
    address: "",
    location: "",
    preferredDate: "",
    vaccineOrReason: "",
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch linked family members
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const { data } = await api.get("/family");
        setFamilyMembers(data.familyMembers || data.data || data || []);
      } catch (err) {
        console.error("Error fetching family members:", err);
      }
    };

    fetchFamilyMembers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.forFamilyMember && !formData.familyMemberId) {
      newErrors.familyMemberId = "Please select a family member.";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required.";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required.";
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = "Preferred date and time is required.";
    } else {
      const selectedDate = new Date(formData.preferredDate);

      if (selectedDate <= new Date()) {
        newErrors.preferredDate =
          "Preferred date and time must be in the future.";
      }
    }

    if (!formData.vaccineOrReason.trim()) {
      newErrors.vaccineOrReason =
        "Vaccine name or reason is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/in-house-requests", {
        familyMember: formData.forFamilyMember
          ? formData.familyMemberId
          : null,
        address: formData.address.trim(),
        location: formData.location.trim(),
        preferredDate: formData.preferredDate,
        vaccineOrReason: formData.vaccineOrReason.trim(),
      });

      setSuccess(
        response.data?.message ||
          "In-house visit requested successfully!"
      );

      setTimeout(() => {
        navigate("/citizen/my-requests");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit in-house visit request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Request In-House Visit
      </h2>

      <button
        type="button"
        onClick={onBack}
        style={{
            marginBottom: "20px",
            padding: "10px 16px",
            borderRadius: "6px",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
        }}
        >
        ← Back to Dashboard
        </button>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Self / Family Member */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            name="forFamilyMember"
            id="forFamilyMember"
            checked={formData.forFamilyMember}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />

          <label
            htmlFor="forFamilyMember"
            className="text-sm font-medium text-gray-700"
          >
            Request this visit for a family member instead of yourself
          </label>
        </div>

        {/* Family Member */}
        {formData.forFamilyMember && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Family Member
            </label>

            <select
              name="familyMemberId"
              value={formData.familyMemberId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Choose Family Member --</option>

              {familyMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} (
                  {member.relation || member.relationship || "Family Member"}
                  )
                </option>
              ))}
            </select>

            {errors.familyMemberId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.familyMemberId}
              </p>
            )}
          </div>
        )}

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visit Address
          </label>

          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            placeholder="Enter full street address, house/apartment number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />

          {errors.address && (
            <p className="mt-1 text-sm text-red-600">
              {errors.address}
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>

          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Dhaka, Mirpur"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />

          {errors.location && (
            <p className="mt-1 text-sm text-red-600">
              {errors.location}
            </p>
          )}
        </div>

        {/* Preferred Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Date & Time
          </label>

          <input
            type="datetime-local"
            name="preferredDate"
            value={formData.preferredDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />

          {errors.preferredDate && (
            <p className="mt-1 text-sm text-red-600">
              {errors.preferredDate}
            </p>
          )}
        </div>

        {/* Vaccine / Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vaccine Name / Reason for Visit
          </label>

          <input
            type="text"
            name="vaccineOrReason"
            value={formData.vaccineOrReason}
            onChange={handleChange}
            placeholder="e.g., Covid-19 Booster or General Health Check"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />

          {errors.vaccineOrReason && (
            <p className="mt-1 text-sm text-red-600">
              {errors.vaccineOrReason}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50"
        >
          {loading
            ? "Submitting..."
            : "Submit In-House Request"}
        </button>
      </form>
    </div>
  );
};

export default RequestInHouseVisit;

