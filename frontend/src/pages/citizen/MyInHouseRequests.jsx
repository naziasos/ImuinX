import { useEffect, useState } from "react";
import { api } from "../../services/api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import Icon from "../../components/Icons";

const STEPS = ["Pending", "Accepted", "Completed"];

const STATUS_MESSAGES = {
  Pending: { tone: "amber", text: "Waiting for a health worker to accept your request." },
  Accepted: { tone: "blue", text: "Your request has been accepted by a health worker." },
  Completed: { tone: "green", text: "Your in-house visit has been completed successfully." },
  Cancelled: { tone: "amber", text: "This request was cancelled." },
};

const MyInHouseRequests = ({ onNewRequest }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // `silent` refreshes in the background without replacing the page with a loader.
  const fetchRequests = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

    const interval = setInterval(() => {
      fetchRequests(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      <PageHeader
        icon="clipboard"
        eyebrow="Home visits"
        title="My In-House Requests"
        description="Follow the progress of the home vaccination visits you have requested."
        actions={
          onNewRequest && (
            <button type="button" className="cz-btn cz-btn--primary" onClick={onNewRequest}>
              <Icon name="plus" size={17} /> New request
            </button>
          )
        }
      />

      {error && (
        <div className="cz-alert cz-alert--error" role="alert">
          <Icon name="alert" size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="cz-card">
          <div className="cz-loading">
            <div className="cz-spinner" />
            <p>Loading your requests…</p>
          </div>
        </div>
      ) : (
        !error &&
        requests.length === 0 && (
          <div className="cz-card">
            <EmptyState
              icon="home"
              title="No in-house visit requests"
              text="Can't travel to a clinic? Request a health worker to visit you at home."
              action={
                onNewRequest && (
                  <button type="button" className="cz-btn cz-btn--primary" onClick={onNewRequest}>
                    <Icon name="plus" size={17} /> Request a visit
                  </button>
                )
              }
            />
          </div>
        )
      )}

      <div className="cz-stack">
        {requests.map((request) => {
          const message = STATUS_MESSAGES[request.status];
          const stepIndex = STEPS.indexOf(request.status);

          return (
            <article key={request._id} className="cz-card">
              <div className="cz-item__top">
                <div>
                  <h3 style={{ fontSize: 18 }}>
                    {request.vaccineOrReason || "In-house visit"}
                  </h3>
                  <p>
                    <Icon name="clock" size={14} />
                    Requested on {formatDate(request.createdAt)}
                  </p>
                </div>

                <StatusBadge status={request.status} />
              </div>

              {/* Progress tracker */}
              {stepIndex >= 0 && (
                <ol className="cz-steps" aria-label="Request progress">
                  {STEPS.map((step, index) => (
                    <li
                      key={step}
                      className={index <= stepIndex ? "is-done" : ""}
                      aria-current={index === stepIndex ? "step" : undefined}
                    >
                      <span>{index < stepIndex ? <Icon name="check" size={14} strokeWidth={3} /> : index + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              )}

              {message && <p className={`cz-note cz-note--${message.tone}`} style={{ marginTop: 0, marginBottom: 16 }}>{message.text}</p>}

              <dl className="cz-facts">
                <div>
                  <dt>For</dt>
                  <dd>{request.familyMember ? request.familyMember.name : "Myself"}</dd>
                </div>
                <div>
                  <dt>Preferred date</dt>
                  <dd>{formatDate(request.preferredDate)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{request.location}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{request.address}</dd>
                </div>
              </dl>

              {request.assignedWorker && (
                <div className="cz-worker">
                  <span className="cz-worker__avatar">
                    {(request.assignedWorker.name || "W").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <small>Assigned health worker</small>
                    <strong>{request.assignedWorker.name}</strong>
                    <p>
                      {[request.assignedWorker.phone, request.assignedWorker.email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
};

export default MyInHouseRequests;