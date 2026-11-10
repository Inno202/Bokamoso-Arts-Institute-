import { useContent } from '../../content/store';
import { contentImage } from '../../content/image';
import { PageHero } from '../components/PageHero';

export default function Programs() {
  const { hero, pillars, gallery, projects, outreach } = useContent('work');

  return (
    <div className="bg-bai-bone">
      <PageHero line1="Our" line2="Work" accent="blue" label={hero.tagline} quote={hero.description} />

      {pillars.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
            {pillars.map((pillar) => (
              <li key={pillar.title} className="border-t-4 border-bai-black pt-6">
                <h2 className="font-display font-bold text-2xl italic uppercase tracking-tight mb-4">{pillar.title}</h2>
                <p className="text-bai-black/75 text-lg leading-relaxed">{pillar.desc}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {projects.length > 0 && (
        <section className="py-20 md:py-24 bg-bai-black text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="display text-4xl md:text-7xl mb-12 md:mb-16">
              {gallery.headingLine1} {gallery.headingLine2 && <><br /><span className="text-bai-blue-soft">{gallery.headingLine2}</span></>}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {projects.map((project) => (
                <li key={project.title} className="group relative aspect-[4/5] bg-bai-charcoal overflow-hidden rounded-2xl">
                  {project.imageUrl && (
                    <>
                      <img src={contentImage(project.imageUrl)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover photo-zoom" />
                      <div className="absolute inset-0 bg-gradient-to-t from-bai-black/90 via-transparent to-transparent" aria-hidden="true" />
                    </>
                  )}
                  <h3 className="absolute bottom-0 left-0 p-6 md:p-8 text-xl font-display font-bold uppercase italic">{project.title}</h3>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          {outreach.label && <p className="font-serif italic text-bai-red text-xl mb-3">{outreach.label}</p>}
          <h2 className="display text-3xl sm:text-4xl md:text-6xl mb-6 md:mb-8">{outreach.title}</h2>
          <p className="text-bai-black/75 text-xl leading-relaxed font-serif italic max-w-[60ch]">{outreach.description}</p>
          {outreach.stats.length > 0 && (
            <dl className="flex flex-wrap gap-x-12 gap-y-6 pt-8 mt-10 border-t border-bai-black/15">
              {outreach.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="font-display font-bold uppercase tracking-wide text-sm text-bai-red mt-1">{stat.label}</dt>
                  <dd className="num font-display font-bold text-4xl md:text-5xl italic leading-none">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="aspect-square bg-bai-black overflow-hidden relative rounded-2xl">
          {outreach.imageUrl && (
            <img src={contentImage(outreach.imageUrl, 1000)} alt="Community outreach performance" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          )}
          {outreach.badge && (
            <p className="absolute bottom-0 left-0 px-6 py-4 bg-bai-red text-white font-display font-bold uppercase text-lg leading-none">{outreach.badge}</p>
          )}
        </div>
      </section>
    </div>
  );
}
