import { useContent } from '../../content/store';
import { PageHero } from '../components/PageHero';

export default function Traditions() {
  const { hero, items } = useContent('traditions');
  return (
    <div className="pb-8 md:pb-12">
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
    </div>
  );
}
