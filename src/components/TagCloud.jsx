export default function TagCloud({ tags }) {
  return (
    <div className="tag-cloud">
      {tags.map((tag, i) => (
        <span key={i} className={`tag${tag.accent ? ' accent' : ''}`}>{tag.label}</span>
      ))}
    </div>
  );
}
