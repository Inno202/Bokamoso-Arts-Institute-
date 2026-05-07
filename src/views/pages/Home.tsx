import { motion } from 'motion/react';
import { Trophy, Music, Heart, Church, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ManagedImage } from '../components/ManagedImage';
import { ROUTES } from '../../controllers/navigation';

export default function Home() {
  const stats = [
    { icon: <Trophy size={32} />, value: '2', label: 'WCG World Titles', detail: 'Gold Medals in South Korea 2023' },
    { icon: <Music size={32} />, value: '250+', label: 'Artists Trained', detail: 'Nurturing local township talent' },
    { icon: <Heart size={32} />, value: '5th', label: 'Annual Prayer', detail: 'Community Soul & Resilience' },
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden bg-bai-black text-white">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          {/* 
            HERO IMAGE PLACEMENT:
            Save your hero image as 'hero.jpg' in public/assets/
            and change the src below to "./assets/hero.jpg"
          */}
          <ManagedImage 
            sectionKey="hero"
            src={`${import.meta.env.BASE_URL}assets/hero.jpg`}
            alt="Choir performance" 
            className="opacity-50 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bai-black via-transparent to-transparent" />
        </div>

        <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <div className="flex items-center space-x-4 mb-6">
              <span className="h-[2px] w-12 bg-bai-red" />
              <span className="bula-pelo-text text-white text-2xl md:text-3xl">Bula Pelo</span>
            </div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-7xl text-white leading-[1] tracking-tighter mb-4 md:mb-8 italic uppercase">
              Bokamoso <br /> <span className="text-bai-red relative">Arts Institute<span className="absolute -bottom-2 left-0 w-full h-4 bg-bai-blue/30 -z-10 rotate-1"></span></span>
            </h1>
            <p className="text-white/70 text-lg md:text-2xl font-light mb-12 leading-relaxed max-w-2xl">
              Nurturing African Excellence through choral music and holistic youth development since 2022.
            </p>
          </motion.div>
        </div>

        {/* Decorative Piano Keys Logo representation in bg */}
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[600px] h-[600px] piano-key-pattern rounded-full opacity-5 pointer-events-none blur-3xl" />
      </section>

      {/* Impact Stats */}
      <section className="relative -mt-12 md:-mt-24 z-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={`stat-${idx}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border-b-8 border-bai-red p-8 shadow-2xl flex flex-col items-center text-center group hover:border-bai-blue transition-colors"
            >
              <div className="mb-4 text-bai-black">{stat.icon}</div>
              <div className="font-display font-extrabold text-4xl md:text-5xl mb-1">{stat.value}</div>
              <div className="font-bold uppercase tracking-[0.2em] text-[10px] text-bai-red mb-2">{stat.label}</div>
              <div className="text-xs text-bai-black/50 font-medium">{stat.detail}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Our Philosophy Section */}
      <section className="py-24 md:py-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-bai-blue/5 rounded-full blur-3xl -z-10" />
            <div className="aspect-[4/5] bg-bai-black overflow-hidden rounded-3xl shadow-2xl rotate-1 group hover:rotate-0 transition-transform duration-700">
               {/* 
                 PHILOSOPHY IMAGE PLACEMENT:
                 Save your image as 'philosophy.jpg' in public/assets/
                 and change the src below to "./assets/philosophy.jpg"
               */}
              <ManagedImage 
                src={`${import.meta.env.BASE_URL}assets/philosophy.jpg`}
                sectionKey="philosophy"
                alt="Choir Singing"
                className="w-full h-full object-cover grayscale brightness-75 transition-all group-hover:grayscale-0 group-hover:brightness-100"
              />
            </div>
          </div>
          <div className="space-y-8">
            <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-[10px] block">Our Core Beliefs</span>
            <h2 className="font-display font-black text-4xl md:text-7xl tracking-tighter uppercase italic leading-[0.9]">
              MUSIC IS <br /> <span className="text-bai-blue">RESILIENCE.</span>
            </h2>
            <p className="text-bai-black/60 text-lg md:text-2xl leading-relaxed font-serif italic">
              "We don't just teach notes; we nurture souls. Our philosophy is rooted in the belief that artistic excellence is the most powerful tool for township transformation."
            </p>
            <div className="pt-4">
              <Link 
                to={ROUTES.ABOUT} 
                className="inline-flex items-center space-x-4 bg-bai-black text-white px-8 py-4 rounded-full font-display font-black uppercase text-xs tracking-widest hover:bg-bai-red transition-all group"
              >
                <span>Discover Our Story</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Community Engagement Section */}
      <section className="py-24 md:py-40 bg-bai-bone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-blue text-[10px] block mb-4">Engaging Our People</span>
            <h2 className="font-display font-black text-4xl md:text-7xl tracking-tighter uppercase italic leading-none">
              COMMUNITY <span className="text-bai-red">IMPACT</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl bg-bai-black h-[400px]">
                {/* 
                  COMMUNITY IMAGE PLACEMENT:
                  Save your images as 'community-1.jpg', 'community-2.jpg', etc. in public/assets/community/
                  and change the src below to `./assets/community/community-${i}.jpg`
                */}
                <img 
                  src={`${import.meta.env.BASE_URL}assets/community/community-${i}.jpg`} 
                  alt={`Community activity ${i}`}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bai-black to-transparent opacity-60" />
                <div className="absolute bottom-0 left-0 p-8">
                   <h4 className="text-white font-display font-bold text-xl uppercase italic">Engagement Project {i}</h4>
                   <p className="text-white/60 text-sm mt-2">Nurturing talent in the heart of Mabopane.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Traditions Teaser */}
      <section className="bg-bai-black py-16 md:py-32 text-white relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-5" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-7xl tracking-tight uppercase mb-4 leading-none">
              Our <span className="text-bai-red">Traditions</span>
            </h2>
            <p className="text-white/40 font-display uppercase tracking-widest text-sm">Experience the rhythm of our community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div whileHover={{ scale: 1.02 }} className="group relative bg-[#0a0a0a] border border-white/5 p-8 md:p-12 overflow-hidden min-h-[350px] md:min-h-[450px] flex flex-col justify-end">
              <div className="absolute top-10 right-10 text-bai-red opacity-10 group-hover:opacity-100 transition-opacity">
                <Church size={120} strokeWidth={1} />
              </div>
              <div className="relative z-20">
                <span className="text-bai-blue font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Event: Feb 14-15</span>
                <h3 className="font-display font-bold text-3xl md:text-4xl mb-4 md:mb-6">5th ANNUAL <br />PRAYER SERVICE</h3>
                <p className="text-white/50 mb-6 md:mb-8 text-base md:text-lg">"The First Kick" — An all-night spiritual gathering to set the tone for the season. Join us in Mabopane.</p>
                <Link to={ROUTES.TRADITIONS} className="font-display font-black text-bai-red uppercase tracking-widest text-xs border-b border-bai-red pb-1">Learn More</Link>
              </div>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.02 }} className="group relative bg-[#0a0a0a] border border-white/5 p-8 md:p-12 overflow-hidden min-h-[350px] md:min-h-[450px] flex flex-col justify-end">
              <div className="absolute top-10 right-10 text-bai-blue opacity-10 group-hover:opacity-100 transition-opacity">
                <Music size={120} strokeWidth={1} />
              </div>
              <div className="relative z-20">
                <span className="text-bai-red font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Event: May 29-30</span>
                <h3 className="font-display font-bold text-3xl md:text-4xl mb-4 md:mb-6">BOTSWANA <br />ON TOUR</h3>
                <p className="text-white/50 mb-6 md:mb-8 text-base md:text-lg">Maitisong Theatre, Gaborone. We are bringing the voices of Mabopane to our neighbors. Tickets out now.</p>
                <Link to={ROUTES.EVENTS} className="font-display font-black text-bai-blue uppercase tracking-widest text-xs border-b border-bai-blue pb-1">Get Tickets</Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partner Strip */}
      <section className="py-12 md:py-24 bg-white px-4 border-y border-bai-black/5">
         <div className="max-w-7xl mx-auto">
            <h2 className="text-center font-display font-bold text-[10px] uppercase tracking-[0.4em] text-bai-black/30 mb-10 md:mb-16">Our Partners</h2>
            <div className="flex flex-wrap justify-center gap-8 md:gap-20 items-center opacity-60">
                <img src="https://ais-static.s3.amazonaws.com/placeholder-logo-black.png" alt="Entsika" className="h-10 grayscale brightness-0" />
                <div className="font-black text-3xl tracking-tighter italic">DSAC</div>
                <div className="font-display font-bold text-2xl uppercase tracking-widest">TSHWANE</div>
                <div className="font-black text-2xl border-l-4 border-bai-red pl-4">OLD MUTUAL</div>
                <div className="font-display font-medium text-lg uppercase flex items-center">
                  <div className="w-6 h-6 bg-bai-blue mr-2 rounded-full" />
                  Bokamoso Passenger
                </div>
            </div>
         </div>
      </section>
    </div>
  );
}
