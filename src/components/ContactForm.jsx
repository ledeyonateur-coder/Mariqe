import { useState } from 'react';
import Button from './Button';

export default function ContactForm({ fields, submitLabel, confirmMessage }) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    e.target.reset();
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea id={field.name} name={field.name} required={field.required} />
          ) : (
            <input id={field.name} name={field.name} type={field.type} required={field.required} />
          )}
        </div>
      ))}
      <Button variant="primary" type="submit">{submitLabel}</Button>
      {submitted && <p className="form-confirm">{confirmMessage}</p>}
    </form>
  );
}
