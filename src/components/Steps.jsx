import SectionTitle from './SectionTitle';

export default function Steps({ number, title, items }) {
  return (
    <section>
      <SectionTitle number={number} title={title} />
      <div className="steps-row">
        {items.map((step, i) => (
          <div className="step" key={i}>
            <span className="n-badge">{step.badge}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
