import { useContent } from '../../content/store';
import { contentImage } from '../../content/image';
import { ZoomablePhoto } from '../components/ZoomablePhoto';
import { PageHero } from '../components/PageHero';

export default function About() {
  const { heroImage, story, valuesHeading, values, management, choirPictures } = useContent('about');
  const storyImage = choirPictures[0] || 'assets/philosophy.jpg';
  const teamWithPhotos = management.filter(member => member.image);
  const teamPhotos = teamWithPhotos.map(member => ({ src: contentImage(member.image, 2000), alt: member.name }));
  const choirPhotos = choirPictures.map(picture => ({ src: contentImage(picture, 2000), alt: 'The Bokamoso choir' }));

  return (
    <div>
      <PageHero title="About" accent="Bokamoso" image={heroImage} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          <h2 className="display text-5xl md:text-7xl">{story.title}</h2>
          <p className="text-bai-ink-soft text-lg md:text-xl leading-relaxed mt-8 max-w-[62ch] whitespace-pre-line">{story.description}</p>
          {story.stats.length > 0 && (
            <dl className="flex flex-wrap gap-x-12 gap-y-6 pt-8 mt-10 border-t border-bai-black/15">
              {story.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="font-semibold mt-1">{stat.label}</dt>
                  <dd className="num font-serif font-semibold text-6xl leading-none text-bai-red">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="frame aspect-[4/5]">
          <ZoomablePhoto src={contentImage(storyImage, 1000)} largeSrc={contentImage(storyImage, 2000)} alt="The Bokamoso choir" />
        </div>
      </section>

      {values.length > 0 && (
        <section className="px-3 sm:px-4">
          <div className="rounded-[2rem] bg-bai-black text-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <h2 className="display text-5xl md:text-6xl mb-12 md:mb-14 text-bai-blue-soft">{valuesHeading}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-10">
              {values.map((value) => (
                <li key={value.title} className="border-t border-white/20 pt-5">
                  <h3 className="font-serif font-semibold text-2xl text-white mb-3">{value.title}</h3>
                  <p className="text-white/75 leading-relaxed">{value.desc}</p>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </section>
      )}

      {management.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="display text-5xl md:text-7xl mb-12 md:mb-16">Management <span className="text-bai-red">team</span></h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {management.map((member) => (
              <li key={`${member.name}-${member.role}`}>
                <div className="frame aspect-square mb-5">
                  {member.image && (
                    <ZoomablePhoto src={contentImage(member.image, 700)} largeSrc={contentImage(member.image, 2000)} alt={member.name} group={teamPhotos} index={teamWithPhotos.indexOf(member)} />
                  )}
                </div>
                <h3 className="font-serif font-semibold text-3xl leading-tight">{member.name}</h3>
                <p className="font-semibold text-bai-red-deep mt-1">{member.role}</p>
                {member.desc && <p className="text-bai-ink-soft leading-relaxed mt-3">{member.desc}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {choirPictures.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
          <h2 className="display text-5xl md:text-6xl mb-10">The <span className="text-bai-blue">choir</span></h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {choirPictures.map((picture, i) => (
              <li key={picture} className="group frame aspect-square">
                <ZoomablePhoto src={contentImage(picture, 600)} largeSrc={contentImage(picture, 2000)} alt="The Bokamoso choir" className="w-full h-full object-cover photo-zoom" group={choirPhotos} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
