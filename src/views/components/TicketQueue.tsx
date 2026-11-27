import { useEffect, useState } from 'react';

/**
 * The playful waiting screen shown while a booking waits in line during a rush
 * (see controllers/busyQueue.ts). Little notes queue along a music staff to the
 * box office; the motion stops for people who ask for reduced motion.
 */
export function TicketQueue({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  const waited = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 py-14 text-center">
      <QueueScene />
      <p className="mt-8 text-xs font-bold tracking-[0.2em] uppercase text-bai-red-deep">You are in the queue</p>
      <h1 className="display text-4xl sm:text-5xl md:text-6xl mt-3" role="status">Hold that note</h1>
      <p className="text-bai-ink-soft text-lg max-w-md mt-4 leading-relaxed">
        So many people are booking right now that the box office is letting them through a few at a time.
        We are trying for you every few seconds. Keep this page open; there is no need to refresh.
      </p>
      <p className="num mt-6 text-sm font-semibold" aria-hidden="true">Waiting {waited}</p>
      <p className="mt-2 text-sm text-bai-ink-soft max-w-sm">You will never be booked twice. If it takes too long, we will tell you, and nothing will be booked.</p>
    </div>
  );
}

/** A tiny eighth-note character with a face. */
function Note({ x, delay, color = '#0B0B0C' }: { x: number; delay: number; color?: string }) {
  return (
    <g className="queue-note" style={{ animationDelay: `${delay}ms` }}>
      <g transform={`translate(${x} 0)`}>
        <line x1="14" y1="116" x2="14" y2="58" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d="M14 58 q18 6 20 26" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="2" cy="118" rx="15" ry="11" transform="rotate(-18 2 118)" fill={color} />
        <circle cx="-3" cy="115" r="2.2" fill="#FAF9F6" />
        <circle cx="6" cy="113" r="2.2" fill="#FAF9F6" />
      </g>
    </g>
  );
}

function QueueScene() {
  const lines = [70, 90, 110, 130, 150];
  return (
    <svg viewBox="0 0 640 200" className="w-full max-w-[36rem] h-auto overflow-visible" role="img" aria-label="Little music notes waiting in a queue along a music staff to reach the box office">
      <g stroke="#0B0B0C" strokeWidth="2" strokeLinecap="round" opacity="0.25">
        {lines.map(y => <line key={y} x1="10" x2="520" y1={y} y2={y} />)}
      </g>

      {/* The queue shuffles forward, each note hopping a moment after the one in front. */}
      <g className="queue-line">
        <Note x={60} delay={600} />
        <Note x={140} delay={450} />
        <Note x={220} delay={300} color="#BE123C" />
        <Note x={300} delay={150} />
        <Note x={380} delay={0} />
      </g>

      {/* The box office */}
      <g>
        <rect x="500" y="40" width="120" height="132" rx="16" fill="#0B0B0C" />
        <rect x="514" y="54" width="92" height="44" rx="10" fill="#FAF9F6" />
        <text x="560" y="84" textAnchor="middle" fill="#0B0B0C" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="26">BAI</text>
        <rect x="532" y="112" width="56" height="60" rx="8" fill="#E11D48" />
        <circle cx="577" cy="144" r="3.5" fill="#FAF9F6" />
        <text x="560" y="30" textAnchor="middle" fill="#0B0B0C" fontFamily="'DM Sans', system-ui, sans-serif" fontWeight="700" fontSize="13" letterSpacing="2">BOX OFFICE</text>
      </g>

      {/* Little sparkles over the door: someone just got through */}
      <g className="queue-sparkle" fill="#1D4ED8">
        <path d="M480 30 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5z" />
        <circle cx="468" cy="52" r="2.5" />
      </g>
      <line x1="0" x2="640" y1="186" y2="186" stroke="#0B0B0C" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
    </svg>
  );
}
