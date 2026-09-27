import React, { useState } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";

const AssignDuty = () => {
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  const workers = [
    { id: 1, name: "Ayesha Rahman" },
    { id: 2, name: "Nusrat Jahan" },
    { id: 3, name: "Sumi Akter" },
    { id: 4, name: "Rima Khatun" },
  ];

  const tasks = [
    "Vaccination Administration",
    "Registration Desk",
    "Queue Management",
    "Inventory Management",
    "Appointment Management",
  ];

  const handleWorkerChange = (workerId) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAssign = () => {
    alert("Duty assignment UI is working!");
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Assign Daily Clinic Duty</h2>
      <p>Select a task and assign one or more workers.</p>

      <Card>
        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Date</strong>
            </label>
            <br />

            <input
              type="date"
              style={{
                marginTop: "8px",
                padding: "10px",
                width: "100%",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Select Task</strong>
            </label>
            <br />

            <select
              style={{
                marginTop: "8px",
                padding: "10px",
                width: "100%",
              }}
            >
              <option value="">Choose a task</option>

              {tasks.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </select>
          </div>

          <div>
            <strong>Select Workers</strong>

            <div style={{ marginTop: "10px" }}>
              {workers.map((worker) => (
                <label
                  key={worker.id}
                  style={{
                    display: "block",
                    marginBottom: "10px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkers.includes(worker.id)}
                    onChange={() => handleWorkerChange(worker.id)}
                  />

                  <span style={{ marginLeft: "8px" }}>
                    {worker.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <Button onClick={handleAssign}>
              Assign Workers
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssignDuty;