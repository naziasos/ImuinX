import Icon from "./Icons";

// tone: "blue" | "teal" | "green" | "amber"
function StatCard({ icon, label, value, hint, tone = "blue", loading = false }) {
  return (
    <div className={`cz-stat cz-stat--${tone}`}>
      <span className="cz-stat__icon">
        <Icon name={icon} size={22} />
      </span>

      <div className="cz-stat__body">
        <p>{label}</p>
        {loading ? (
          <span className="cz-skeleton cz-skeleton--stat" />
        ) : (
          <strong>{value}</strong>
        )}
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

export default StatCard;