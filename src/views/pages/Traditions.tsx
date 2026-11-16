import { CalendarDays } from 'lucide-react';
import { useContent } from '../../content/store';
import { PageHero } from '../components/PageHero';

export default function Traditions() {
  const { heroImage, items } = useContent('traditions');
  return (
    <div className="pb-8 md:pb-12">
      <PageHero title="Our" accent="traditions" image={heroImage} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <ul>
          {items.map((item) => (
            <li key={item.title} className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-5 py-12 md:py-16 border-b border-bai-black/10 last:border-b-0">
              <div className="lg:col-span-5">
                <h2 className="display text-4xl sm:text-5xl md:text-6xl">{item.title}</h2>
                {item.tag && <p className="font-semibold text-bai-red-deep text-lg mt-3">{item.tag}</p>}
              </div>
              <div className="lg:col-span-7">
                <p className="text-bai-ink-soft text-lg md:text-xl leading-relaxed max-w-[62ch]">{item.desc}</p>
                {item.when && (
                  <p className="inline-flex items-center gap-2 mt-7 px-4 py-2 rounded-full bg-bai-blue/10 text-bai-blue font-semibold">
                    <CalendarDays size={18} aria-hidden="true" />
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
