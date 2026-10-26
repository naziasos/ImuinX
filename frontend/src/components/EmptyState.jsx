import Icon from "./Icons";

function EmptyState({ icon = "syringe", title, text, action }) {
  return (
    <div className="cz-empty">
      <span className="cz-empty__icon">
        <Icon name={icon} size={30} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export default EmptyState;