
import React, { useEffect, useState } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";

const AssignDuty = () => {
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

        setWorkers(data.workers);
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
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
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
              {loading ? (
                <p>Loading workers...</p>
              ) : workers.length === 0 ? (
                <p>No workers found for this clinic.</p>
              ) : (
                workers.map((worker) => (
                  <label
                    key={worker._id}
                    style={{
                      display: "block",
                      marginBottom: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkers.includes(worker._id)}
                      onChange={() => handleWorkerChange(worker._id)}
                    />

                    <span style={{ marginLeft: "8px" }}>
                      {worker.name}
                    </span>
                  </label>
                ))
              )}
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

