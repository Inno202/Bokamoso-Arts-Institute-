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

function MissingNote() {
  return (
    <svg viewBox="0 0 640 280" className="w-full max-w-[36rem] h-auto overflow-visible" role="img" aria-label="A music staff reading 404, where the zero is a puzzled whole note and a small note has fallen off the sheet">
      {/* The staff: five lines and the opening bar line */}
      <g stroke="#0B0B0C" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
        {[70, 95, 120, 145, 170].map(y => <line key={y} x1="24" x2="616" y1={y} y2={y} />)}
        <line x1="24" x2="24" y1="70" y2="170" strokeWidth="4" />
        <line x1="616" x2="616" y1="70" y2="170" strokeWidth="4" />
      </g>

      {/* The two 4s, sitting on the staff in the site's serif */}
      <g fill="#0B0B0C" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="168" textAnchor="middle">
        <text x="168" y="166">4</text>
        <text x="472" y="166">4</text>
      </g>

      {/* The 0: a bewildered whole note, wobbling */}
      <g className="note-wobble">
        <ellipse cx="320" cy="120" rx="58" ry="42" transform="rotate(-18 320 120)" fill="#FAF9F6" stroke="#0B0B0C" strokeWidth="17" />
        {/* eyes looking up and to the side */}
        <circle cx="301" cy="112" r="6.5" fill="#0B0B0C" />
        <circle cx="333" cy="104" r="6.5" fill="#0B0B0C" />
        <circle cx="303" cy="110" r="2" fill="#FAF9F6" />
        <circle cx="335" cy="102" r="2" fill="#FAF9F6" />
        {/* a small "oh" mouth */}
        <ellipse cx="324" cy="134" rx="6" ry="7.5" fill="#0B0B0C" />
        {/* a worried drop */}
        <path d="M368 82 q7 11 0 16 q-7 -5 0 -16z" fill="#1D4ED8" opacity="0.85" />
      </g>

      {/* Question marks floating up */}
      <g fill="#E11D48" fontFamily="'DM Sans', system-ui, sans-serif" fontWeight="700">
        <text className="note-float" x="262" y="48" fontSize="26">?</text>
        <text className="note-float note-float-late" x="384" y="40" fontSize="20">?</text>
      </g>

      {/* The note that fell off the sheet: flat on its back, a little dizzy */}
      <g className="note-fallen">
        {/* stem lying along the floor, flag curling up */}
        <line x1="572" y1="240" x2="512" y2="240" stroke="#E11D48" strokeWidth="5" strokeLinecap="round" />
        <path d="M512 240 q4 -24 26 -26" fill="none" stroke="#E11D48" strokeWidth="5" strokeLinecap="round" />
        {/* the note head, with dizzy eyes */}
        <ellipse cx="586" cy="236" rx="18" ry="13" transform="rotate(-15 586 236)" fill="#E11D48" />
        <g stroke="#FAF9F6" strokeWidth="2.2" strokeLinecap="round">
          <path d="M577 230 l5 5 M582 230 l-5 5" />
          <path d="M589 228 l5 5 M594 228 l-5 5" />
        </g>
        {/* stars circling its head */}
        <g fill="#1D4ED8">
          <path d="M572 204 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5z" />
          <path d="M606 210 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" />
          <circle cx="590" cy="198" r="2.5" />
        </g>
        {/* the floor */}
        <line x1="496" x2="628" y1="254" y2="254" stroke="#0B0B0C" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      </g>

      {/* A trail showing where it fell from */}
      <path d="M560 172 q18 14 22 30" fill="none" stroke="#0B0B0C" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}
