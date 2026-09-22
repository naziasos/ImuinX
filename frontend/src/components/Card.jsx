function Card({
  children,
  title,
  subtitle,
  className = "",
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      {(title || subtitle) && (
        <div className="px-6 pt-6">
          {title && (
            <h2 className="text-lg font-bold text-slate-800">
              {title}
            </h2>
          )}

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export default Card;