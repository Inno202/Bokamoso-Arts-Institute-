import { Link } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';

/**
 * The page for addresses that do not exist: a music staff where "404" sits on the
 * lines, the 0 is a bewildered whole note, and one little note has fallen off the sheet.
 * The motion is gentle and stops for people who ask for reduced motion.
 */
export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 sm:px-6 py-14 text-center">
      <MissingNote />
      <p className="mt-8 text-xs font-bold tracking-[0.2em] uppercase text-bai-red-deep">404 · Page not found</p>
      <h1 className="display text-4xl sm:text-5xl md:text-6xl mt-3">This page missed its cue</h1>
      <p className="text-bai-ink-soft text-lg max-w-md mt-4 leading-relaxed">
        We searched the whole music sheet, every bar and every verse, but this note is not there. It may have moved, or the link has a wrong note.
      </p>
      <div className="even-row mt-9 w-full max-w-md">
        <Link to={ROUTES.HOME} className="btn btn-primary">Back to home</Link>
        <Link to={ROUTES.EVENTS} className="btn btn-outline">See upcoming events</Link>
      </div>
    </div>
  );
}

/** A flat sign (♭) drawn on the staff: stem and rounded bowl. */
function Flat({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x} y1={y - 30} x2={x} y2={y + 8} />
      <path d={`M${x} ${y + 8} C${x + 15} ${y + 1}, ${x + 15} ${y - 13}, ${x} ${y - 5}`} />
    </g>
  );
}

function MissingNote() {
  // Staff lines, top to bottom, 25 apart (the G line, where the clef curls, is 145).
  const lines = [70, 95, 120, 145, 170];
  return (
    <svg viewBox="0 0 800 280" className="w-full max-w-[44rem] h-auto overflow-visible" role="img" aria-label="A page of sheet music for BAI: a music staff reading 404, where the zero is a puzzled whole note and a small note has fallen off the sheet">
      {/* The part name, like a singer's name on a score */}
      <text x="62" y="133" textAnchor="middle" fill="#0B0B0C" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="44">BAI</text>

      {/* Bracket */}
      <g fill="#0B0B0C">
        <rect x="112" y="62" width="7" height="116" />
        <path d="M112 62 h7 c6 0 14 -6 20 -16 c-2 10 -10 20 -20 22 h-7z" />
        <path d="M112 178 h7 c6 0 14 6 20 16 c-2 -10 -10 -20 -20 -22 h-7z" />
      </g>

      {/* The staff: five lines, opening and closing bar lines */}
      <g stroke="#0B0B0C" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
        {lines.map(y => <line key={y} x1="126" x2="786" y1={y} y2={y} />)}
        <line x1="126" x2="126" y1="70" y2="170" />
        <line x1="786" x2="786" y1="70" y2="170" strokeWidth="4" />
      </g>

      {/* Bar number, in italics above the staff */}
      <text x="142" y="28" fill="#0B0B0C" fontFamily="'Cormorant Garamond', Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="26">404</text>

      {/* Treble clef, curling round the G line */}
      <g fill="none" stroke="#0B0B0C" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M158 150 C146 150 144 136 156 131 C171 126 181 141 174 153 C166 167 138 167 132 149 C126 129 146 109 164 93 C182 77 182 49 170 45 C158 41 150 61 154 85 L166 190 C168 204 150 210 146 198" />
      </g>
      <circle cx="149" cy="196" r="6.5" fill="#0B0B0C" />

      {/* Key signature: three flats (B, E and A) */}
      <Flat x={200} y={120} />
      <Flat x={218} y={82.5} />
      <Flat x={236} y={132.5} />

      {/* The two 4s, sitting on the staff in the site's serif */}
      <g fill="#0B0B0C" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="168" textAnchor="middle">
        <text x="340" y="166">4</text>
        <text x="620" y="166">4</text>
      </g>

      {/* The 0: a bewildered whole note, wobbling */}
      <g className="note-wobble">
        <ellipse cx="480" cy="120" rx="58" ry="42" transform="rotate(-18 480 120)" fill="#FAF9F6" stroke="#0B0B0C" strokeWidth="17" />
        <circle cx="461" cy="112" r="6.5" fill="#0B0B0C" />
        <circle cx="493" cy="104" r="6.5" fill="#0B0B0C" />
        <circle cx="463" cy="110" r="2" fill="#FAF9F6" />
        <circle cx="495" cy="102" r="2" fill="#FAF9F6" />
        <ellipse cx="484" cy="134" rx="6" ry="7.5" fill="#0B0B0C" />
        <path d="M528 82 q7 11 0 16 q-7 -5 0 -16z" fill="#1D4ED8" opacity="0.85" />
      </g>

      {/* Question marks floating up */}
      <g fill="#E11D48" fontFamily="'DM Sans', system-ui, sans-serif" fontWeight="700">
        <text className="note-float" x="422" y="48" fontSize="26">?</text>
        <text className="note-float note-float-late" x="544" y="40" fontSize="20">?</text>
      </g>

      {/* A trail showing where the little note fell from */}
      <path d="M730 172 q18 14 22 30" fill="none" stroke="#0B0B0C" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" opacity="0.35" />

      {/* The note that fell off the sheet: flat on its back, a little dizzy */}
      <g className="note-fallen">
        <line x1="742" y1="240" x2="682" y2="240" stroke="#E11D48" strokeWidth="5" strokeLinecap="round" />
        <path d="M682 240 q4 -24 26 -26" fill="none" stroke="#E11D48" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="756" cy="236" rx="18" ry="13" transform="rotate(-15 756 236)" fill="#E11D48" />
        <g stroke="#FAF9F6" strokeWidth="2.2" strokeLinecap="round">
          <path d="M747 230 l5 5 M752 230 l-5 5" />
          <path d="M759 228 l5 5 M764 228 l-5 5" />
        </g>
        <g fill="#1D4ED8">
          <path d="M742 204 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5z" />
          <path d="M776 210 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" />
          <circle cx="760" cy="198" r="2.5" />
        </g>
        <line x1="666" x2="798" y1="254" y2="254" stroke="#0B0B0C" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      </g>
    </svg>
  );
}
