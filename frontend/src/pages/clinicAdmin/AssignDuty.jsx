import React, { useEffect, useState } from "react";
import Button from "../../components/Button";
import "./AssignDuty.css";

const AssignDuty = ({ onBack }) => {
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  const tasks = ["Vaccination", "In-House Visit"];

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5000/api/clinics/my-clinic/workers",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch workers");
        }

        setWorkers(data.workers || []);
      } catch (error) {
        console.error("Error fetching workers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  const handleWorkerChange = (workerId) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAssign = async () => {
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }

    if (!selectedTask) {
      alert("Please select a duty type.");
      return;
    }

    if (selectedWorkers.length === 0) {
      alert("Please select at least one worker.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      for (const workerId of selectedWorkers) {
        const response = await fetch(
          "http://localhost:5000/api/clinics/my-clinic/duties",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              workerId,
              dutyDate: selectedDate,
              dutyType: selectedTask,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to assign duty");
        }
      }

      alert("Duty assigned successfully!");

      setSelectedWorkers([]);
      setSelectedTask("");
    } catch (error) {
      console.error("Error assigning duty:", error);
      alert(error.message);
    }
  };

  return (
    <main className="assign-duty-main">

      {/* Header */}
      <header className="assign-duty-header">
        <div>
          <p className="assign-duty-breadcrumb">
            Clinic Admin / Daily Duties
          </p>

          <h1>Assign Daily Clinic Duty</h1>

          <p className="assign-duty-description">
            Assign clinic duties to one or more workers.
          </p>
        </div>

        <div className="assign-duty-profile">
          <div className="assign-duty-profile-avatar">
            C
          </div>

          <div>
            <strong>Clinic Admin</strong>
            <span>Administrator</span>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <button
        type="button"
        className="assign-duty-back"
        onClick={onBack}
      >
        ← Back to Dashboard
      </button>

      {/* Duty Details */}
      <section className="assign-duty-card">
        <div className="assign-duty-section-header">
          <div>
            <p className="assign-duty-section-label">
              DUTY DETAILS
            </p>

            <h2>Choose duty information</h2>

            <p>
              Select the date and type of duty you want to assign.
            </p>
          </div>
        </div>

        <div className="assign-duty-form-grid">
          <div className="assign-duty-field">
            <label htmlFor="duty-date">
              Duty Date
            </label>

            <input
              id="duty-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="assign-duty-field">
            <label htmlFor="duty-type">
              Duty Type
            </label>

            <select
              id="duty-type"
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
            >
              <option value="">
                Choose a duty
              </option>

              {tasks.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Worker Selection */}
      <section className="assign-duty-card">
        <div className="assign-duty-section-header worker-selection-header">
          <div>
            <p className="assign-duty-section-label">
              CLINIC TEAM
            </p>

            <h2>Select Workers</h2>

            <p>
              Choose the workers who will perform this duty.
            </p>
          </div>

          <div className="assign-duty-selected-count">
            {selectedWorkers.length} Selected
          </div>
        </div>

        {loading ? (
          <div className="assign-duty-empty">
            <div className="assign-duty-loading-spinner"></div>
            <p>Loading workers...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="assign-duty-empty">
            <div className="assign-duty-empty-icon">
              👥
            </div>

            <h3>No workers found</h3>

            <p>
              Workers assigned to your clinic will appear here.
            </p>
          </div>
        ) : (
          <div className="assign-duty-workers-grid">
            {workers.map((worker) => {
              const isSelected = selectedWorkers.includes(worker._id);

              return (
                <label
                  key={worker._id}
                  className={`assign-duty-worker ${
                    isSelected ? "selected" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      handleWorkerChange(worker._id)
                    }
                  />

                  <div className="assign-duty-worker-avatar">
                    {worker.name?.charAt(0)?.toUpperCase()}
                  </div>

                  <div className="assign-duty-worker-info">
                    <h3>{worker.name}</h3>

                    <p>{worker.email}</p>

                    <span>Health Worker</span>
                  </div>

                  <div className="assign-duty-check">
                    {isSelected ? "✓" : ""}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Assignment Summary */}
      <section className="assign-duty-summary">
        <div>
          <p className="assign-duty-section-label">
            ASSIGNMENT SUMMARY
          </p>

          <h2>Ready to assign?</h2>

          <p>
            Review the selected duty information before assigning
            workers.
          </p>
        </div>

        <div className="assign-duty-summary-details">
          <div>
            <span>Date</span>

            <strong>
              {selectedDate || "Not selected"}
            </strong>
          </div>

          <div>
            <span>Duty</span>

            <strong>
              {selectedTask || "Not selected"}
            </strong>
          </div>

          <div>
            <span>Workers</span>

            <strong>
              {selectedWorkers.length}
            </strong>
          </div>
        </div>

        <div className="assign-duty-action">
          <Button onClick={handleAssign}>
            Assign Workers
          </Button>
        </div>
      </section>
    </main>
  );
};

export default AssignDuty;