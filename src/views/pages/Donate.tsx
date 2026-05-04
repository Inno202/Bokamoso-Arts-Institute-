import { useState } from 'react';
import { Heart, Star, Users, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Donate() {
  const [amount, setAmount] = useState<number | null>(500);

  const tiers = [
    { title: 'Artist Seeder', amount: 250, perk: 'Sponsors 1 month of training and uniform costs.', icon: <Star size={24} /> },
    { title: 'Lead Sponsor', amount: 500, perk: 'Sponsors full training journey for one performer.', icon: <Users size={24} /> },
    { title: 'Global Envoy', amount: 2500, perk: 'Directly funds one chorister for an international tour.', icon: <Zap size={24} /> },
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <section className="bg-bai-black text-white py-16 md:py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-none mb-4 md:mb-8 italic uppercase text-white">
            MAKE A <br /> <span className="text-bai-red">DONATION.</span>
          </h1>
          <p className="text-white/60 text-lg md:text-2xl font-light leading-relaxed max-w-2xl mx-auto italic font-serif">
            "Bula Pelo — Open your heart to the potential of Mabopane."
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 flex flex-col gap-12">
        {/* Donation Form */}
        <div className="w-full bg-white p-6 md:p-12 rounded-sm shadow-2xl border-4 border-bai-black">
          <div className="mb-8 md:mb-12">
            <h2 className="font-display font-bold text-2xl md:text-3xl mb-8 md:mb-12 flex flex-col md:flex-row items-start md:items-center italic uppercase tracking-tight gap-4 md:gap-0">
               <div className="w-8 h-8 bg-bai-red rounded-full mr-0 md:mr-4 shrink-0" /> 
               Select Sponsorship Level
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <button
                  key={tier.amount}
                  onClick={() => setAmount(tier.amount)}
                  className={`p-8 border-2 rounded-sm text-left transition-all ${
                    amount === tier.amount 
                      ? 'border-bai-red bg-bai-bone shadow-inner' 
                      : 'border-bai-black/5 hover:border-bai-blue/30'
                  }`}
                >
                  <div className={`mb-6 w-12 h-12 rounded-sm flex items-center justify-center ${amount === tier.amount ? 'bg-bai-black text-white' : 'bg-bai-bone text-bai-black/20'}`}>
                    {tier.icon}
                  </div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-[0.2em] mb-2">{tier.title}</h3>
                  <div className="text-3xl font-display font-black text-bai-black mb-4">R{tier.amount}</div>
                  <p className="text-[11px] text-bai-black/40 leading-relaxed font-medium">{tier.perk}</p>
                </button>
              ))}
            </div>
            
            <div className="mt-8 md:mt-12 p-6 md:p-8 bg-bai-bone border-l-8 border-bai-blue">
               <label className="block text-[10px] font-display font-bold uppercase tracking-[0.3em] text-bai-black/40 mb-4">Or Enter Custom Amount (ZAR)</label>
               <input 
                  type="number" 
                  placeholder="R 00.00"
                  className="w-full bg-transparent border-b-2 border-bai-black font-display font-bold text-3xl md:text-4xl focus:border-bai-red outline-none transition-colors py-2"
                  onChange={(e) => setAmount(Number(e.target.value))}
               />
            </div>
          </div>

          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="Full Name" className="w-full p-4 border-2 border-bai-black/5 outline-none focus:border-bai-black font-medium" />
                <input type="email" placeholder="Email Address" className="w-full p-4 border-2 border-bai-black/5 outline-none focus:border-bai-black font-medium" />
             </div>
             
             <div className="pt-6">
                <button className="w-full btn-primary bg-bai-red hover:bg-bai-black flex items-center justify-center space-x-3 h-20 text-xl italic uppercase">
                   <span>DONATE NOW</span>
                   <Zap size={24} />
                </button>
                <div className="flex justify-center items-center space-x-6 mt-6 opacity-30">
                  <img src="https://static.payfast.co.za/images/logos/logo-payfast.svg" alt="PayFast" className="h-4 grayscale" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Secure Gateway</span>
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
