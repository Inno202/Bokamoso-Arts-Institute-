import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { useContent } from '../../content/store';
import { formatCurrency } from '../../controllers/lib/utils';
import { PageHero } from '../components/PageHero';

const rand = (amount: number) => formatCurrency(amount).replace(/[,.]00$/, '');

export default function Donate() {
  const { quote, tiers, minimumAmount } = useContent('donate');
  const { contact } = useContent('site');
  const [tierIndex, setTierIndex] = useState(Math.min(1, tiers.length - 1));
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const amount = custom ? Number(custom) : tiers[Math.min(tierIndex, tiers.length - 1)]?.amount ?? 0;
  const valid = Number.isFinite(amount) && amount >= minimumAmount;

  // Online card donations are not connected, so a pledge goes to the institute
  // by email and they reply with payment details. Nothing is stored by this site.
  const handlePledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const body = [
      'Hello Bokamoso Arts Institute,',
      '',
      `I would like to donate ${rand(amount)}.`,
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'Please send me the payment details.',
    ].join('\n');
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(`Donation pledge: ${rand(amount)}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="pb-20 md:pb-28">
      <PageHero line1="Make a" line2="donation." quote={quote} />

      <form onSubmit={handlePledge} className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <fieldset>
          <legend className="display text-2xl md:text-3xl mb-6">Choose an amount</legend>
          <ul className="border-y border-bai-black/15 divide-y divide-bai-black/15">
            {tiers.map((tier, i) => {
              const selected = !custom && tierIndex === i;
              return (
                <li key={tier.title}>
                  <label className={`flex items-center gap-4 py-5 px-3 -mx-3 rounded-lg cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bai-blue has-[:focus-visible]:outline-offset-2 ${selected ? 'bg-white' : 'hover:bg-white/60'}`}>
                    <input type="radio" name="tier" className="sr-only" checked={selected} onChange={() => { setTierIndex(i); setCustom(''); }} />
                    <span className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? 'border-bai-red' : 'border-bai-black/40'}`} aria-hidden="true">
                      <span className={`w-3 h-3 rounded-full bg-bai-red transition-transform duration-150 ${selected ? 'scale-100' : 'scale-0'}`} />
                    </span>
                    <span className="flex-grow min-w-0">
                      <span className="block font-display font-bold uppercase tracking-wide">{tier.title}</span>
                      <span className="block text-bai-black/75 mt-0.5">{tier.perk}</span>
                    </span>
                    <span className="num font-display font-bold text-2xl md:text-3xl whitespace-nowrap">{rand(tier.amount)}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-8">
            <label htmlFor="custom-amount" className="field-label">Or enter your own amount, in rand</label>
            <div className="relative max-w-xs">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-bold text-bai-black/70" aria-hidden="true">R</span>
              <input
                id="custom-amount"
                type="number"
                inputMode="numeric"
                min={minimumAmount}
                step={1}
                value={custom}
                aria-invalid={custom !== '' && !valid}
                aria-describedby={custom && !valid ? 'custom-amount-error' : undefined}
                className="field num pl-9 font-display font-bold text-xl"
                onChange={(e) => setCustom(e.target.value)}
              />
            </div>
            {custom && !valid && <p id="custom-amount-error" className="field-error" role="alert">Enter an amount of {rand(minimumAmount)} or more.</p>}
          </div>
        </fieldset>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="donor-name" className="field-label">Full name</label>
            <input id="donor-name" type="text" required autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="donor-email" className="field-label">Email address</label>
            <input id="donor-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="field" />
          </div>
        </div>

        <button type="submit" disabled={!valid} className="btn btn-lg btn-accent btn-block mt-8">
          <span className="num">Pledge {valid ? rand(amount) : ''} by email</span>
          <Mail size={18} aria-hidden="true" />
        </button>
        <p className="text-bai-black/70 mt-4">
          This opens an email to {contact.email} with your pledge. We reply with payment details. Online card donations are coming soon; no payment is taken on this page.
        </p>
      </form>
    </div>
  );
}
