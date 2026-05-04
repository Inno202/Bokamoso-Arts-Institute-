export default function About() {
  return (
    <div className="pb-24">
      {/* Header */}
      <section className="bg-bai-black text-white py-16 md:py-32 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <span className="bula-pelo-text text-white text-2xl mb-4 block opacity-80">Our Roots, Our Voice</span>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-[0.9] mb-4 md:mb-8 uppercase italic">
            ABOUT <br /> <span className="text-bai-red">US.</span>
          </h1>
          <p className="max-w-3xl text-white/60 text-lg md:text-2xl font-light leading-relaxed">
             Born in 2022 to transform the lives of youth in Mabopane. 
             Today, the Bokamoso Arts Institute stands as a global testament 
             to what happens when you open your heart to excellence.
          </p>
        </div>
        <div className="piano-key-pattern absolute inset-0 opacity-10" />
      </section>

      {/* Narrative Section */}
      <section className="py-16 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20 items-start">
          <div className="space-y-12">
            <div>
              <h2 className="font-display font-extrabold text-3xl mb-8 uppercase tracking-[0.2em] text-bai-blue">Our Story</h2>
              <p className="text-bai-black/70 text-xl leading-relaxed font-serif italic border-l-8 border-bai-red pl-8 mb-8">
                "Our music is a vessel for resilience. When we sing 'Bula Pelo', we are commanding the world to witness our light."
              </p>
              <p className="text-bai-black/60 text-lg leading-relaxed">
                Founded deep within the industrial heart of Mabopane, BAI was a response to the lack of artistic sanctuaries for marginalized youth. 
                We believe that discipline in music translates to discipline in life. Our choristers don't just gain vocal skills; 
                they gain a spiritual compass and an artistic drive.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 py-8 border-y-2 border-bai-black/5">
                <div>
                   <div className="font-display font-black text-4xl md:text-5xl mb-2 italic">2</div>
                   <div className="text-[10px] font-bold uppercase tracking-widest text-bai-red">World Titles</div>
                </div>
                <div>
                   <div className="font-display font-black text-4xl md:text-5xl mb-2 italic">EST</div>
                   <div className="text-[10px] font-bold uppercase tracking-widest text-bai-red">2022 Foundation</div>
                </div>
            </div>
          </div>

          <div className="bg-bai-black p-8 md:p-16 rounded-sm text-white relative mt-12 lg:mt-0">
            <div className="absolute top-0 right-0 w-24 h-24 piano-key-pattern opacity-20" />
            <h3 className="font-display font-bold text-3xl mb-12 text-bai-blue">Our Values</h3>
            <ul className="space-y-10">
              {[
                { title: 'Township Resilience', desc: 'Finding power in our origins and overcoming systemic barriers.' },
                { title: 'Global Precision', desc: 'Adhering to world-class standards in artistic excellence and performance.' },
                { title: 'Ubuntu Leadership', desc: 'Fostering collective responsibility and community focus.' },
                { title: 'Spiritual Fire', desc: 'Maintaining the sacred energy of traditional African choral art.' },
              ].map((val, idx) => (
                <li key={idx} className="group cursor-default">
                   <h4 className="font-display font-bold uppercase tracking-wider text-lg mb-2 group-hover:text-bai-red transition-colors">{val.title}</h4>
                   <p className="text-white/40 text-sm">{val.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Leadership & Management */}
      <section className="py-16 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 md:mb-20 text-center">
            <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-blue text-[10px] mb-4 block">Leadership</span>
            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-7xl tracking-tighter uppercase italic">
              MANAGEMENT <br /> <span className="text-bai-red">TEAM.</span>
            </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {[
            { role: 'President', name: 'Mabopane Mokwena', desc: 'Visionary behind BAI, driving the mission of township excellence through song.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'CEO', name: 'Lesedi Gwangwa', desc: 'Managing global partnerships and sustainable institutional growth.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Music Director', name: 'Bulela Nkosi', desc: 'Crafting the BAI sound and selecting the repertoire for world stages.', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Conductor', name: 'Thembile Innocent', desc: 'Leading the ensemble through intensive training and performance.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Chairperson', name: 'Neo Moloi', desc: 'Directing the overall strategic focus and chairing institutional boards.', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Administrator', name: 'Thando Ngwenya', desc: 'Overseeing institutional governance and member registries.', image: 'https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Legal', name: 'Adv. Lerato Dube', desc: 'Ensuring compliance and protecting the artistic rights of the institute.', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Finance', name: 'Sipho Gumede', desc: 'Managing the treasury and securing growth for future tours.', image: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Public Relations Officer', name: 'Thabo Lebese', desc: 'Building relationships with stakeholders and the media.', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Operations Officer', name: 'Mpho Matshego', desc: 'Coordinating daily operations and tour logistics.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Content Creator', name: 'Kgomotso Seko', desc: 'Documenting the BAI story and spiritual fire for digital audiences.', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Sectional Leader - Soprano', name: 'Nomvula Dhlamini', desc: 'Supervising the precision and vocal health of the Soprano section.', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Sectional Leader - Alto', name: 'Zanele Mbeki', desc: 'Leading the Alto voices with harmonic accuracy and discipline.', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Sectional Leader - Tenor', name: 'Jabulani Khumalo', desc: 'Ensuring the resonance and stability of the Tenor section.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400' },
            { role: 'Sectional Leader - Bass', name: 'Bongani Zulu', desc: 'Providing the foundation and power for the Bass voices.', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=400' },
          ].map((leader, i) => (
             <div key={i} className="flex flex-col border-t-4 border-bai-black pt-6 group">
                <div className="aspect-square mb-6 overflow-hidden bg-bai-bone">
                  <img src={leader.image} alt={leader.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105" />
                </div>
                <span className="font-display font-bold uppercase tracking-widest text-[10px] text-bai-red mb-2">{leader.role}</span>
                <h3 className="font-display font-black text-2xl italic uppercase mb-4 group-hover:text-bai-blue transition-colors text-balance">{leader.name}</h3>
                <p className="text-bai-black/60 text-sm">{leader.desc}</p>
             </div>
          ))}
        </div>
      </section>

      {/* Choir Gallery */}
      <section className="bg-bai-black py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 md:mb-20 text-center">
              <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-blue text-[10px] mb-4 block">Visual Journey</span>
              <h2 className="font-display font-black text-4xl sm:text-5xl md:text-7xl tracking-tighter uppercase italic text-white">
                THE <span className="text-bai-red">CHOIR.</span>
              </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1525413183853-9bd38b60759b?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1516062423079-7c1dc0a5014a?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1513297845732-4f1dab01931a?auto=format&fit=crop&q=80&w=800"
            ].map((img, i) => (
              <div key={i} className="aspect-[4/5] overflow-hidden bg-bai-bone">
                <img 
                  src={img} 
                  alt="Choir Moment" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 cursor-crosshair scale-100 hover:scale-110" 
                />
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
