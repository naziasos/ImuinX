import React, { useState } from "react";

function AddWorker() {
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
    <div>
      <h1>Add Worker</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Worker Name</label>
          <br />
          <input
            type="text"
            placeholder="Enter worker name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Worker Email</label>
          <br />
          <input
            type="email"
            placeholder="Enter worker email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit">
          Create Worker
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default AddWorker;