import { useSiteConfig } from '../context/SiteConfigContext';
import PageHead from '../components/PageHead';
import WaveDivider from '../components/WaveDivider';
import TagCloud from '../components/TagCloud';

export default function Story() {
  const { story } = useSiteConfig();

  return (
    <>
      <PageHead eyebrow={story.eyebrow} title={story.title} />
      <WaveDivider color={story.waveColor} />
      <div className="story-text">
        {story.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <TagCloud tags={story.tags} />
    </>
  );
}
