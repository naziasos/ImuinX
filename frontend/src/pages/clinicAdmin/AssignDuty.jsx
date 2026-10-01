
import React, { useEffect, useState } from "react";
import Button from "../../components/Button";
import "./AssignDuty.css";

const AssignDuty = ({ onBack }) => {
  const [workers, setWorkers] = useState([]);
  const [assignedDuties, setAssignedDuties] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDuty, setSelectedDuty] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dutiesLoading, setDutiesLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const dutyTypes = ["Vaccination", "In-House Visit"];

  // =====================================================
  // FETCH WORKERS
  // =====================================================

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

  // =====================================================
  // FETCH ALL ASSIGNED DUTIES
  // =====================================================

  const fetchAssignedDuties = async () => {
    try {
      setDutiesLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/duties",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch assigned duties"
        );
      }

      setAssignedDuties(data.duties || []);
    } catch (error) {
      console.error("Error fetching assigned duties:", error);
      setAssignedDuties([]);
    } finally {
      setDutiesLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchAssignedDuties();
  }, []);

  // =====================================================
  // CHECK EXISTING ASSIGNMENTS FOR SELECTED DATE
  // =====================================================

  const selectedDateDuties = assignedDuties.filter((duty) => {
    if (!selectedDate || !duty.dutyDate) {
      return false;
    }

    return (
      new Date(duty.dutyDate).toISOString().slice(0, 10) ===
      selectedDate
    );
  });

  

  const isWorkerAlreadyAssigned = (workerId) => {
    return selectedDateDuties.some(
      (duty) => duty.workerId?._id === workerId
    );
  };

  // =====================================================
  // SEARCH DAILY ASSIGNMENTS
  // =====================================================

  const filteredDuties = assignedDuties.filter((duty) => {
    const workerName = duty.workerId?.name || "";
    const dutyType = duty.dutyType || "";

    const date = duty.dutyDate
      ? new Date(duty.dutyDate).toLocaleDateString("en-GB")
      : "";

    const search = searchTerm.toLowerCase().trim();

    if (!search) {
      return true;
    }

    return (
      workerName.toLowerCase().includes(search) ||
      dutyType.toLowerCase().includes(search) ||
      date.toLowerCase().includes(search)
    );
  });

  // =====================================================
  // ASSIGN DUTY
  // =====================================================

  const handleAssign = async () => {
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }

    if (!selectedDuty) {
      alert("Please select a duty.");
      return;
    }

    if (!selectedWorker) {
      alert("Please select a worker.");
      return;
    }

    

    if (isWorkerAlreadyAssigned(selectedWorker)) {
      const worker = workers.find(
        (item) => item._id === selectedWorker
      );

      alert(
        `${worker?.name || "This worker"} is already assigned to a duty on this date.`
      );
      return;
    }

    try {
      setAssigning(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/clinics/my-clinic/duties",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workerId: selectedWorker,
            dutyDate: selectedDate,
            dutyType: selectedDuty,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to assign duty"
        );
      }

      alert("Duty assigned successfully!");

      // Clear the form
      setSelectedDate("");
      setSelectedDuty("");
      setSelectedWorker("");

      // Refresh the Daily Assignments table
      await fetchAssignedDuties();
    } catch (error) {
      console.error("Error assigning duty:", error);
      alert(error.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <main className="assign-duty-main">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="assign-duty-header">
        <div>
          <p className="assign-duty-breadcrumb">
            Clinic Admin / Daily Duties
          </p>

          <h1>Assign Daily Clinic Duty</h1>

          <p className="assign-duty-description">
            View existing assignments and assign duties to clinic workers.
          </p>
        </div>

        <div className="assign-duty-profile">
          <div className="assign-duty-profile-avatar">C</div>

          <div>
            <strong>Clinic Admin</strong>
            <span>Administrator</span>
          </div>
        </div>
      </header>

      {/* =====================================================
          BACK BUTTON
      ===================================================== */}

      <button
        type="button"
        className="assign-duty-back"
        onClick={onBack}
      >
        ← Back to Dashboard
      </button>

      {/* =====================================================
          DAILY ASSIGNMENTS
      ===================================================== */}

      <section className="assign-duty-card">
        <div className="assign-duty-section-header">
          <div>
            <p className="assign-duty-section-label">
              DAILY ASSIGNMENTS
            </p>

            <h2>Assigned Duties</h2>

            <p>
              View duties that have already been assigned to workers.
            </p>
          </div>
        </div>

        {/* SEARCH */}

        <div className="assign-duty-search">
          <input
            type="text"
            placeholder="Search by date, duty or worker name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ASSIGNMENT LIST */}

        {dutiesLoading ? (
          <div className="assign-duty-empty">
            <div className="assign-duty-loading-spinner"></div>
            <p>Loading assignments...</p>
          </div>
        ) : filteredDuties.length === 0 ? (
          <div className="assign-duty-empty">
            <p>
              {searchTerm
                ? "No matching assignments found."
                : "No duties have been assigned yet."}
            </p>
          </div>
        ) : (
          <div className="assign-duty-table-wrapper">
            <table className="assign-duty-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Duty</th>
                  <th>Worker</th>
                </tr>
              </thead>

              <tbody>
                {filteredDuties.map((duty) => (
                  <tr key={duty._id}>
                    <td>
                      {new Date(
                        duty.dutyDate
                      ).toLocaleDateString("en-GB")}
                    </td>

                    <td>{duty.dutyType}</td>

                    <td>
                      {duty.workerId?.name || "Worker not found"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          ASSIGN DUTY FORM
      ===================================================== */}

      <section className="assign-duty-card">
        <div className="assign-duty-section-header">
          <div>
            <p className="assign-duty-section-label">
              ASSIGN DUTY
            </p>

            <h2>Assign a New Duty</h2>

            <p>
              Select a date, duty and worker.
            </p>
          </div>
        </div>

        <div className="assign-duty-form-grid">
          {/* DATE */}

          <div className="assign-duty-field">
            <label htmlFor="duty-date">
              Date
            </label>

            <input
              id="duty-date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedDuty("");
                setSelectedWorker("");
              }}
            />
          </div>

          {/* DUTY */}

          <div className="assign-duty-field">
            <label htmlFor="duty-type">
              Duty
            </label>

            <select
              id="duty-type"
              value={selectedDuty}
              onChange={(e) => setSelectedDuty(e.target.value)}
              disabled={!selectedDate}
            >
              <option value="">
                Select duty
              </option>

              {dutyTypes.map((dutyType) => (
                <option key={dutyType} value={dutyType}>
                  {dutyType}
                </option>
              ))}
            </select>
          </div>

          {/* WORKER */}

          <div className="assign-duty-field">
            <label htmlFor="duty-worker">
              Worker Name
            </label>

            <select
              id="duty-worker"
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              disabled={!selectedDate || loading}
            >
              <option value="">
                Select worker
              </option>

              {workers.map((worker) => (
                <option
                  key={worker._id}
                  value={worker._id}
                  disabled={isWorkerAlreadyAssigned(worker._id)}
                >
                  {worker.name}
                  {isWorkerAlreadyAssigned(worker._id)
                    ? " (Already Assigned)"
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ASSIGN BUTTON */}

        <div className="assign-duty-action">
          <Button
            onClick={handleAssign}
            disabled={
              assigning ||
              !selectedDate ||
              !selectedDuty ||
              !selectedWorker
            }
          >
            {assigning ? "Assigning..." : "Assign Worker"}
          </Button>
        </div>
      </section>
    </main>
  );
};

export default AssignDuty;
