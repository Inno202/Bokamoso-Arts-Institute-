import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { useAuth } from '../components/AuthProvider';
import { VerifyEmailNotice } from '../components/VerifyEmailNotice';
import { accountController, MIN_PASSWORD, usesPassword } from '../../controllers/accountController';
import { auth } from '../../controllers/lib/firebase';
import { ROUTES } from '../../controllers/navigation';
import { friendlyError } from '../../controllers/lib/utils';
import { confirmAction } from '../../services/confirm';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';
import { ROLE_LABELS } from '../../models/types';
import { REQUIRE_EMAIL_VERIFICATION } from '../../config';

/** Firebase's sign-in errors, in words people can act on. */
function accountError(err: unknown, fallback: string) {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'That current password is not right.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a few minutes and try again.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Google sign-in was closed before it finished.';
  if (code === 'auth/weak-password') return `Choose a stronger password (at least ${MIN_PASSWORD} characters).`;
  return friendlyError(err, fallback);
}

export default function Account() {
  const { user, userData, role, emailVerified } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(userData?.displayName || user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;
  const hasPassword = usesPassword(user);
  const isStaff = !!role && role !== 'USER';

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const saved = await accountController.rename(user, name);
      setName(saved);
      toast.success('Your name is updated.');
    } catch (err) {
      logger.error('Rename failed', err);
      toast.error(accountError(err, 'Your name could not be saved.'));
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await accountController.changePassword(user, current, next);
      setCurrent('');
      setNext('');
      toast.success('Your password is changed.');
    } catch (err) {
      logger.error('Password change failed', err);
      toast.error(accountError(err, 'Your password could not be changed.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const removeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!await confirmAction({
      title: 'Delete your account?',
      message: 'Your profile and bag are deleted and you are signed out. You will no longer be able to open your tickets here, so download any you still need first. This cannot be undone.',
      confirmLabel: 'Delete my account',
      tone: 'danger',
    })) return;
    setDeleting(true);
    try {
      await accountController.deleteAccount(user, deletePassword);
      toast.success('Your account has been deleted.');
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      logger.error('Account deletion failed', err);
      toast.error(accountError(err, 'Your account could not be deleted.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pb-24 min-h-screen">
      <PageHero title="Your" accent="account" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <section className="panel p-6 sm:p-8" aria-labelledby="details-heading">
          <h2 id="details-heading" className="display text-2xl mb-5">Your details</h2>
          <form onSubmit={saveName} className="space-y-4">
            <div>
              <label htmlFor="acc-name" className="field-label">Name</label>
              <input id="acc-name" className="field" value={name} maxLength={100} required autoComplete="name" onChange={e => setName(e.target.value)} />
              <p className="field-help">Shown on your tickets.</p>
            </div>
            <div>
              <p className="field-label">Email</p>
              <p className="flex flex-wrap items-center gap-2 break-all">
                {user.email}
                {emailVerified && <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-800"><CheckCircle2 size={16} aria-hidden="true" />Confirmed</span>}
              </p>
            </div>
            {role && <p className="text-sm text-bai-black/70">Account type: {ROLE_LABELS[role]}</p>}
            <button type="submit" disabled={savingName || !name.trim() || name.trim() === (userData?.displayName || '')} className="btn btn-primary">
              {savingName && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              <span>Save name</span>
            </button>
          </form>
          {REQUIRE_EMAIL_VERIFICATION && !emailVerified && <div className="mt-6"><VerifyEmailNotice /></div>}
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="password-heading">
          <h2 id="password-heading" className="display text-2xl mb-5">Password</h2>
          {hasPassword ? (
            <form onSubmit={savePassword} className="space-y-4">
              <input type="text" name="username" autoComplete="username" value={user.email || ''} readOnly hidden />
              <div>
                <label htmlFor="acc-current" className="field-label">Current password</label>
                <input id="acc-current" type="password" className="field" value={current} required autoComplete="current-password" onChange={e => setCurrent(e.target.value)} />
              </div>
              <div>
                <label htmlFor="acc-new" className="field-label">New password</label>
                <input id="acc-new" type="password" className="field" value={next} required minLength={MIN_PASSWORD} autoComplete="new-password" onChange={e => setNext(e.target.value)} />
                <p className="field-help">At least {MIN_PASSWORD} characters.</p>
              </div>
              <button type="submit" disabled={savingPassword || !current || next.length < MIN_PASSWORD} className="btn btn-primary">
                {savingPassword && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                <span>Change password</span>
              </button>
            </form>
          ) : (
            <p className="text-bai-ink-soft">You sign in with Google, so your password is managed in your Google account.</p>
          )}
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="signout-heading">
          <h2 id="signout-heading" className="display text-2xl mb-4">Sign out</h2>
          <button type="button" onClick={() => signOut(auth).then(() => navigate(ROUTES.HOME, { replace: true }))} className="btn btn-outline">
            Sign out on this device
          </button>
        </section>

        <section className="panel p-6 sm:p-8 border-red-200" aria-labelledby="delete-heading">
          <h2 id="delete-heading" className="display text-2xl mb-3">Delete your account</h2>
          {isStaff ? (
            <p className="text-bai-ink-soft">Staff accounts are removed by a super admin. Ask them if you are leaving the team.</p>
          ) : (
            <form onSubmit={removeAccount} className="space-y-4">
              <p className="text-bai-ink-soft leading-relaxed">
                This deletes your profile and your bag and signs you out for good. Past bookings stay in the institute’s booking and attendance records, as explained in the privacy policy.
              </p>
              {hasPassword && (
                <div>
                  <label htmlFor="acc-delete-password" className="field-label">Current password</label>
                  <input id="acc-delete-password" type="password" className="field" value={deletePassword} required autoComplete="current-password" onChange={e => setDeletePassword(e.target.value)} />
                </div>
              )}
              <button type="submit" disabled={deleting || (hasPassword && !deletePassword)} className="btn btn-danger">
                {deleting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                <span>Delete my account</span>
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
