import React, { useState } from "react";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icons";

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
        setMessage("Worker created successfully. Opening worker list...");
        setName("");
        setEmail("");

        setTimeout(() => {
          if (onWorkerCreated) onWorkerCreated(data.worker);
        }, 350);
      } else {
        setMessage(data.message || "Failed to create worker.");
      }
    } catch (error) {
      setMessage("Could not connect to server.");
    }
  };

  const messageTone = message.startsWith("Worker created")
    ? "success"
    : message === "Creating worker..."
      ? "info"
      : "error";

  return (
    <>
      <PageHeader
        icon="users"
        eyebrow="Clinic team"
        title="Add New Worker"
        description="Add a health worker to your clinic and give them access to manage vaccination activities."
        actions={
          <button type="button" className="cz-btn cz-btn--secondary" onClick={onBack}>
            <Icon name="arrowLeft" size={16} /> Back to Dashboard
          </button>
        }
      />

      <div className="cz-grid-main">
        <section className="cz-card cz-form-card fx-rise" style={{ "--fx-i": 0 }}>
          <h2 className="cz-section-title">
            <span>
              <Icon name="user" size={20} />
            </span>
            Worker Information
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="cz-field">
              <label className="cz-label" htmlFor="add-worker-name">
                Worker Name
              </label>
              <input
                id="add-worker-name"
                className="cz-input"
                type="text"
                placeholder="Enter worker name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="cz-field">
              <label className="cz-label" htmlFor="add-worker-email">
                Worker Email
              </label>
              <input
                id="add-worker-email"
                className="cz-input"
                type="email"
                placeholder="Enter worker email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <p className="cz-note cz-note--blue">
              A temporary password will be generated automatically and sent to the
              worker's email.
            </p>

            {message && (
              <div
                className={`cz-alert cz-alert--${messageTone}`}
                role={messageTone === "error" ? "alert" : "status"}
                style={{ marginTop: 16 }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="cz-btn cz-btn--primary cz-btn--block"
              style={{ marginTop: 18 }}
            >
              <Icon name="plus" size={18} /> Create Worker
            </button>
          </form>
        </section>

        <aside className="cz-card cz-card--soft fx-rise" style={{ "--fx-i": 1 }} data-tilt>
          <div className="cz-worker">
            <span className="cz-worker__avatar">
              <Icon name="users" size={20} />
            </span>
            <div>
              <strong>Clinic Team</strong>
              <p>The worker will be automatically assigned to your clinic.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default AddWorker;
