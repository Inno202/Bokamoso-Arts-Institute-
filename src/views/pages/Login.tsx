import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { ROUTES, safeReturnPath } from '../../controllers/navigation';
import { authController } from '../../controllers/authController';
import { db } from '../../controllers/lib/firebase';
import { friendlyError } from '../../controllers/lib/utils';
import { GoogleMark } from '../components/GoogleMark';

const input = 'w-full h-12 pl-12 bg-bai-bone border-2 border-bai-black/15 focus:border-bai-red text-base transition-colors rounded-lg font-medium placeholder:text-bai-black/60';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterLogin = async (uid: string) => {
    const returnTo = safeReturnPath(location.state);
    if (returnTo) return navigate(returnTo, { replace: true });
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const role = snap.exists() ? snap.data().role : 'USER';
      navigate(role && role !== 'USER' ? (role === 'TICKET_SCANNER' ? ROUTES.SCANNER : ROUTES.DASHBOARD) : ROUTES.HOME, { replace: true });
    } catch {
      navigate(ROUTES.HOME, { replace: true });
    }
  };

  const run = async (action: () => Promise<{ uid: string }>) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const user = await action();
      await redirectAfterLogin(user.uid);
    } catch (err) {
      setError(friendlyError(err, 'Sign-in failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => authController.login(email, password));
  };

  const handleForgot = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your email address above first, then choose "Forgot password".');
      return;
    }
    try {
      await authController.forgotPassword(email);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/invalid-email' || code === 'auth/network-request-failed' || code === 'auth/too-many-requests') {
        setError(friendlyError(err));
        return;
      }
      // Any other outcome reads the same, so this form cannot reveal who has an account.
    }
    setNotice(`If an account exists for ${email.trim()}, a password reset link is on its way.`);
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-bai-bone">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)] border-t-8 border-bai-red overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center">
          <h1 className="font-display font-bold text-3xl uppercase tracking-tighter italic leading-none">
            Sign <span className="text-bai-red">in</span>
          </h1>
          <p className="text-sm text-bai-black/70 mt-3">Book tickets and see the ones you have.</p>
        </div>

        <div className="px-8 pb-8">
          {error && <p role="alert" className="mb-5 p-4 bg-red-50 text-red-800 text-sm rounded-lg">{error}</p>}
          {notice && <p role="status" className="mb-5 p-4 bg-green-50 text-green-900 text-sm rounded-lg">{notice}</p>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <label htmlFor="login-email" className="sr-only">Email address</label>
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/60" size={18} aria-hidden="true" />
              <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={`${input} pr-4`} />
            </div>

            <div className="relative">
              <label htmlFor="login-password" className="sr-only">Password</label>
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/60" size={18} aria-hidden="true" />
              <input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={`${input} pr-12`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-bai-black/60 hover:text-bai-red rounded-lg">
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleForgot} className="text-sm font-semibold text-bai-blue hover:text-bai-red transition-colors py-1 underline">
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full h-14 bg-bai-black text-white font-display font-bold uppercase tracking-[0.18em] hover:bg-bai-red transition-colors flex items-center justify-center gap-3 disabled:opacity-60 rounded-lg">
              {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" aria-label="Signing in" /> : <><span>Sign in</span> <LogIn size={18} aria-hidden="true" /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs uppercase font-bold tracking-widest text-bai-black/60" aria-hidden="true">
            <span className="h-px flex-grow bg-bai-black/15" />or<span className="h-px flex-grow bg-bai-black/15" />
          </div>

          <button onClick={() => run(() => authController.loginWithGoogle())} disabled={loading} className="w-full h-12 bg-white border-2 border-bai-black/20 hover:border-bai-black transition-colors flex items-center justify-center gap-3 rounded-lg font-bold text-sm disabled:opacity-60">
            <GoogleMark className="w-5 h-5" />
            <span>Sign in with Google</span>
          </button>
        </div>

        <p className="p-6 bg-bai-bone text-center border-t border-bai-black/10 text-sm text-bai-black/70">
          New here? <Link to={ROUTES.REGISTER} state={location.state} className="font-bold text-bai-red underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
