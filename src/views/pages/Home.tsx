import { Trophy, Music, Heart, Church, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ManagedImage } from '../components/ManagedImage';
import { ROUTES } from '../../controllers/navigation';

export default function Home() {
  const stats = [
    { icon: <Trophy size={32} aria-hidden="true" />, value: '2', label: 'WCG World Titles', detail: 'Gold Medals in South Korea 2023' },
    { icon: <Music size={32} aria-hidden="true" />, value: '250+', label: 'Artists Trained', detail: 'Nurturing local township talent' },
    { icon: <Heart size={32} aria-hidden="true" />, value: '5th', label: 'Annual Prayer', detail: 'Community Soul & Resilience' },
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden bg-bai-black text-white">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          {/* Hero image: replace public/assets/hero.jpg to change it. */}
          <ManagedImage
            priority
            src={`${import.meta.env.BASE_URL}assets/hero.jpg`}
            alt=""
            className="opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bai-black via-transparent to-transparent" />
        </div>

        <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-4xl hero-rise">
            <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl text-white leading-[1] tracking-tighter mb-6 md:mb-8 italic uppercase">
              Bokamoso <br /> <span className="text-bai-red-soft relative">Arts Institute<span className="absolute -bottom-2 left-0 w-full h-4 bg-bai-blue/40 -z-10 rotate-1" aria-hidden="true"></span></span>
            </h1>
            <p className="text-white/85 text-lg md:text-2xl font-light mb-4 leading-relaxed max-w-2xl">
              Nurturing African Excellence through choral music and holistic youth development since 2022.
            </p>
            <p className="font-serif italic text-white text-xl md:text-2xl mb-10">Bula Pelo. Open your heart.</p>
            <div className="flex flex-wrap gap-4 mb-12">
              <Link to={ROUTES.EVENTS} className="inline-flex items-center gap-3 h-14 px-8 bg-bai-red text-white font-display font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-bai-black transition-colors">
                <span>See upcoming events</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to={ROUTES.DONATE} className="inline-flex items-center h-14 px-8 border-2 border-white/70 text-white font-display font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-bai-black hover:border-white transition-colors">
                Support the choir
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Piano Keys Logo representation in bg */}
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[600px] h-[600px] piano-key-pattern rounded-full opacity-5 pointer-events-none blur-3xl" aria-hidden="true" />
      </section>

      {/* Impact Stats */}
      <section className="relative -mt-12 md:-mt-16 z-20 px-4 sm:px-6 lg:px-8" aria-label="Our impact">
        <dl className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={`stat-${idx}`}
              className="bg-white border-b-8 border-bai-red p-6 md:p-8 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)] flex flex-col-reverse items-center text-center"
            >
              <dt className="mt-1">
                <span className="block font-bold uppercase tracking-[0.18em] text-xs text-bai-red mb-1">{stat.label}</span>
                <span className="block text-sm text-bai-black/70">{stat.detail}</span>
              </dt>
              <dd>
                <span className="block mb-3 text-bai-black mx-auto w-fit">{stat.icon}</span>
                <span className="num block font-display font-bold text-4xl md:text-5xl mb-1">{stat.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Our Philosophy Section */}
      <section className="py-24 md:py-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-bai-blue/5 rounded-full blur-3xl -z-10" />
            <div className="aspect-[4/5] bg-bai-black overflow-hidden rounded-3xl shadow-2xl rotate-1 group hover:rotate-0 transition-transform duration-700">
              {/* Philosophy image: replace public/assets/philosophy.jpg to change it. */}
              <ManagedImage
                src={`${import.meta.env.BASE_URL}assets/philosophy.jpg`}
                alt="The Bokamoso choir singing"
                className="w-full h-full object-cover grayscale brightness-90 transition-all duration-700 group-hover:grayscale-0 group-hover:brightness-100"
              />
            </div>
          </div>
          <div className="space-y-8">
            <h2 className="font-display font-bold text-4xl md:text-7xl tracking-tighter uppercase italic leading-[0.9]">
              MUSIC IS <br /> <span className="text-bai-blue">RESILIENCE.</span>
            </h2>
            <p className="text-bai-black/75 text-lg md:text-2xl leading-relaxed font-serif italic">
              "We don't just teach notes; we nurture souls. Our philosophy is rooted in the belief that artistic excellence is the most powerful tool for township transformation."
            </p>
            <div className="pt-4">
              <Link 
                to={ROUTES.ABOUT} 
                className="inline-flex items-center space-x-4 bg-bai-black text-white px-8 py-4 rounded-full font-display font-bold uppercase text-xs tracking-widest hover:bg-bai-red transition-colors group"
              >
                <span>Discover Our Story</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Community Engagement Section */}
      <section className="py-24 md:py-40 bg-bai-bone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-display font-bold text-4xl md:text-7xl tracking-tighter uppercase italic leading-none">
              COMMUNITY <span className="text-bai-red">IMPACT</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Community images: replace community-1.jpg … community-3.jpg in public/assets/community/. */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="group overflow-hidden rounded-2xl bg-bai-black h-[320px] md:h-[400px]">
                <img
                  src={`${import.meta.env.BASE_URL}assets/community/community-${i}.jpg`}
                  alt="Bokamoso choir members with the Mabopane community"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-bai-black/75 text-lg mt-10 max-w-2xl mx-auto">Nurturing talent in the heart of Mabopane, in schools, churches and community halls.</p>
        </div>
      </section>

      {/* Featured Traditions Teaser */}
      <section className="bg-bai-black py-16 md:py-32 text-white relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-5" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-7xl tracking-tight uppercase mb-4 leading-none">
              Our <span className="text-bai-red">Traditions</span>
            </h2>
            <p className="text-white/75 font-display uppercase tracking-widest text-sm">Experience the rhythm of our community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="group relative bg-bai-charcoal border border-white/10 transition-colors hover:border-white/30 p-8 md:p-12 overflow-hidden min-h-[350px] md:min-h-[450px] flex flex-col justify-end">
              <div className="absolute top-10 right-10 text-bai-red opacity-25 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true">
                <Church size={120} strokeWidth={1} />
              </div>
              <div className="relative z-20">
                <p className="text-bai-blue-soft font-bold uppercase tracking-[0.18em] text-xs mb-4">Feb 14-15</p>
                <h3 className="font-display font-bold text-3xl md:text-4xl mb-4 md:mb-6">5th ANNUAL <br />PRAYER SERVICE</h3>
                <p className="text-white/75 mb-6 md:mb-8 text-base md:text-lg">"The First Kick" — An all-night spiritual gathering to set the tone for the season. Join us in Mabopane.</p>
                <Link to={ROUTES.TRADITIONS} className="inline-block font-display font-bold text-bai-red-soft uppercase tracking-widest text-sm border-b-2 border-bai-red-soft py-2 hover:text-white hover:border-white transition-colors">About the prayer service</Link>
              </div>
            </div>
            
            <div className="group relative bg-bai-charcoal border border-white/10 transition-colors hover:border-white/30 p-8 md:p-12 overflow-hidden min-h-[350px] md:min-h-[450px] flex flex-col justify-end">
              <div className="absolute top-10 right-10 text-bai-blue-soft opacity-25 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true">
                <Music size={120} strokeWidth={1} />
              </div>
              <div className="relative z-20">
                <p className="text-bai-red-soft font-bold uppercase tracking-[0.18em] text-xs mb-4">May 29-30</p>
                <h3 className="font-display font-bold text-3xl md:text-4xl mb-4 md:mb-6">BOTSWANA <br />ON TOUR</h3>
                <p className="text-white/75 mb-6 md:mb-8 text-base md:text-lg">Maitisong Theatre, Gaborone. We are bringing the voices of Mabopane to our neighbors. Tickets out now.</p>
                <Link to={ROUTES.EVENTS} className="inline-block font-display font-bold text-bai-blue-soft uppercase tracking-widest text-sm border-b-2 border-bai-blue-soft py-2 hover:text-white hover:border-white transition-colors">Get tickets</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Strip */}
      <section className="py-12 md:py-24 bg-white px-4 border-y border-bai-black/5">
         <div className="max-w-7xl mx-auto">
            <h2 className="text-center font-display font-bold text-sm uppercase tracking-[0.18em] text-bai-black/70 mb-8 md:mb-12">Our Partners</h2>
            <ul className="flex flex-wrap justify-center gap-x-10 gap-y-6 md:gap-x-16 items-center text-bai-black/75">
                <li className="font-display font-bold text-2xl uppercase tracking-widest">Entsika</li>
                <li className="font-bold text-3xl tracking-tight italic">DSAC</li>
                <li className="font-display font-bold text-2xl uppercase tracking-widest">Tshwane</li>
                <li className="font-bold text-2xl">Old Mutual</li>
                <li className="font-display font-medium text-lg uppercase">Bokamoso Passenger</li>
            </ul>
         </div>
      </section>
    </div>
  );
}
