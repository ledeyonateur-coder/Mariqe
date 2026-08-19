export default function PageHead({ eyebrow, title, lede }) {
  return (
    <div className="page-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="page-title">{title}</h1>
      {lede && <p className="page-lede">{lede}</p>}
    </div>
  );
}
