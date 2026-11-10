import { useContent } from '../../content/store';
import { contentImage } from '../../content/image';
import { PageHero } from '../components/PageHero';

export default function About() {
  const { hero, badge, story, valuesHeading, values, management, choirPictures } = useContent('about');
  const storyImage = choirPictures[0] || 'assets/philosophy.jpg';

  return (
    <div className="bg-bai-bone">
      <PageHero line1="About" line2="Bokamoso." label={hero.label} quote={hero.quote} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          <h2 className="display text-4xl md:text-6xl">{story.title}</h2>
          {badge && <p className="font-serif italic text-bai-red text-xl mt-3">{badge}</p>}
          <p className="text-bai-black/75 text-lg md:text-xl leading-relaxed mt-8 max-w-[65ch] whitespace-pre-line">{story.description}</p>
          {story.stats.length > 0 && (
            <dl className="flex flex-wrap gap-x-12 gap-y-6 pt-8 mt-10 border-t border-bai-black/15">
              {story.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="font-display font-bold uppercase tracking-wide text-sm text-bai-red mt-1">{stat.label}</dt>
                  <dd className="num text-4xl font-display font-bold leading-none">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="aspect-[4/5] bg-bai-black rounded-2xl overflow-hidden">
          <img src={contentImage(storyImage, 1000)} alt="The Bokamoso choir" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        </div>
      </section>

      {values.length > 0 && (
        <section className="bg-bai-black text-white py-20 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="display text-3xl md:text-5xl mb-12 md:mb-16 text-bai-blue-soft">{valuesHeading}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-10">
              {values.map((value) => (
                <li key={value.title} className="border-t-2 border-white/25 pt-5">
                  <h3 className="font-display font-bold text-xl uppercase tracking-wide text-bai-red-soft mb-3">{value.title}</h3>
                  <p className="text-white/80 leading-relaxed">{value.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {management.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="display text-4xl md:text-7xl mb-12 md:mb-16">Management <span className="text-bai-red">Team.</span></h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {management.map((member) => (
              <li key={`${member.name}-${member.role}`}>
                <div className="aspect-square rounded-2xl overflow-hidden bg-bai-black/10 mb-5">
                  {member.image && (
                    <img src={contentImage(member.image, 700)} alt={member.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  )}
                </div>
                <h3 className="font-display font-bold text-2xl uppercase leading-tight">{member.name}</h3>
                <p className="font-display font-bold text-bai-red mt-1">{member.role}</p>
                {member.desc && <p className="text-bai-black/75 leading-relaxed mt-3">{member.desc}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {choirPictures.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
          <h2 className="display text-3xl md:text-5xl mb-10">Choir.</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {choirPictures.map((picture) => (
              <li key={picture} className="group aspect-square rounded-2xl overflow-hidden bg-bai-black/10">
                <img src={contentImage(picture, 600)} alt="The Bokamoso choir" loading="lazy" decoding="async" className="w-full h-full object-cover photo-zoom" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
