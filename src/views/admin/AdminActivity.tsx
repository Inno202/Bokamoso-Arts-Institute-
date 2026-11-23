import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SiteErrors } from './SiteErrors';
import { useAuth } from '../components/AuthProvider';
import { errorLog } from '../../controllers/errorLogController';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { CalendarDays, FileText, KeyRound, Ticket, Users } from 'lucide-react';
import { AdminShell } from './AdminShell';
import { ACTIVITY_AREAS, activityController, type ActivityArea, type ActivityEntry } from '../../controllers/activityController';
import { formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { ROLE_LABELS } from '../../models/types';
import { logger } from '../../services/loggerService';

const ICONS: Record<ActivityArea, typeof Users> = { people: Users, events: CalendarDays, content: FileText, access: KeyRound, tickets: Ticket };

/** Super admins only: every recorded staff action, newest first. */
export default function AdminActivity() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'errors' ? 'errors' : 'staff';
  // How many problems are new since the error log was last opened (shown on its button).
  const { userData } = useAuth();
  const [newErrors, setNewErrors] = useState(0);
  useEffect(() => {
    if (view === 'errors') { setNewErrors(0); return; }
    errorLog.countSince(errorLog.seenAt(userData?.errorsSeenAt)).then(setNewErrors).catch(() => setNewErrors(0));
  }, [view, userData?.errorsSeenAt]);
  const [area, setArea] = useState<ActivityArea | ''>('');
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after?: QueryDocumentSnapshot) => {
    setLoading(true);
    setError(null);
    try {
      const page = await activityController.page(area || undefined, after);
      setEntries(prev => (after ? [...prev, ...page.entries] : page.entries));
      setCursor(page.cursor);
    } catch (err) {
      logger.error('Activity log failed to load', err);
      setError(friendlyError(err, 'The activity log could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [area]);

  useEffect(() => { if (view === 'staff') void load(); }, [load, view]);

  const chip = (value: ActivityArea | '', label: string) => (
    <button
      key={value || 'all'}
      type="button"
      onClick={() => setArea(value)}
      aria-pressed={area === value}
      className={`min-h-[44px] px-4 rounded-full text-sm font-semibold border transition-colors ${area === value ? 'bg-bai-black text-white border-bai-black' : 'border-bai-black/25 hover:border-bai-black'}`}
    >
      {label}
    </button>
  );

  return (
    <AdminShell title="Activity">
      <div className="even-cols mb-6 max-w-md" role="group" aria-label="Which log">
        {([['staff', 'Staff actions'], ['errors', 'Site errors']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={view === value}
            onClick={() => setParams(value === 'errors' ? { view: 'errors' } : {}, { replace: true })}
            className={`min-h-[48px] px-4 rounded-full font-semibold border transition-colors ${view === value ? 'bg-bai-black text-white border-bai-black' : 'border-bai-black/25 hover:border-bai-black'}`}>
            {label}{value === 'errors' && newErrors > 0 && <><span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-bai-red text-white text-xs font-bold" aria-hidden="true">{newErrors}</span><span className="sr-only"> ({newErrors} new)</span></>}
          </button>
        ))}
      </div>
      <p className="text-bai-black/70 mb-6 max-w-2xl">
        {view === 'errors'
          ? 'Problems visitors and staff ran into, newest first: pages that broke, and sign-ins, bookings or scans that failed for an unexpected reason. No names, emails or form contents are recorded.'
          : 'Every recorded staff action, newest first. Entries cannot be changed or deleted, and only super admins can see this page.'}
      </p>
      {view === 'errors' ? <SiteErrors /> : <>
      <div className="even-row mb-8" role="group" aria-label="Show activity for">
        {chip('', 'Everything')}
        {(Object.keys(ACTIVITY_AREAS) as ActivityArea[]).map(key => chip(key, ACTIVITY_AREAS[key]))}
      </div>

      {error && <p className="p-4 rounded-xl bg-red-50 text-red-900 mb-6" role="alert">{error}</p>}

      {loading && entries.length === 0 ? (
        <div className="space-y-3" role="status" aria-label="Loading activity">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white animate-pulse rounded-xl" />)}
        </div>
      ) : entries.length === 0 && !error ? (
        <p className="py-8 border-y border-bai-black/15 text-bai-black/75">Nothing recorded here yet.</p>
      ) : (
        <ol className="border-t border-bai-black/15">
          {entries.map(entry => {
            const Icon = ICONS[entry.area] || FileText;
            return (
              <li key={entry.id} className="py-4 border-b border-bai-black/15 flex items-start gap-4">
                <span className="w-10 h-10 rounded-full bg-white border border-bai-black/10 flex items-center justify-center shrink-0" aria-hidden="true"><Icon size={18} /></span>
                <div className="min-w-0 flex-grow">
                  <p className="break-words">{entry.summary}</p>
                  <p className="text-sm text-bai-black/70 mt-0.5">
                    {entry.actorName}{entry.actorRole ? `, ${ROLE_LABELS[entry.actorRole] || entry.actorRole}` : ''}
                  </p>
                </div>
                <time className="num text-sm text-bai-black/70 text-right shrink-0">{formatDateTime(entry.at) || 'Just now'}</time>
              </li>
            );
          })}
        </ol>
      )}

      {cursor && (
        <button type="button" onClick={() => load(cursor)} disabled={loading} className="btn btn-outline btn-block mt-6">
          {loading ? 'Loading' : 'Load more'}
        </button>
      )}
      </>}
    </AdminShell>
  );
}
