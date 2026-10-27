import Icon from "./Icons";

// tone: "blue" | "teal" | "green" | "amber"
// onClick (optional): makes the whole card a button.
function StatCard({ icon, label, value, hint, tone = "blue", loading = false, onClick }) {
  const clickableProps = onClick
    ? {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      className={`cz-stat cz-stat--${tone} ${onClick ? "cz-stat--clickable" : ""}`}
      {...clickableProps}
    >
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