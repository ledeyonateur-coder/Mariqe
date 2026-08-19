export default function Filters({ filters, active, onChange }) {
  return (
    <div className="filters">
      {filters.map((f) => (
        <button
          key={f.value}
          className={`filter-btn${active === f.value ? ' active' : ''}`}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
