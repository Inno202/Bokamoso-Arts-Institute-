import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';
import { useContent } from '../../content/store';
import { contentImage } from '../../content/image';

const LINKS = {
  traditions: ROUTES.TRADITIONS,
  events: ROUTES.EVENTS,
  about: ROUTES.ABOUT,
  programs: ROUTES.PROGRAMS,
  donate: ROUTES.DONATE,
} as const;

export default function Home() {
  const { hero, stats, philosophy, community, highlights } = useContent('home');
  const { partners } = useContent('site');

  return (
    <div>
      <section className="relative py-24 md:py-32 overflow-hidden bg-bai-black text-white">
        <div className="absolute inset-0" aria-hidden="true">
          <img src={contentImage(hero.image, 1600)} alt="" fetchPriority="high" decoding="async" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-bai-black via-transparent to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl hero-rise">
            <h1 className="display text-4xl sm:text-5xl md:text-7xl mb-6 md:mb-8">
              Bokamoso <br /> <span className="text-bai-red-soft">Arts Institute</span>
            </h1>
            <p className="text-white/85 text-lg md:text-2xl font-light mb-4 leading-relaxed max-w-2xl">{hero.text}</p>
            {hero.tagline && <p className="font-serif italic text-white text-xl md:text-2xl mb-10">{hero.tagline}</p>}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={ROUTES.EVENTS} className="btn btn-lg btn-accent-light">
                <span>See upcoming events</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to={ROUTES.DONATE} className="btn btn-lg btn-outline-light">Support the choir</Link>
            </div>
          </div>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="bg-white border-b border-bai-black/10" aria-label="Our impact">
          <dl className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-bai-black/10">
            {stats.map((stat) => (
              <div key={stat.label} className="py-8 sm:py-10 sm:px-8 first:sm:pl-0 last:sm:pr-0 flex flex-col-reverse">
                <dt>
                  <span className="block font-display font-bold uppercase tracking-wide text-sm text-bai-red mt-2">{stat.label}</span>
                  {stat.detail && <span className="block text-sm text-bai-black/70 mt-1">{stat.detail}</span>}
                </dt>
                <dd className="num font-display font-bold text-5xl md:text-6xl tracking-tight leading-none">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="py-20 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="aspect-[4/5] bg-bai-black overflow-hidden rounded-2xl">
            <img src={contentImage(philosophy.image, 1000)} alt="The Bokamoso choir singing" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="display text-4xl md:text-7xl leading-[0.95] mb-8">
              {philosophy.headingLine1} {philosophy.headingLine2 && <><br /><span className="text-bai-blue">{philosophy.headingLine2}</span></>}
            </h2>
            <p className="text-bai-black/75 text-lg md:text-2xl leading-relaxed font-serif italic mb-10">{philosophy.quote}</p>
            <Link to={ROUTES.ABOUT} className="btn btn-lg btn-primary">
              <span>{philosophy.buttonLabel}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-20 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 md:mb-14 max-w-3xl">
            <h2 className="display text-4xl md:text-7xl">
              {community.headingLine1} {community.headingLine2 && <span className="text-bai-red">{community.headingLine2}</span>}
            </h2>
            {community.caption && <p className="text-bai-black/75 text-lg md:text-xl mt-5">{community.caption}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {community.images.map((image) => (
              <div key={image} className="group overflow-hidden rounded-2xl bg-bai-black aspect-[4/5] sm:aspect-[3/4]">
                <img src={contentImage(image)} alt="Bokamoso choir members with the Mabopane community" loading="lazy" decoding="async" className="w-full h-full object-cover photo-zoom" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {highlights.items.length > 0 && (
        <section className="bg-bai-black py-20 md:py-28 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 md:mb-16">
              <h2 className="display text-4xl md:text-7xl">
                {highlights.headingLine1} {highlights.headingLine2 && <span className="text-bai-red-soft">{highlights.headingLine2}</span>}
              </h2>
              {highlights.intro && <p className="text-white/80 text-lg mt-4">{highlights.intro}</p>}
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
              {highlights.items.map((item) => (
                <li key={item.title} className="border-t-2 border-white/25 pt-6">
                  {item.date && <p className="num font-display font-bold text-bai-blue-soft text-lg mb-3">{item.date}</p>}
                  <h3 className="font-display font-bold uppercase text-3xl md:text-4xl leading-tight mb-4">{item.title}</h3>
                  <p className="text-white/80 text-base md:text-lg leading-relaxed mb-6 max-w-[60ch]">{item.text}</p>
                  <Link to={LINKS[item.linkTo]} className="btn btn-outline-light">
                    <span>{item.linkLabel}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {partners.length > 0 && (
        <section className="py-14 md:py-20 bg-white px-4 border-b border-bai-black/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center font-display font-bold text-lg uppercase tracking-wide mb-8">Our Partners</h2>
            <ul className="flex flex-wrap justify-center gap-x-10 gap-y-4 md:gap-x-14 text-bai-black/75">
              {partners.map((partner) => (
                <li key={partner.name} className="font-display font-bold text-xl md:text-2xl uppercase tracking-wide">{partner.name}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
