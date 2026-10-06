
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

const MyInHouseRequests = ({ onBack}) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/in-house-requests/my");

      setRequests(response.data.data || []);
    } catch (err) {
      console.error("Error fetching in-house requests:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load your in-house requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2>My In-House Requests</h2>
        <p>Loading your requests...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2>My In-House Requests</h2>



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
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!error && requests.length === 0 && (
        <p>You have no in-house visit requests.</p>
      )}

      {requests.map((request) => (
        <div
          key={request._id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <p>
            <strong>Status:</strong> {request.status}
          </p>

          <p>
            <strong>For:</strong>{" "}
            {request.familyMember
              ? request.familyMember.name
              : "Myself"}
          </p>

          <p>
            <strong>Address:</strong> {request.address}
          </p>

          <p>
            <strong>Location:</strong> {request.location}
          </p>

          <p>
            <strong>Preferred Date:</strong>{" "}
            {formatDate(request.preferredDate)}
          </p>

          <p>
            <strong>Vaccine / Reason:</strong>{" "}
            {request.vaccineOrReason}
          </p>

          <p>
            <strong>Requested On:</strong>{" "}
            {formatDate(request.createdAt)}
          </p>

          {request.assignedWorker && (
            <p>
              <strong>Assigned Worker:</strong>{" "}
              {request.assignedWorker.name}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default MyInHouseRequests;

