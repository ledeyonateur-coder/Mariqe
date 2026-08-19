import { useState } from 'react';
import Button from './Button';

export default function Newsletter({ title, text, placeholder, buttonLabel, confirmMessage }) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    e.target.reset();
  }

  return (
    <div className="newsletter">
      <h3>{title}</h3>
      <p>{text}</p>
      <form className="nl-form" onSubmit={handleSubmit}>
        <input type="email" placeholder={placeholder} required />
        <Button variant="primary" type="submit">{buttonLabel}</Button>
      </form>
      {submitted && <p className="nl-msg">{confirmMessage}</p>}
    </div>
  );
}
