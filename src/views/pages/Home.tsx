import { motion } from 'motion/react';
import { Trophy, Globe, Music, Heart, Church } from 'lucide-react';
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
          <ManagedImage 
            sectionKey="hero"
            src="https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=2000" 
            alt="Choir performance" 
            className="opacity-40 mix-blend-overlay"
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
            <h1 className="font-display font-extrabold text-5xl md:text-7xl text-white leading-[1] tracking-tighter mb-8 italic uppercase">
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
      <section className="relative -mt-24 z-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border-b-8 border-bai-red p-8 shadow-2xl flex flex-col items-center text-center group hover:border-bai-blue transition-colors"
            >
              <div className="mb-4 text-bai-black">{stat.icon}</div>
              <div className="font-display font-extrabold text-5xl mb-1">{stat.value}</div>
              <div className="font-bold uppercase tracking-[0.2em] text-[10px] text-bai-red mb-2">{stat.label}</div>
              <div className="text-xs text-bai-black/50 font-medium">{stat.detail}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -left-10 top-10 w-full h-full border-4 border-bai-blue/20 rounded-3xl" />
            <div className="aspect-[4/5] bg-bai-black overflow-hidden rounded-3xl relative z-10 shadow-2xl">
              <ManagedImage 
                sectionKey="philosophy"
                src="https://images.unsplash.com/photo-1544648397-72fc8f9d87c0?auto=format&fit=crop&q=80&w=800" 
                alt="Singing youth" 
                className="rounded-3xl"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 w-32 h-32 md:w-52 md:h-52 bg-bai-black rounded-full flex items-center justify-center p-4 md:p-8 text-white font-display font-bold text-center text-xs md:text-sm leading-tight border-4 md:border-8 border-bai-red z-20 shadow-xl">
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-5xl tracking-tighter">EST.</span>
                <span className="text-bai-red text-sm md:text-base">2022</span>
                <span className="text-[8px] md:text-[10px] tracking-widest opacity-50 mt-1 uppercase text-center leading-none">ACTIVE LEGACY</span>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="font-display font-bold uppercase tracking-[0.3em] text-bai-blue text-xs mb-4 block">The "Bula Pelo" Philosophy</span>
            <h2 className="font-display font-extrabold text-4xl md:text-6xl leading-[1] mb-8 tracking-tighter">
              OUR <br /> <span className="text-bai-red">PHILOSOPHY.</span>
            </h2>
            <p className="text-bai-black/80 text-xl mb-8 leading-relaxed font-serif italic">
              "We teach music, but we build humans. Through the Bula Pelo philosophy, we unlock the resilience of the African child."
            </p>
            <p className="text-bai-black/80 font-medium mb-10 leading-relaxed text-xl tracking-tight">
              Through intensive musical and vocal training, teaching and performance, we refine the discipline required for international choral competition.
            </p>
            <Link to={ROUTES.ABOUT} className="btn-primary inline-block">
              Explore Our History
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Traditions Teaser */}
      <section className="bg-bai-black py-32 text-white relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-5" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="font-display font-extrabold text-4xl md:text-7xl tracking-tight uppercase mb-4 leading-none">
              Our <span className="text-bai-red">Traditions</span>
            </h2>
            <p className="text-white/40 font-display uppercase tracking-widest text-sm">Experience the rhythm of our community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div whileHover={{ scale: 1.02 }} className="group relative bg-[#0a0a0a] border border-white/5 p-12 overflow-hidden min-h-[450px] flex flex-col justify-end">
              <div className="absolute top-10 right-10 text-bai-red opacity-10 group-hover:opacity-100 transition-opacity">
                <Church size={120} strokeWidth={1} />
              </div>
              <div className="relative z-20">
                <span className="text-bai-blue font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Event: Feb 14-15</span>
                <h3 className="font-display font-bold text-4xl mb-6">5th ANNUAL <br />PRAYER SERVICE</h3>
                <p className="text-white/50 mb-8 text-lg">"The First Kick" — An all-night spiritual gathering to set the tone for the season. Join us in Mabopane.</p>
                <Link to={ROUTES.TRADITIONS} className="font-display font-black text-bai-red uppercase tracking-widest text-xs border-b border-bai-red pb-1">Learn More</Link>
              </div>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.02 }} className="group relative bg-[#0a0a0a] border border-white/5 p-12 overflow-hidden min-h-[450px] flex flex-col justify-end">
              <div className="absolute top-10 right-10 text-bai-blue opacity-10 group-hover:opacity-100 transition-opacity">
                <Music size={120} strokeWidth={1} />
              </div>
              <div className="relative z-20">
                <span className="text-bai-red font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Event: May 29-30</span>
                <h3 className="font-display font-bold text-4xl mb-6">BOTSWANA <br />ON TOUR</h3>
                <p className="text-white/50 mb-8 text-lg">Maitisong Theatre, Gaborone. We are bringing the voices of Mabopane to our neighbors. Tickets out now.</p>
                <Link to={ROUTES.TOUR} className="font-display font-black text-bai-blue uppercase tracking-widest text-xs border-b border-bai-blue pb-1">Get Tickets</Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partner Strip */}
      <section className="py-24 bg-white px-4 border-y border-bai-black/5">
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
