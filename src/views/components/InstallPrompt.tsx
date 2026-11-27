import { useEffect, useState } from 'react';
import { Share } from 'lucide-react';
import { dismissInstall, installNow, installOffer, onInstallChange } from '../../services/installApp';

const COPY = {
  tickets: {
    title: 'Keep your tickets one tap away',
    text: 'Add BAI to your home screen. Your tickets open from there, even without signal at the door.',
  },
  scanner: {
    title: 'Open the scanner faster',
    text: 'Add BAI to this phone\'s home screen to go straight to the door scanner.',
  },
} as const;

/**
 * A quiet, inline offer to install the site as an app. Shown only where it helps (My Tickets
 * once a ticket exists, and the door scanner), never on a first visit and never over content.
 */
export function InstallPrompt({ context, dark = false }: { context: keyof typeof COPY; dark?: boolean }) {
  const [offer, setOffer] = useState<ReturnType<typeof installOffer>>(null);
  useEffect(() => {
    const update = () => setOffer(installOffer());
    update();
    return onInstallChange(update);
  }, []);
  if (!offer) return null;

  const { title, text } = COPY[context];
  const surface = dark ? 'bg-white/10 border border-white/15 text-white' : 'panel';
  const muted = dark ? 'text-white/70' : 'text-bai-ink-soft';

  return (
    <section aria-label="Add BAI to your home screen" className={`${surface} rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
      <img src={`${import.meta.env.BASE_URL}assets/brand/app-icon-192.png`} alt="" width={48} height={48} className="hidden sm:block w-12 h-12 shrink-0" />
      <div className="min-w-0 flex-grow">
        <p className="font-semibold">{title}</p>
        <p className={`text-sm mt-1 ${muted}`}>
          {offer === 'ios'
            ? <>Tap <Share size={15} className="inline -mt-0.5" aria-label="Share" /> in Safari, then <strong>Add to Home Screen</strong>.</>
            : text}
        </p>
      </div>
      <div className="even-row sm:w-auto sm:shrink-0" style={{ ['--even-min' as string]: '7rem' }}>
        {offer === 'prompt' && (
          <button type="button" onClick={() => void installNow()} className={`btn ${dark ? 'btn-light' : 'btn-primary'}`}>Add to home screen</button>
        )}
        <button type="button" onClick={dismissInstall} className={`btn ${dark ? 'btn-outline-light' : 'btn-outline'}`}>{offer === 'ios' ? 'Got it' : 'Not now'}</button>
      </div>
    </section>
  );
}
