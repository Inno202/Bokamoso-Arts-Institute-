import { ArrowUpRight, Facebook, Instagram, Youtube } from 'lucide-react';
import { useContent } from '../../content/store';
import { contentImage } from '../../content/image';
import { ZoomablePhoto } from '../components/ZoomablePhoto';
import { PageHero } from '../components/PageHero';

const FOLLOW = {
  youtube: { name: 'YouTube', Icon: Youtube },
  facebook: { name: 'Facebook', Icon: Facebook },
  instagram: { name: 'Instagram', Icon: Instagram },
} as const;

export default function Programs() {
  const { heroImage, pillars, gallery, projects, outreach } = useContent('work');
  const { socials } = useContent('site');
  const projectsWithPhotos = projects.filter(project => project.imageUrl);
  const projectPhotos = projectsWithPhotos.map(project => ({ src: contentImage(project.imageUrl, 2000), alt: project.title }));
  // The links come from Site content, so they change in one place for the whole site.
  const follow = (['youtube', 'facebook', 'instagram'] as const)
    .map(network => ({ ...FOLLOW[network], url: socials.find(s => s.network === network)?.url }))
    .filter((item): item is typeof item & { url: string } => !!item.url);

  return (
    <div>
      <PageHero title="Our" accent="work" image={heroImage} />

      {pillars.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
            {pillars.map((pillar, i) => (
              <li key={pillar.title} className="border-t border-bai-black/15 pt-6">
                <span className={`block w-10 h-1 rounded-full mb-5 ${['bg-bai-red', 'bg-bai-blue', 'bg-bai-black'][i % 3]}`} aria-hidden="true" />
                <h2 className="font-serif font-semibold text-3xl mb-3">{pillar.title}</h2>
                <p className="text-bai-ink-soft text-lg leading-relaxed">{pillar.desc}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {projects.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
          <h2 className="display text-5xl md:text-7xl mb-10 md:mb-12">
            {gallery.headingLine1}{gallery.headingLine2 && <> <span className="text-bai-blue">{gallery.headingLine2}</span></>}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((project) => (
              <li key={project.title} className="group relative frame aspect-[4/5] bg-bai-black">
                {project.imageUrl && (
                  <ZoomablePhoto src={contentImage(project.imageUrl)} largeSrc={contentImage(project.imageUrl, 2000)} alt={project.title} className="w-full h-full object-cover photo-zoom" group={projectPhotos} index={projectsWithPhotos.indexOf(project)} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
                <h3 className="absolute bottom-0 left-0 p-6 md:p-7 pointer-events-none font-serif font-semibold text-2xl md:text-3xl text-white">{project.title}</h3>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-3 sm:px-4">
        <div className="rounded-[2rem] bg-bai-sand">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div>
              <h2 className="display text-4xl sm:text-5xl md:text-6xl mb-6">{outreach.title}</h2>
              <p className="text-bai-ink-soft text-xl leading-relaxed max-w-[52ch]">{outreach.description}</p>
              {outreach.stats.length > 0 && (
                <dl className="flex flex-wrap gap-x-14 gap-y-6 mt-10">
                  {outreach.stats.map((stat) => (
                    <div key={stat.label} className="flex flex-col-reverse">
                      <dt className="font-semibold mt-1">{stat.label}</dt>
                      <dd className="num font-serif font-semibold text-6xl leading-none text-bai-red">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div className="frame aspect-square relative bg-bai-black">
              {outreach.imageUrl && (
                <ZoomablePhoto src={contentImage(outreach.imageUrl, 1000)} largeSrc={contentImage(outreach.imageUrl, 2000)} alt="The choir performing for the community" />
              )}
            </div>
          </div>
        </div>
      </section>

      {follow.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28" aria-labelledby="follow-heading">
          <h2 id="follow-heading" className="display text-5xl md:text-6xl mb-10">Follow our <span className="text-bai-red">work</span></h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {follow.map(({ name, url, Icon }) => (
              <li key={name}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group lift panel flex items-center gap-5 p-6 h-full"
                >
                  <span className="w-14 h-14 rounded-full bg-bai-black text-white flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-bai-red">
                    <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="flex-grow min-w-0 font-serif font-semibold text-2xl">{name}</span>
                  <ArrowUpRight size={20} className="shrink-0 text-bai-ink-soft transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
