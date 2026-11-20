import { useState } from 'react';
import { MailCheck, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { authController } from '../../controllers/authController';
import { friendlyError } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';

/**
 * Shown where booking needs a confirmed email. Lets the person resend the link and,
 * once they have clicked it, carry on without signing out and in again.
 */
export function VerifyEmailNotice() {
  const { user, refreshEmailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sentAt, setSentAt] = useState(0);

  const resend = async () => {
    if (sending || Date.now() - sentAt < 60_000) {
      toast.info('A link was sent less than a minute ago. Check your inbox and spam folder.');
      return;
    }
    setSending(true);
    try {
      await authController.resendVerification();
      setSentAt(Date.now());
      toast.success(`A new link is on its way to ${user?.email}.`);
    } catch (err) {
      toast.error(friendlyError(err, 'The link could not be sent. Please try again in a few minutes.'));
    } finally {
      setSending(false);
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      const ok = await refreshEmailVerified();
      if (ok) toast.success('Thank you, your email is confirmed.');
      else toast.info('Not confirmed yet. Open the link in the email we sent, then try again.');
    } catch (err) {
      toast.error(friendlyError(err, 'Could not check right now. Please try again.'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-blue-50 text-blue-950" role="status">
      <p className="font-semibold flex items-center gap-2"><MailCheck size={20} className="text-bai-blue shrink-0" aria-hidden="true" />Confirm your email to book</p>
      <p className="text-sm mt-2 leading-relaxed">
        We sent a link to <strong className="break-all">{user?.email}</strong>. Open it, then come back and tap “I’ve confirmed it”.
      </p>
      <div className="even-row mt-4">
        <button type="button" onClick={check} disabled={checking} className="btn btn-primary">
          {checking && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          <span>I’ve confirmed it</span>
        </button>
        <button type="button" onClick={resend} disabled={sending} className="btn btn-outline">
          {sending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          <span>Resend link</span>
        </button>
      </div>
    </div>
  );
}
