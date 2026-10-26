import Icon from "./Icons";

// Standard header for every citizen page: eyebrow + title + description,
// with an optional action area on the right (buttons, counters, ...).
function PageHeader({ eyebrow, title, description, icon, actions }) {
  return (
    <header className="cz-page-header">
      <div className="cz-page-header__main">
        {icon && (
          <span className="cz-page-header__icon">
            <Icon name={icon} size={24} />
          </span>
        )}
        <div>
          {eyebrow && <p className="cz-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="cz-page-header__desc">{description}</p>}
        </div>
      </div>

      {actions && <div className="cz-page-header__actions">{actions}</div>}
    </header>
  );
}

export default PageHeader;