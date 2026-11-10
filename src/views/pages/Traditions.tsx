import { Mail } from 'lucide-react';
import { useContent } from '../../content/store';
import { PageHero } from '../components/PageHero';

export default function Traditions() {
  const { hero, items, mailingList } = useContent('traditions');
  const { contact } = useContent('site');

  // There is no sign-up form that stores addresses: joining is an email to the institute.
  const joinHref = `mailto:${contact.email}?subject=${encodeURIComponent('Please add me to the mailing list')}`;

  return (
    <div className="pb-20 md:pb-28">
      <PageHero line1="Our" line2="Traditions." label={hero.label} quote={hero.quote} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <ul>
          {items.map((item) => (
            <li key={item.title} className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 py-12 md:py-16 border-b border-bai-black/15 last:border-b-0">
              <div className="lg:col-span-5">
                <h2 className="display text-3xl sm:text-4xl md:text-5xl">{item.title}</h2>
                {item.tag && <p className="font-serif italic text-bai-red text-xl mt-3">{item.tag}</p>}
              </div>
              <div className="lg:col-span-7">
                <p className="text-bai-black/75 text-lg md:text-xl leading-relaxed max-w-[62ch]">{item.desc}</p>
                {item.when && (
                  <p className="flex items-center gap-4 font-display font-bold uppercase tracking-wide text-sm mt-8">
                    <span className="w-12 h-1 bg-bai-blue shrink-0" aria-hidden="true" />
                    <span>{item.when}</span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-bai-blue text-white rounded-2xl p-8 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">
          <div className="max-w-xl">
            <h2 className="display text-3xl md:text-5xl mb-5">{mailingList.heading}</h2>
            {mailingList.text && <p className="text-white/90 text-lg leading-relaxed">{mailingList.text}</p>}
          </div>
          <a href={joinHref} className="btn btn-lg btn-light shrink-0">
            <Mail size={18} aria-hidden="true" />
            <span>Join by email</span>
          </a>
        </div>
      </section>
    </div>
  );
}
