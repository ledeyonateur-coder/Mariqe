export default function SectionTitle({ number, title }) {
  return (
    <h2 className="section-title">
      {number && <span className="n">{number}</span>}
      {title}
    </h2>
  );
}
