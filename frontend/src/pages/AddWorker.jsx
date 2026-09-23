import React, { useState } from "react";
import "./AddWorker.css";

function AddWorker({ onBack, onWorkerCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("Creating worker...");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/workers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            email,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Worker created successfully. Login credentials have been sent to the email.");

        setName("");
        setEmail("");
      } else {
        setMessage(data.message || "Failed to create worker.");
      }
    } catch (error) {
      setMessage("Could not connect to server.");
    }
  };

  return (
  <div className="add-worker-page">

    {/* LEFT SIDE */}
    <div className="add-worker-left">

      <div className="add-worker-icon">
        👩‍⚕️
      </div>

      <h1>Add New Worker</h1>

      <p>
        Add a health worker to your clinic and give them
        access to manage vaccination activities.
      </p>

      <div className="add-worker-side-card">
        <div className="side-card-icon">
          +
        </div>

        <div>
          <strong>Clinic Team</strong>
          <span>
            The worker will be automatically assigned
            to your clinic.
          </span>
        </div>
      </div>

    </div>

    {/* RIGHT SIDE */}
    <div className="add-worker-right">

      <button
        type="button"
        className="add-worker-back"
        onClick={onBack}
      >
        ← Back to Dashboard
      </button>

      <h2>Add Worker</h2>

      <p className="add-worker-subtitle">
        Fill in the details below to create a new Health Worker account.
      </p>

      <div className="add-worker-section-title">

        <div className="add-worker-section-icon">
          👤
        </div>

        <h3>Worker Information</h3>

      </div>

      <form onSubmit={handleSubmit}>

        <div className="add-worker-field">
          <label>Worker Name</label>

          <div className="add-worker-input">
            <span>👤</span>

            <input
              type="text"
              placeholder="Enter worker name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="add-worker-field">
          <label>Worker Email</label>

          <div className="add-worker-input">
            <span>✉</span>

            <input
              type="email"
              placeholder="Enter worker email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="add-worker-info">
          <div className="add-worker-info-icon">
            i
          </div>

          <p>
            A temporary password will be generated automatically
            and sent to the worker's email.
          </p>
        </div>

        {message && (
          <div className="add-worker-message">
            {message}
          </div>
        )}

        <button
          type="submit"
          className="create-worker-button"
        >
          <span>+</span>
          Create Worker
        </button>

      </form>

    </div>

  </div>
);
}

export default AddWorker;