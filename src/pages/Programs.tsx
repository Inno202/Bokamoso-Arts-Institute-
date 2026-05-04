import { Award, Users, Music, Star, HeartHandshake } from 'lucide-react';
import { motion } from 'motion/react';
import { ManagedImage } from '../components/ManagedImage';

export default function Programs() {
  const pillars = [
    { 
      title: 'Choral Mastery', 
      desc: 'Intensive musical and vocal training, teaching and performance for youth aged 14-25.',
      icon: <Music className="text-bai-red" size={32} />
    },
    { 
      title: 'Artistic Excellence', 
      desc: 'Developing world-class performance standards and stage presence through consistent rehearsals and international exchange.',
      icon: <Star className="text-bai-blue" size={32} />
    }
  ];

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="bg-bai-black py-32 text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-xs mb-4 block">Our Artistic Journey</span>
          <h1 className="font-display font-extrabold text-5xl md:text-7xl text-white tracking-tighter mb-8 leading-tight italic uppercase">
            OUR <br /> <span className="text-bai-blue">WORK</span>
          </h1>
          <p className="text-white/50 text-lg md:text-2xl font-light leading-relaxed max-w-2xl mx-auto italic font-serif">
            "Transforming the raw talent of the township into world-class excellence."
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid grid-cols-1 md:grid-cols-2 gap-16">
        {pillars.map((pillar, idx) => (
          <div key={idx} className="group relative">
            <div className={`mb-8 p-6 w-fit bg-bai-bone transition-all duration-300 border-b-8 ${
               pillar.title.includes('Choral') ? 'border-bai-red' : 
               pillar.title.includes('Artistic') ? 'border-bai-blue' : 
               'border-bai-black'
            }`}>
               {pillar.icon}
            </div>
            <h3 className="font-display font-bold text-3xl mb-6 text-bai-black italic uppercase tracking-tight">{pillar.title}</h3>
            <p className="text-bai-black/60 leading-relaxed text-lg">
              {pillar.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Community Engagement / School & Orphanage Visits */}
      <section className="bg-bai-bone py-16 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-6 md:p-24 shadow-2xl border-4 border-bai-black flex flex-col lg:flex-row gap-12 md:gap-20 items-center">
          <div className="w-full lg:w-1/2">
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-bai-red w-12 h-12 flex items-center justify-center rounded-sm text-white">
                <Users size={28} />
              </div>
              <span className="font-display font-bold uppercase tracking-widest text-[10px]">Community Engagement</span>
            </div>
            <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter mb-8 leading-none italic uppercase">
              SCHOOLS & <br /><span className="text-bai-red text-6xl italic">ORPHANAGES.</span>
            </h2>
            <p className="text-bai-black/60 text-xl leading-relaxed mb-10 font-serif italic">
               We regularly visit local schools and orphanages in Mabopane to perform, share music, and inspire the youth through artistic exchange and spiritual upliftment.
            </p>
            <div className="grid grid-cols-2 gap-8 md:gap-12 mb-12">
               <div>
                  <div className="font-display font-black text-4xl md:text-5xl text-bai-black italic">20+</div>
                  <div className="text-[10px] uppercase tracking-widest font-black text-bai-red mt-2">Visits Per Year</div>
               </div>
               <div>
                  <div className="font-display font-black text-4xl md:text-5xl text-bai-black italic">1500+</div>
                  <div className="text-[10px] uppercase tracking-widest font-black text-bai-red mt-2">Souls Uplifted</div>
               </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 relative">
            <div className="absolute -top-4 -right-4 md:-top-10 md:-right-10 w-full h-full border-4 border-bai-blue/20 -z-10" />
             <div className="aspect-square bg-bai-black overflow-hidden relative shadow-2xl">
               <ManagedImage 
                 sectionKey="programs"
                 src="https://images.unsplash.com/photo-1544648397-72fc8f9d87c0?auto=format&fit=crop&q=80&w=800" 
                 alt="Community outreach performance" 
               />
               <div className="absolute inset-0 piano-key-pattern opacity-10 pointer-events-none" />
               <div className="absolute bottom-0 left-0 p-10 bg-bai-red/90 text-white max-w-xs">
                  <div className="font-display font-black uppercase text-xl leading-none">COMMUNITY IMPACT</div>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
