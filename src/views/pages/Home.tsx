import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';
import { useContent } from '../../content/store';
import { contentImage } from '../../content/image';
import { HeroSlideshow } from '../components/HeroSlideshow';
import { useUpcomingEvents } from '../../content/upcoming';
import { ZoomablePhoto } from '../components/ZoomablePhoto';
import { formatCurrency, formatDate, formatTime } from '../../controllers/lib/utils';

const LINKS = {
  traditions: ROUTES.TRADITIONS,
  events: ROUTES.EVENTS,
  about: ROUTES.ABOUT,
  programs: ROUTES.PROGRAMS,
} as const;

/** "Bula Pelo" gets a hand-drawn red line that draws itself in once. */
function Tagline({ text }: { text: string }) {
  const match = text.match(/^(Bula Pelo)(.*)$/i);
  if (!match) return <>{text}</>;
  return (
    <>
      <span className="relative inline-block">
        {match[1]}
        <svg className="squiggle absolute left-0 -bottom-2 w-full h-3 text-bai-red-soft" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 8 C 30 2, 50 11, 80 6 S 140 1, 198 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      {match[2]}
    </>
  );
}

export default function Home() {
  const { hero, stats, philosophy, community, highlights } = useContent('home');
  const { partners } = useContent('site');
  const upcoming = useUpcomingEvents();
  const communityPhotos = community.images.map(image => ({ src: contentImage(image, 2000), alt: 'Bokamoso choir members with the Mabopane community' }));

  return (
    <div>
      <HeroSlideshow images={hero.images}>
        <div className="max-w-3xl hero-rise">
          <h1 className="display text-[3.25rem] leading-[0.95] sm:text-7xl md:text-8xl">
            Bokamoso <span className="block text-white/90">Arts Institute</span>
          </h1>
          {hero.tagline && <p className="font-serif text-2xl md:text-3xl mt-6 md:mt-8"><Tagline text={hero.tagline} /></p>}
          <div className="grid sm:grid-cols-2 gap-3 mt-9 sm:max-w-xl">
            <Link to={ROUTES.EVENTS} className="btn btn-lg btn-light">
              <span>See upcoming events</span>
              <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
            </Link>
            <Link to={ROUTES.ABOUT} className="btn btn-lg btn-outline-light">Meet the choir</Link>
          </div>
        </div>
      </HeroSlideshow>

      {stats.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20" aria-label="Our impact">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse gap-2 border-t border-bai-black/15 pt-5">
                <dt>
                  <span className="block font-semibold text-bai-black">{stat.label}</span>
                  {stat.detail && <span className="block text-bai-ink-soft mt-0.5">{stat.detail}</span>}
                </dt>
                <dd className="num font-serif font-semibold text-6xl md:text-7xl leading-none text-bai-red">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <div className="frame aspect-[4/5]">
            <ZoomablePhoto src={contentImage(philosophy.image, 1000)} largeSrc={contentImage(philosophy.image, 2000)} alt="The Bokamoso choir singing" />
          </div>
          <div>
            <h2 className="display text-5xl md:text-7xl mb-8">
              {philosophy.headingLine1}{philosophy.headingLine2 && <> <span className="text-bai-blue">{philosophy.headingLine2}</span></>}
            </h2>
            <p className="text-bai-ink-soft text-xl md:text-2xl leading-relaxed mb-10 max-w-[34ch]">{philosophy.quote}</p>
            <Link to={ROUTES.ABOUT} className="btn btn-lg btn-primary">
              <span>{philosophy.buttonLabel}</span>
              <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {community.images.length > 0 && (
        <section className="pb-20 md:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 md:mb-12 max-w-3xl">
              <h2 className="display text-5xl md:text-7xl">
                {community.headingLine1}{community.headingLine2 && <> <span className="text-bai-red">{community.headingLine2}</span></>}
              </h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {community.images.map((image, i) => (
                <li key={image + i} className={`group frame aspect-[4/5] ${i === 1 ? 'lg:translate-y-10' : ''}`}>
                  <ZoomablePhoto src={contentImage(image)} largeSrc={contentImage(image, 2000)} alt="Bokamoso choir members with the Mabopane community" className="w-full h-full object-cover photo-zoom" group={communityPhotos} index={i} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28" aria-labelledby="upcoming-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
            <h2 id="upcoming-heading" className="display text-5xl md:text-7xl">Upcoming <span className="text-bai-blue">events</span></h2>
            <Link to={ROUTES.EVENTS} className="btn btn-outline">
              <span>All events</span>
              <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
            </Link>
          </div>
          {/* Filled automatically from events on sale: a new event shows here as soon as it is created. */}
          <ul className="border-t border-bai-black/15">
            {upcoming.map((event) => {
              const date = new Date(event.date);
              return (
                <li key={event.id} className="border-b border-bai-black/15">
                  <Link to={`${ROUTES.EVENTS}/${event.id}`} className="group grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[6rem_1fr_auto] items-center gap-4 sm:gap-8 py-6">
                    <span className="text-center leading-none">
                      <span className="num block font-serif font-semibold text-5xl sm:text-6xl text-bai-red">{formatDate(date, { day: 'numeric' })}</span>
                      <span className="block font-semibold text-bai-ink-soft mt-1">{formatDate(date, { month: 'short' })}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-serif font-semibold text-2xl sm:text-3xl leading-tight truncate group-hover:text-bai-red-deep transition-colors">{event.name}</span>
                      <span className="num block text-bai-ink-soft mt-1 truncate">{[formatTime(event.date), [event.venue, event.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="num hidden sm:inline font-semibold">{event.soldOut ? 'Sold out' : event.price > 0 ? formatCurrency(event.price, event.currency) : 'Free'}</span>
                      <ArrowRight size={20} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {highlights.items.length > 0 && (
        <section className="px-3 sm:px-4">
          <div className="rounded-[2rem] bg-bai-black text-white py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
              <div className="mb-12 md:mb-14">
                <h2 className="display text-5xl md:text-7xl">
                  {highlights.headingLine1}{highlights.headingLine2 && <> <span className="text-bai-red-soft">{highlights.headingLine2}</span></>}
                </h2>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {highlights.items.map((item) => (
                  <li key={item.title}>
                    <Link to={LINKS[item.linkTo]} className="group lift flex flex-col h-full rounded-3xl bg-white/[0.06] hover:bg-white/[0.1] transition-colors p-7 md:p-9">
                      {item.date && <p className="num font-semibold text-bai-blue-soft mb-3">{item.date}</p>}
                      <h3 className="font-serif font-semibold text-3xl md:text-4xl leading-tight mb-3">{item.title}</h3>
                      <p className="text-white/75 text-base md:text-lg leading-relaxed mb-8 max-w-[52ch]">{item.text}</p>
                      <span className="mt-auto inline-flex items-center gap-2 font-medium text-white">
                        {item.linkLabel}
                        <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {partners.length > 0 && (
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center font-sans font-medium text-bai-ink-soft mb-8">With thanks to our partners</h2>
            <ul className="flex flex-wrap justify-center gap-x-10 gap-y-4 md:gap-x-14">
              {partners.map((partner) => (
                <li key={partner.name} className="font-serif font-semibold text-2xl md:text-3xl text-bai-black/70">{partner.name}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
