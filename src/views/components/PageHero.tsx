import type { ReactNode } from 'react';

interface PageHeroProps {
  /** First line of the heading. */
  line1: string;
  /** Second line, shown in the accent colour. */
  line2?: string;
  accent?: 'red' | 'blue';
  /** Short line above the heading, in the brand's serif italic. */
  label?: string;
  quote?: string;
  children?: ReactNode;
  /** Extra space below, for pages whose first block overlaps the band. */
  overlap?: boolean;
}

/** The dark page header with the piano-key motif, shared by every inner page. */
export function PageHero({ line1, line2, accent = 'red', label, quote, children, overlap }: PageHeroProps) {
  return (
    <section className={`bg-bai-black text-white px-4 pt-16 md:pt-24 relative overflow-hidden ${overlap ? 'pb-28 md:pb-36' : 'pb-16 md:pb-24'}`}>
      <div className="absolute inset-0 piano-key-pattern opacity-10" aria-hidden="true" />
      <div className="max-w-7xl mx-auto sm:px-2 lg:px-4 relative">
        {label && <p className="font-serif italic text-white text-xl md:text-2xl mb-4">{label}</p>}
        <h1 className="display text-4xl sm:text-5xl md:text-7xl">
          {line1}
          {line2 && <><br /><span className={accent === 'blue' ? 'text-bai-blue-soft' : 'text-bai-red-soft'}>{line2}</span></>}
        </h1>
        {quote && <p className="max-w-2xl text-white/85 text-lg md:text-2xl leading-relaxed font-serif italic mt-6 md:mt-8">{quote}</p>}
        {children}
      </div>
    </section>
  );
}
