import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { BAIEvent } from '../../models/types';
import { useAuth } from './AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { waitlistController } from '../../controllers/waitlistController';
import { friendlyError } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';

/** Shown instead of "Add ticket to bag" when a show is sold out. */
export function WaitlistButton({ event }: { event: BAIEvent }) {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setOn(false); return; }
    let live = true;
    waitlistController.isOn(event.id, user.uid).then(v => { if (live) setOn(v); }).catch(() => { if (live) setOn(false); });
    return () => { live = false; };
  }, [event.id, user]);

  const join = async () => {
    if (!user) {
      toast.info('Sign in to join the waiting list.');
      navigate(ROUTES.LOGIN, { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    try {
      await waitlistController.join(event.id, user, userData?.displayName);
      setOn(true);
      toast.success('You are on the waiting list. We will contact you if seats become available.');
    } catch (err) {
      logger.error('Joining the waiting list failed', err);
      toast.error(friendlyError(err, 'You could not be added to the waiting list. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await waitlistController.leave(event.id, user.uid);
      setOn(false);
      toast.success('You have left the waiting list.');
    } catch (err) {
      logger.error('Leaving the waiting list failed', err);
      toast.error(friendlyError(err, 'That did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (on) {
    return (
      <div className="text-center">
        <p className="font-semibold text-green-800 min-h-[48px] flex items-center justify-center" role="status">You are on the waiting list</p>
        <button type="button" onClick={leave} disabled={busy} className="link min-h-[44px] text-sm">Leave the waiting list</button>
      </div>
    );
  }
  return (
    <>
      <p className="text-sm text-bai-ink-soft mb-3">Sold out. Join the waiting list and we will contact you by email if seats become available.</p>
      <button type="button" onClick={join} disabled={busy || on === null} className="btn btn-block btn-outline">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        <span>Join the waiting list</span>
      </button>
    </>
  );
}
