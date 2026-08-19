import { useSiteConfig } from '../context/SiteConfigContext';
import PageHead from '../components/PageHead';
import WaveDivider from '../components/WaveDivider';
import ContactForm from '../components/ContactForm';

export default function Contact() {
  const { contact } = useSiteConfig();

  return (
    <>
      <PageHead eyebrow={contact.eyebrow} title={contact.title} />
      <WaveDivider color={contact.waveColor} />
      <div className="contact-wrap">
        <ContactForm
          fields={contact.fields}
          submitLabel={contact.submitLabel}
          confirmMessage={contact.confirmMessage}
        />
        <div className="contact-side">
          <h3>{contact.side.heading}</h3>
          <p dangerouslySetInnerHTML={{ __html: contact.side.text }} />
          <h3 style={{ marginTop: 20 }}>{contact.side.socialHeading}</h3>
          <div className="social-tags">
            {contact.side.social.map((s) => (
              <a key={s.label} href={s.href}>{s.label}</a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
