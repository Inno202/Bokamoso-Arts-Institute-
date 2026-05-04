import { Calendar, Ticket, MapPin, Globe } from 'lucide-react';

export default function Tour() {
  const tourDates = [
    { date: 'MAY 29, 2026', venue: 'Maitisong Theatre', city: 'Gaborone, Botswana', event: 'Botswana: It\'s Your Turn', status: 'On Sale' },
    { date: 'MAY 30, 2026', venue: 'Maitisong Theatre', city: 'Gaborone, Botswana', event: 'Global Harmony Tour', status: 'On Sale' },
    { date: 'JUN 15, 2026', venue: 'State Theatre', city: 'Pretoria', event: 'Homecoming Showcase', status: 'Coming Soon' },
    { date: 'AUG 10, 2026', venue: 'Joburg Theatre', city: 'Johannesburg', event: 'Voices of Africa', status: 'Coming Soon' },
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <section className="bg-bai-black text-white py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="max-w-3xl">
            <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-xs mb-4 block">Bokamoso On Tour</span>
            <h1 className="font-display font-extrabold text-5xl md:text-7xl tracking-tighter leading-[1] italic uppercase">
              ON <br /> <span className="text-bai-red">TOUR</span>
            </h1>
          </div>
          <p className="text-white/40 font-display font-bold uppercase tracking-widest text-[10px] max-w-xs border-l border-white/20 pl-6">
            Transported by Bokamoso Passenger Services. Showcasing the grit and grace of Mabopane to the global family.
          </p>
        </div>
      </section>

      {/* Tour Highlight: Botswana */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border-2 border-bai-black rounded-[2rem] overflow-hidden flex flex-col lg:flex-row">
           <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-20">
              <div className="flex items-center space-x-3 mb-6">
                 <div className="w-12 h-8 bg-bai-blue flex flex-col">
                    <div className="flex-grow bg-[#41ADDF]" /> {/* Botswana Blueish */}
                    <div className="h-1 bg-white" />
                    <div className="h-1 bg-bai-black" />
                    <div className="h-1 bg-white" />
                    <div className="flex-grow bg-[#41ADDF]" />
                 </div>
                 <span className="font-display font-bold uppercase tracking-widest text-xs">Featured: Botswana its your turn</span>
              </div>
              <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter mb-6 leading-none italic uppercase">
                TOUR <br /> HIGHLIGHT.
              </h2>
              <p className="text-bai-black/60 text-lg mb-10 leading-relaxed">
                We are crossing borders to share the Bula Pelo spirit with the people of Botswana. 
                Experience a masterclass in choral excellence at the iconic Maitisong Theatre.
              </p>
              <div className="flex flex-wrap gap-4">
                 <button className="btn-primary bg-bai-blue">Book At Maitisong</button>
              </div>
           </div>
           <div className="w-full lg:w-1/2 bg-bai-black relative group overflow-hidden min-h-[300px]">
              <img 
                src="https://images.unsplash.com/photo-1514525253344-f81bad3b3fc2?auto=format&fit=crop&q=80&w=800" 
                alt="Choir on stage" 
                className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 piano-key-pattern opacity-20 pointer-events-none" />
           </div>
        </div>
      </section>

      {/* Technical Feature: Webtickets Integration Mock */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-16 flex items-center justify-between border-b-4 border-bai-black pb-8">
           <div>
              <h2 className="font-display font-black text-4xl mb-2 tracking-tighter uppercase">Tour Schedule</h2>
              <p className="text-bai-red font-bold uppercase tracking-widest text-[10px]">Secure your seat via Webtickets</p>
           </div>
           <div className="hidden md:flex items-center space-x-2 text-bai-black/20 font-black text-6xl">
              2026
           </div>
        </div>

        <div className="space-y-6">
           {tourDates.map((tour, idx) => (
             <div key={idx} className="group bg-white p-6 md:p-8 border-2 border-bai-black/5 hover:border-bai-black hover:bg-bai-bone flex flex-col md:flex-row items-center md:justify-between gap-6 md:gap-8 transition-all">
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8 text-center md:text-left">
                   <div className="flex flex-col items-center justify-center p-6 bg-bai-black text-white min-w-[120px] rounded-sm">
                      <span className="text-[10px] uppercase font-bold text-bai-red tracking-widest mb-1">{tour.date.split(',')[0].split(' ')[0]}</span>
                      <span className="text-3xl font-black font-display leading-none">{tour.date.split(',')[0].split(' ')[1]}</span>
                   </div>
                   <div>
                      <h3 className="font-display font-bold text-2xl mb-1 italic uppercase tracking-tight">{tour.event}</h3>
                      <div className="flex items-center space-x-3 text-bai-black/40 text-[10px] font-bold uppercase tracking-widest">
                         <MapPin size={12} className="text-bai-red" />
                         <span>{tour.venue} — {tour.city}</span>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row items-center w-full md:w-auto gap-4 md:space-x-6">
                   <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 border-2 ${
                      tour.status === 'On Sale' ? 'border-green-500 text-green-600' :
                      tour.status === 'Selling Fast' ? 'border-bai-red text-bai-red' :
                      'border-bai-black/10 text-bai-black/20'
                   }`}>
                      {tour.status}
                   </span>
                   <button className={`w-full md:w-auto px-10 py-4 font-display font-bold uppercase tracking-widest text-xs transition-all ${
                      tour.status.includes('Soon') ? 'bg-bai-bone text-bai-black/20 cursor-not-allowed border-2 border-bai-black/10' : 'bg-bai-black text-white hover:bg-bai-red'
                   }`}>
                      Tickets
                   </button>
                </div>
             </div>
           ))}
        </div>
      </section>

    </div>
  );
}
