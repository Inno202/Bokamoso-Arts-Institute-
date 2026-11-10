import React, { useState } from 'react';
import { Star, Users, Zap, Mail } from 'lucide-react';
import { CONTACT_EMAIL } from '../../config';
import { formatCurrency } from '../../controllers/lib/utils';

const TIERS = [
  { title: 'Artist Seeder', amount: 250, perk: 'Sponsors 1 month of training and uniform costs.', icon: <Star size={24} aria-hidden="true" /> },
  { title: 'Lead Sponsor', amount: 500, perk: 'Sponsors full training journey for one performer.', icon: <Users size={24} aria-hidden="true" /> },
  { title: 'Global Envoy', amount: 2500, perk: 'Directly funds one chorister for an international tour.', icon: <Zap size={24} aria-hidden="true" /> },
];

const field = 'w-full p-4 bg-white border-2 border-bai-black/20 focus:border-bai-black font-medium placeholder:text-bai-black/60 transition-colors';

export default function Donate() {
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const valid = Number.isFinite(amount) && amount >= 10;

  // Online card donations are not connected yet, so a pledge goes to the
  // institute by email and they reply with payment details.
  const handlePledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const subject = `Donation pledge: ${formatCurrency(amount)}`;
    const body = [
      'Hello Bokamoso Arts Institute,',
      '',
      `I would like to donate ${formatCurrency(amount)}.`,
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'Please send me the payment details.',
    ].join('\n');
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="pb-24">
      <section className="bg-bai-black text-white pt-16 pb-28 md:pt-28 md:pb-36 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" aria-hidden="true" />
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-none mb-6 italic uppercase">
            Make a <br /> <span className="text-bai-red-soft">donation.</span>
          </h1>
          <p className="text-white/80 text-lg md:text-2xl leading-relaxed max-w-2xl mx-auto italic font-serif">
            "Bula Pelo. Open your heart to the potential of Mabopane."
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <form onSubmit={handlePledge} className="w-full bg-white p-6 md:p-12 border-4 border-bai-black shadow-[0_32px_64px_-32px_rgb(0_0_0/0.5)]">
          <fieldset>
            <legend className="font-display font-bold text-2xl md:text-3xl mb-8 italic uppercase tracking-tight">Choose an amount</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {TIERS.map((tier) => {
                const selected = !custom && amount === tier.amount;
                return (
                  <label
                    key={tier.amount}
                    className={`p-6 md:p-8 border-2 text-left transition-colors cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bai-blue has-[:focus-visible]:outline-offset-2 ${
                      selected ? 'border-bai-red bg-bai-bone' : 'border-bai-black/15 hover:border-bai-black/50'
                    }`}
                  >
                    <input type="radio" name="tier" className="sr-only" checked={selected} onChange={() => { setAmount(tier.amount); setCustom(''); }} />
                    <span className={`mb-5 w-12 h-12 flex items-center justify-center ${selected ? 'bg-bai-black text-white' : 'bg-bai-bone text-bai-black/60'}`}>
                      {tier.icon}
                    </span>
                    <span className="block font-display font-bold text-xs uppercase tracking-[0.18em] mb-2">{tier.title}</span>
                    <span className="num block text-3xl font-display font-bold mb-3">{formatCurrency(tier.amount).replace(',00', '')}</span>
                    <span className="block text-sm text-bai-black/70 leading-relaxed">{tier.perk}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-8 p-6 md:p-8 bg-bai-bone">
              <label htmlFor="custom-amount" className="block text-sm font-bold text-bai-black/80 mb-3">Or enter your own amount, in rand</label>
              <div className="flex items-baseline gap-3 border-b-2 border-bai-black focus-within:border-bai-red transition-colors">
                <span className="font-display font-bold text-3xl md:text-4xl text-bai-black/60" aria-hidden="true">R</span>
                <input
                  id="custom-amount"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  step={1}
                  placeholder="0"
                  value={custom}
                  className="num w-full bg-transparent font-display font-bold text-3xl md:text-4xl py-2 placeholder:text-bai-black/40"
                  onChange={(e) => { setCustom(e.target.value); setAmount(e.target.value ? Number(e.target.value) : 500); }}
                />
              </div>
              {custom && !valid && <p className="text-sm text-red-700 mt-2" role="alert">Enter an amount of R10 or more.</p>}
            </div>
          </fieldset>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label htmlFor="donor-name" className="block text-sm font-bold mb-2">Full name</label>
              <input id="donor-name" type="text" required autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="donor-email" className="block text-sm font-bold mb-2">Email address</label>
              <input id="donor-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} />
            </div>
          </div>

          <button type="submit" disabled={!valid} className="mt-8 w-full bg-bai-red text-white hover:bg-bai-black transition-colors flex items-center justify-center gap-3 min-h-20 px-6 py-4 text-lg md:text-xl font-display font-bold italic uppercase tracking-widest disabled:opacity-50">
            <span className="num">Pledge {valid ? formatCurrency(amount).replace(',00', '') : ''} by email</span>
            <Mail size={22} aria-hidden="true" />
          </button>
          <p className="text-sm text-bai-black/70 text-center mt-4 max-w-xl mx-auto">
            This opens an email to {CONTACT_EMAIL} with your pledge. We reply with payment details. Online card donations are coming soon; no payment is taken on this page.
          </p>
        </form>
      </section>
    </div>
  );
}
