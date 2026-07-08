export default function CategoryPill({ category, active, onClick }) {
  const fallbackChar = (category.name || 'C').slice(0, 1).toUpperCase();
  return (
    <button
      className={`chip-btn ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="chip-media">
        {category.image ? (
          <img src={category.image} alt={category.name} className="chip-image" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <span className="chip-fallback">{fallbackChar}</span>
        )}
      </div>
      {category.name}
    </button>
  );
}
