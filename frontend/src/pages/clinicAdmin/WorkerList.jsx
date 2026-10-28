import React, { useEffect, useMemo, useState } from "react";
import "./WorkerList.css";

function WorkerList({ onAddWorker }) {
  const [workers, setWorkers] = useState([]);
  const [clinic, setClinic] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  // DELETE CONFIRMATION POPUP
  const [workerToDelete, setWorkerToDelete] = useState(null);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      setError("");

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
        throw new Error(data.message || "Failed to load workers");
      }

      setWorkers(data.workers || []);
      setClinic(data.clinic || null);
    } catch (err) {
      setError(err.message || "Could not load workers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const visibleWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = workers.filter(
      (worker) =>
        !query ||
        worker.name?.toLowerCase().includes(query) ||
        worker.email?.toLowerCase().includes(query)
    );

    return [...filtered].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();

      return sortNewest ? bDate - aDate : aDate - bDate;
    });
  }, [workers, search, sortNewest]);

  // OPEN WORKER PROFILE
  const openProfile = async (workerId) => {
    try {
      setProfileLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/clinics/my-clinic/workers/${workerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load worker profile"
        );
      }

      setSelectedWorker(data.worker);
    } catch (err) {
      setError(err.message || "Could not load worker profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // STEP 1:
  // Open confirmation popup
  const askDeleteWorker = (worker) => {
    setWorkerToDelete(worker);
  };

  // STEP 2:
  // Actually delete worker after clicking DELETE in popup
  const confirmDeleteWorker = async () => {
    if (!workerToDelete) return;

    const worker = workerToDelete;

    try {
      setDeletingId(worker._id);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/clinics/my-clinic/workers/${worker._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete worker"
        );
      }

      // Remove worker from current list
      setWorkers((current) =>
        current.filter((item) => item._id !== worker._id)
      );

      // Close worker profile if that worker was open
      if (selectedWorker?._id === worker._id) {
        setSelectedWorker(null);
      }

      // Close confirmation popup
      setWorkerToDelete(null);
    } catch (err) {
      setError(err.message || "Could not delete worker");
    } finally {
      setDeletingId(null);
    }
  };

  // CANCEL DELETE
  const cancelDeleteWorker = () => {
    if (deletingId) return;

    setWorkerToDelete(null);
  };

  return (
    <div className="worker-list-page">

      {/* HEADER */}
      <header className="worker-list-header">
        <div>
          <p className="worker-list-eyebrow">
            CLINIC TEAM
          </p>

          <h1>Workers</h1>

          <p>
            View your clinic workers, inspect their profiles,
            and manage their accounts.
          </p>
        </div>

        <button
          className="worker-list-add"
          onClick={onAddWorker}
        >
          + Add Worker
        </button>
      </header>

      {/* CLINIC INFORMATION */}
      {clinic && (
        <div className="worker-list-clinic-bar">
          <span>🏥</span>

          <div>
            <strong>{clinic.name}</strong>
            <small>{clinic.location}</small>
          </div>

          <b>
            {workers.length}{" "}
            {workers.length === 1 ? "Worker" : "Workers"}
          </b>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="worker-list-error">
          {error}
        </div>
      )}

      {/* SEARCH + SORT */}
      <section className="worker-list-toolbar">

        <div className="worker-search">
          <span>⌕</span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worker name or email..."
          />
        </div>

        <button
          className="worker-sort"
          onClick={() =>
            setSortNewest((value) => !value)
          }
        >
          {sortNewest
            ? "Newest first ↓"
            : "Oldest first ↑"}
        </button>

      </section>

      {/* LOADING */}
      {loading ? (
        <div className="worker-list-empty">
          <div className="worker-list-spinner" />

          <p>
            Loading workers...
          </p>
        </div>

      ) : visibleWorkers.length === 0 ? (

        /* EMPTY */
        <div className="worker-list-empty">

          <div className="worker-empty-icon">
            👥
          </div>

          <h2>
            {search
              ? "No matching workers"
              : "No workers yet"}
          </h2>

          <p>
            {search
              ? "Try another name or email."
              : "Add your first clinic worker to start building the team."}
          </p>

          {!search && (
            <button
              className="worker-list-add"
              onClick={onAddWorker}
            >
              + Add First Worker
            </button>
          )}

        </div>

      ) : (

        /* WORKER CARDS */
        <section className="worker-cards-grid">

          {visibleWorkers.map((worker, index) => (

            <article
              className="worker-management-card"
              key={worker._id}
            >

              <div className="worker-management-top">

                <div className="worker-management-avatar">
                  {worker.name
                    ?.charAt(0)
                    ?.toUpperCase() || "W"}
                </div>

                <div className="worker-management-main">

                  <div className="worker-name-line">

                    <h3>
                      {worker.name}
                    </h3>

                    {index === 0 && sortNewest && (
                      <span className="new-worker-badge">
                        NEWEST
                      </span>
                    )}

                  </div>

                  <p>
                    {worker.email}
                  </p>

                </div>

              </div>

              <div className="worker-management-meta">

                <span>
                  👩‍⚕️ Health Worker
                </span>

                <span>
                  Joined{" "}
                  {worker.createdAt
                    ? new Date(
                        worker.createdAt
                      ).toLocaleDateString()
                    : "—"}
                </span>

              </div>

              {/* ACTION BUTTONS */}
              <div className="worker-management-actions">

                <button
                  onClick={() =>
                    openProfile(worker._id)
                  }
                >
                  View Profile
                </button>

                <button
                  className="worker-delete-btn"
                  disabled={
                    deletingId === worker._id
                  }
                  onClick={() =>
                    askDeleteWorker(worker)
                  }
                >
                  Delete
                </button>

              </div>

            </article>

          ))}

        </section>
      )}

      {/* =========================
          WORKER PROFILE POPUP
         ========================= */}

      {selectedWorker && (

        <div
          className="worker-profile-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setSelectedWorker(null);
            }
          }}
        >

          <div className="worker-profile-modal">

            <button
              className="worker-modal-close"
              onClick={() =>
                setSelectedWorker(null)
              }
              aria-label="Close"
            >
              ×
            </button>

            <div className="worker-profile-hero">

              <div className="worker-profile-avatar-large">
                {selectedWorker.name
                  ?.charAt(0)
                  ?.toUpperCase() || "W"}
              </div>

              <div>

                <span>
                  WORKER PROFILE
                </span>

                <h2>
                  {selectedWorker.name}
                </h2>

                <p>
                  Health Worker · Read only
                </p>

              </div>

            </div>

            <div className="worker-profile-grid">

              <div>
                <label>
                  Full Name
                </label>

                <strong>
                  {selectedWorker.name || "—"}
                </strong>
              </div>

              <div>
                <label>
                  Email
                </label>

                <strong>
                  {selectedWorker.email || "—"}
                </strong>
              </div>

              <div>
                <label>
                  Phone
                </label>

                <strong>
                  {selectedWorker.phoneNumber ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <label>
                  Date of Birth
                </label>

                <strong>
                  {selectedWorker.dateOfBirth
                    ? new Date(
                        selectedWorker.dateOfBirth
                      ).toLocaleDateString()
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <label>
                  Blood Type
                </label>

                <strong>
                  {selectedWorker.bloodType ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <label>
                  Joined
                </label>

                <strong>
                  {selectedWorker.createdAt
                    ? new Date(
                        selectedWorker.createdAt
                      ).toLocaleDateString()
                    : "—"}
                </strong>
              </div>

            </div>

            <div className="worker-readonly-note">
              🔒 This profile is view-only for the
              Clinic Admin. Worker personal information
              cannot be edited here.
            </div>

            <div className="worker-profile-footer">

              <button
                onClick={() =>
                  setSelectedWorker(null)
                }
              >
                Close
              </button>

              <button
                className="worker-profile-delete"
                onClick={() =>
                  askDeleteWorker(selectedWorker)
                }
                disabled={
                  deletingId === selectedWorker._id
                }
              >
                Delete Worker Permanently
              </button>

            </div>

          </div>

        </div>
      )}

      {/* PROFILE LOADING */}
      {profileLoading && (
        <div className="worker-profile-loading">
          Loading profile...
        </div>
      )}

      {/* =========================
          DELETE CONFIRMATION POPUP
         ========================= */}

      {workerToDelete && (

        <div
          className="delete-confirm-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !deletingId
            ) {
              cancelDeleteWorker();
            }
          }}
        >

          <div className="delete-confirm-modal">

            {/* WARNING ICON */}
            <div className="delete-warning-icon">
              ⚠️
            </div>

            <h2>
              Delete Worker?
            </h2>

            <p>
              Are you sure you want to permanently
              delete{" "}
              <strong>
                {workerToDelete.name}
              </strong>
              ?
            </p>

            <p className="delete-warning-text">
              This will remove the worker's account.
            </p>

            <div className="delete-confirm-actions">

              <button
                className="delete-cancel-btn"
                onClick={cancelDeleteWorker}
                disabled={!!deletingId}
              >
                Cancel
              </button>

              <button
                className="delete-confirm-btn"
                onClick={confirmDeleteWorker}
                disabled={!!deletingId}
              >
                {deletingId
                  ? "Deleting..."
                  : "Delete"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default WorkerList;