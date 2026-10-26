const TONES = {
  confirmed: "green",
  completed: "blue",
  accepted: "blue",
  pending: "amber",
  scheduled: "amber",
  cancelled: "red",
  canceled: "red",
  rejected: "red",
  missed: "red",
};

function StatusBadge({ status }) {
  const tone = TONES[String(status || "").toLowerCase()] || "gray";

  return <span className={`cz-badge cz-badge--${tone}`}>{status || "Unknown"}</span>;
}

export default StatusBadge;