import { useEffect, useState } from 'react';
import { Check, Clock, X, ShieldOff } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { ACCESS_DURATIONS, contentAccessController, hasLiveAccess } from '../../controllers/contentAccessController';
import { formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { confirmAction } from '../../services/confirm';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';
import type { ContentAccess } from '../../models/types';

/** For super admins and the CEO: PRO requests to edit site content, and who has access now. */
export function ContentAccessRequests() {
  const { user } = useAuth();
  const [all, setAll] = useState<ContentAccess[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => contentAccessController.subscribeAll(list => { setAll(list); setFailed(false); }, () => setFailed(true)), []);

  const pending = (all || []).filter(a => a.status === 'PENDING');
  const active = (all || []).filter(a => hasLiveAccess(a));
  const who = (a: ContentAccess) => a.name || a.email;

  const run = async (uid: string, action: () => Promise<void>, done: string, fallback: string) => {
    setBusy(uid);
    try {
      await action();
      toast.success(done);
    } catch (err) {
      logger.error('Content access change failed', err);
      toast.error(friendlyError(err, fallback));
    } finally {
      setBusy(null);
    }
  };

  const approve = async (a: ContentAccess) => {
    if (!user) return;
    const hours = durations[a.uid] ?? 24;
    const label = ACCESS_DURATIONS.find(d => d.hours === hours)?.label || `${hours} hours`;
    if (!await confirmAction({ title: `Let ${who(a)} edit site content?`, message: `They can change any page's content for ${label}. You can end it early here.`, confirmLabel: 'Approve' })) return;
    await run(a.uid, () => contentAccessController.approve(a.uid, user.uid, hours), `${who(a)} can edit site content for ${label}.`, 'The request could not be approved.');
  };
  const decline = async (a: ContentAccess) => {
    if (!user) return;
    if (!await confirmAction({ title: `Decline ${who(a)}'s request?`, message: 'They will see that it was declined and can ask again.', confirmLabel: 'Decline', tone: 'danger' })) return;
    await run(a.uid, () => contentAccessController.decline(a.uid, user.uid), 'Request declined.', 'The request could not be declined.');
  };
  const end = async (a: ContentAccess) => {
    if (!user) return;
    if (!await confirmAction({ title: `End ${who(a)}'s access now?`, message: 'They will no longer be able to save changes to site content.', confirmLabel: 'End access', tone: 'danger' })) return;
    await run(a.uid, () => contentAccessController.end(a.uid, user.uid), 'Access ended.', 'Access could not be ended.');
  };

  return (
    <section className="mb-10 pb-10 border-b border-bai-black/15" aria-labelledby="access-requests-heading">
      <h2 id="access-requests-heading" className="font-semibold text-lg mb-1 flex items-center gap-2">
        Site content access
        {pending.length > 0 && <span className="num text-xs font-bold bg-bai-red text-white rounded-full px-2 py-0.5">{pending.length} waiting</span>}
      </h2>
      <p className="text-sm text-bai-black/70 mb-4">PRO staff ask here before they can edit site content.</p>

      {failed ? (
        <p className="p-4 rounded-xl bg-red-50 text-red-900" role="alert">Requests could not be loaded. Check your connection and reload the page.</p>
      ) : all === null ? (
        <div className="h-16 bg-white animate-pulse rounded-xl" role="status" aria-label="Loading requests" />
      ) : pending.length === 0 && active.length === 0 ? (
        <p className="text-bai-black/70">No requests waiting, and no PRO staff have access right now.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map(a => (
            <li key={a.uid} className="panel p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="min-w-0 flex-grow">
                <p className="font-bold break-words">{who(a)} <span className="font-normal text-bai-black/70 break-all">{a.email}</span></p>
                <p className="num text-sm text-bai-black/70 flex items-center gap-1.5 mt-0.5"><Clock size={14} aria-hidden="true" />Asked {formatDateTime(a.requestedAt)}</p>
                {a.note && <p className="mt-2 break-words">“{a.note}”</p>}
              </div>
              {/* One row on every screen: how long, Approve, Decline. */}
              <div className="grid grid-cols-3 gap-2 w-full lg:w-auto lg:flex lg:items-center shrink-0">
                <label className="sr-only" htmlFor={`dur-${a.uid}`}>How long {who(a)} may edit</label>
                <select id={`dur-${a.uid}`} className="field min-w-0 px-3 lg:w-32" value={durations[a.uid] ?? 24} onChange={e => setDurations(d => ({ ...d, [a.uid]: Number(e.target.value) }))}>
                  {ACCESS_DURATIONS.map(d => <option key={d.hours} value={d.hours}>{d.label}</option>)}
                </select>
                <button type="button" onClick={() => approve(a)} disabled={busy === a.uid} className="btn btn-primary min-w-0 px-3 sm:px-5"><Check size={16} className="hidden sm:block shrink-0" aria-hidden="true" /><span>Approve</span></button>
                <button type="button" onClick={() => decline(a)} disabled={busy === a.uid} className="btn btn-danger min-w-0 px-3 sm:px-5"><X size={16} className="hidden sm:block shrink-0" aria-hidden="true" /><span>Decline</span></button>
              </div>
            </li>
          ))}
          {active.map(a => (
            <li key={a.uid} className="p-4 sm:p-5 rounded-2xl bg-green-50 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-grow">
                <p className="font-bold break-words">{who(a)} <span className="font-normal text-green-950/70">can edit</span></p>
                <p className="num text-sm text-green-950/80">Until {formatDateTime(a.expiresAt)}</p>
              </div>
              <button type="button" onClick={() => end(a)} disabled={busy === a.uid} className="btn btn-danger shrink-0"><ShieldOff size={16} aria-hidden="true" /><span>End access</span></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
