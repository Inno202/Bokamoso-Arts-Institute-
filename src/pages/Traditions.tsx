import { Sparkles, Users, Church, Music } from 'lucide-react';

export default function Traditions() {
  const events = [
    { 
      id: '01',
      title: 'Annual Prayer Service', 
      tag: 'THE FIRST KICK',
      desc: 'Our season begins with an all-night spiritual gathering in Mabopane. We invite elders, parents, and community leaders to join the institute in a collective "Bula Pelo" prayer for the year ahead.',
      icon: <Church size={50} strokeWidth={1} />,
      month: 'FEBRUARY 14-15'
    },
    { 
      id: '02',
      title: 'Conductors Extravaganza', 
      tag: 'ARTISTIC FOCUS',
      desc: 'A week-long masterclass hosted by BAI, bringing together the finest choral conductors in Southern Africa to share techniques, arrangements, and the philosophy of African Excellence.',
      icon: <Users size={50} strokeWidth={1} />,
      month: 'ANNUALLY'
    },
    { 
      id: '03',
      title: 'Concert Series', 
      tag: 'COMMUNITY SHOWCASE',
      desc: 'Our highlight local performance for the residents. This is where we debut our international repertoire to the community before taking it across borders.',
      icon: <Music size={50} strokeWidth={1} />,
      month: 'ANNUALLY'
    }
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <section className="bg-bai-black text-white py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <span className="bula-pelo-text text-white text-2xl mb-4 block">The BAI Rhythm</span>
          <h1 className="font-display font-extrabold text-5xl md:text-7xl tracking-tighter leading-[1] mb-8 italic uppercase">
            OUR <br /> <span className="text-bai-red">TRADITIONS.</span>
          </h1>
          <p className="max-w-2xl text-white/60 text-lg md:text-2xl font-light leading-relaxed font-serif italic">
            "We are not just a choir; we are the guardians of the community's soul."
          </p>
        </div>
      </section>

      {/* Traditions List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="space-y-24 md:space-y-40">
          {events.map((event, idx) => (
            <div key={event.id} className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 md:gap-20 items-center lg:items-start`}>
               <div className="w-full lg:w-1/2 relative text-center lg:text-left">
                  <div className="text-[6rem] md:text-[8rem] lg:text-[12rem] font-display font-black text-bai-black/5 leading-none absolute -top-8 lg:-top-16 left-1/2 lg:-left-8 -translate-x-1/2 lg:translate-x-0 -z-10 italic">{event.id}</div>
                  <div className="relative z-10">
                     <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-[10px] mb-6 block">{event.tag}</span>
                     <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter mb-6 leading-none uppercase italic">
                       {event.title}
                     </h2>
                     <p className="text-bai-black/60 text-xl leading-relaxed mb-10">
                       {event.desc}
                     </p>
                     <div className="flex items-center justify-center lg:justify-start space-x-4 text-bai-black font-display font-bold uppercase tracking-widest text-xs">
                        <span className="w-16 h-1 bg-bai-blue" />
                        <span>{event.month === 'ANNUALLY' ? 'ANNUALLY' : `Every ${event.month}`}</span>
                     </div>
                  </div>
               </div>
               <div className="lg:w-1/2 w-full">
                  <div className="aspect-[4/3] bg-bai-black flex flex-col items-center justify-center text-bai-red group hover:bg-bai-blue hover:text-white transition-all duration-700 relative shadow-2xl">
                     <div className="transform transition-transform duration-700 group-hover:scale-125 mb-8">
                        {event.icon}
                     </div>
                     <h4 className="font-display font-bold text-xs uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-opacity">Bula Pelo Spirit</h4>
                     {/* Decorative background */}
                     <div className="piano-key-pattern absolute inset-0 opacity-10 pointer-events-none" />
                  </div>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mt-32 max-w-7xl mx-auto px-4">
        <div className="bg-bai-blue p-8 md:p-12 lg:p-24 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
          <div className="relative z-10 max-w-xl w-full">
            <h2 className="font-display font-black text-3xl md:text-5xl text-white tracking-tighter mb-6 italic uppercase leading-none">JOIN OUR <br />MAILING LIST.</h2>
            <p className="text-white/80 text-lg leading-relaxed">
               Most of our traditions are open to the people of Mabopane. 
               Be the first to know about the First Kick and upcoming concert series.
            </p>
          </div>
          <div className="relative z-10 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row gap-4">
               <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="px-6 md:px-10 py-4 md:py-5 bg-white text-bai-black font-medium outline-none focus:ring-4 focus:ring-bai-red/30 w-full sm:w-80 md:w-96 text-sm md:text-base"
               />
               <button className="bg-bai-black text-white w-full sm:w-auto px-6 md:px-10 py-4 md:py-5 font-display font-bold uppercase tracking-widest hover:bg-bai-red transition-all">Submit</button>
            </div>
          </div>
          {/* Decorative piano keys in background of section */}
          <div className="absolute -bottom-10 -right-10 w-96 h-96 piano-key-pattern opacity-10 rotate-45 pointer-events-none" />
        </div>
      </section>
    </div>
  );
}
