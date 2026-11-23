import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, type QueryDocumentSnapshot } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { db } from '../../controllers/lib/firebase';
import { checkBotCheck, ERROR_KINDS, errorLog, type BotCheckStatus, type ErrorEntry, type ErrorKind } from '../../controllers/errorLogController';
import { formatDateTime, friendlyError, toDate } from '../../controllers/lib/utils';
import { useAuth } from '../components/AuthProvider';
import { logger } from '../../services/loggerService';

/** Super admins: problems visitors and staff ran into, newest first, plus a live bot-check test. */
export function SiteErrors() {
  const [kind, setKind] = useState<ErrorKind | ''>('');
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bot, setBot] = useState<BotCheckStatus | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const asked = useRef(new Set<string>());

  const load = useCallback(async (after?: QueryDocumentSnapshot) => {
    setLoading(true);
    setError(null);
    try {
      const page = await errorLog.page(kind || undefined, after);
      setEntries(prev => (after ? [...prev, ...page.entries] : page.entries));
      setCursor(page.cursor);
    } catch (err) {
      logger.error('Error log failed to load', err);
      setError(friendlyError(err, 'The error log could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void checkBotCheck().then(setBot); }, []);

  // Problems newer than the last visit are marked "New"; opening this page counts as seeing them.
  const { user, userData } = useAuth();
  const [lastSeen] = useState(() => errorLog.seenAt(userData?.errorsSeenAt).getTime());
  useEffect(() => { if (user) errorLog.markSeen(user.uid); }, [user]);

  // Show who it happened to (for signed-in people), looked up once per account.
  useEffect(() => {
    for (const uid of new Set(entries.map(e => e.uid).filter(Boolean))) {
      if (asked.current.has(uid)) continue;
      asked.current.add(uid);
      getDoc(doc(db, 'users', uid))
        .then(snap => { const d = snap.data(); if (d) setNames(n => ({ ...n, [uid]: d.displayName || d.email || 'Account' })); })
        .catch(() => undefined);
    }
  }, [entries]);

  const chip = (value: ErrorKind | '', label: string) => (
    <button
      key={value || 'all'}
      type="button"
      onClick={() => setKind(value)}
      aria-pressed={kind === value}
      className={`min-h-[44px] px-4 rounded-full text-sm font-semibold border transition-colors ${kind === value ? 'bg-bai-black text-white border-bai-black' : 'border-bai-black/25 hover:border-bai-black'}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${bot?.state === 'failing' ? 'bg-red-50 text-red-950' : bot?.state === 'working' ? 'bg-green-50 text-green-950' : 'bg-white border border-bai-black/10'}`} role="status">
        {bot?.state === 'failing' ? <ShieldAlert size={20} className="shrink-0 mt-0.5" aria-hidden="true" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="font-semibold">
            {bot === null ? 'Testing the bot check on this device' : bot.state === 'working' ? 'Bot check (App Check) is working on this device' : bot.state === 'off' ? 'Bot check is not set up in this version of the site' : 'Bot check (App Check) is failing on this device'}
          </p>
          {bot?.state === 'failing' && <p className="text-sm mt-1 break-words">Reason from Firebase: {bot.reason}. Do not press Enforce in App Check until this says working.</p>}
        </div>
      </div>

      <div className="even-row mb-8" role="group" aria-label="Show problems with">
        {chip('', 'Everything')}
        {(Object.keys(ERROR_KINDS) as ErrorKind[]).map(key => chip(key, ERROR_KINDS[key]))}
      </div>

      {error && <p className="p-4 rounded-xl bg-red-50 text-red-900 mb-6" role="alert">{error}</p>}

      {loading && entries.length === 0 ? (
        <div className="space-y-3" role="status" aria-label="Loading problems">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white animate-pulse rounded-xl" />)}
        </div>
      ) : entries.length === 0 && !error ? (
        <p className="py-8 border-y border-bai-black/15 text-bai-black/75">No problems recorded. Anything visitors or staff run into will appear here.</p>
      ) : (
        <ol className="border-t border-bai-black/15">
          {entries.map(entry => (
            <li key={entry.id} className="py-4 border-b border-bai-black/15 flex items-start gap-4">
              <span className="w-10 h-10 rounded-full bg-red-50 text-bai-red-deep flex items-center justify-center shrink-0" aria-hidden="true"><AlertTriangle size={18} /></span>
              <div className="min-w-0 flex-grow">
                <p className="font-semibold break-words">
                  {(toDate(entry.at)?.getTime() ?? Date.now()) > lastSeen && <span className="inline-block align-middle mr-2 text-xs font-bold px-2 py-0.5 rounded-full bg-bai-red text-white">New</span>}
                  {ERROR_KINDS[entry.kind] || entry.kind}: {entry.message || entry.code}
                </p>
                <p className="text-sm text-bai-black/70 mt-0.5 break-words">
                  {[entry.code, entry.page, entry.browser, entry.uid ? names[entry.uid] || 'Signed-in account' : 'Visitor', entry.release && `release ${entry.release}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <time className="num text-sm text-bai-black/70 text-right shrink-0">{formatDateTime(entry.at) || 'Just now'}</time>
            </li>
          ))}
        </ol>
      )}

      {cursor && (
        <button type="button" onClick={() => load(cursor)} disabled={loading} className="btn btn-outline btn-block mt-6">
          {loading ? 'Loading' : 'Load more'}
        </button>
      )}
    </>
  );
}
