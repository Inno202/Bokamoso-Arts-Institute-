import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from 'lucide-react';
import { ROUTES, safeReturnPath } from '../../controllers/navigation';
import { authController } from '../../controllers/authController';
import { friendlyError } from '../../controllers/lib/utils';

const MIN_PASSWORD = 8;
const input = 'field pl-12';

function passwordStrength(password: string) {
  if (password.length < MIN_PASSWORD) return { label: `Too short: use at least ${MIN_PASSWORD} characters`, bar: 'bg-red-600', width: '25%' };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  if (password.length >= 12 && variety >= 3) return { label: 'Strong password', bar: 'bg-green-700', width: '100%' };
  if (password.length >= 10 || variety >= 3) return { label: 'Good password', bar: 'bg-amber-600', width: '66%' };
  return { label: 'Fair: longer is stronger', bar: 'bg-amber-600', width: '45%' };
}

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authController.register(email, password, displayName);
      navigate(safeReturnPath(location.state) || ROUTES.HOME, { replace: true });
    } catch (err) {
      setError(friendlyError(err, 'Your account could not be created. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(password);

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-bai-bone">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)] border-t-8 border-bai-blue overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center">
          <h1 className="display text-3xl ">
            Join <span className="text-bai-blue">Bokamoso</span>
          </h1>
          <p className="text-sm text-bai-black/70 mt-3">An account keeps your tickets in one place.</p>
        </div>

        <div className="px-8 pb-8">
          {error && <p role="alert" className="mb-5 p-4 bg-red-50 text-red-800 text-sm rounded-lg">{error}</p>}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <label htmlFor="reg-name" className="sr-only">Full name</label>
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/60" size={18} aria-hidden="true" />
              <input id="reg-name" type="text" required maxLength={100} autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full name" className={`${input} pr-4`} />
            </div>

            <div className="relative">
              <label htmlFor="reg-email" className="sr-only">Email address</label>
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/60" size={18} aria-hidden="true" />
              <input id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={`${input} pr-4`} />
            </div>

            <div>
              <div className="relative">
                <label htmlFor="reg-password" className="sr-only">Password, at least {MIN_PASSWORD} characters</label>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/60" size={18} aria-hidden="true" />
                <input id="reg-password" type={showPassword ? 'text' : 'password'} required minLength={MIN_PASSWORD} autoComplete="new-password" aria-describedby="reg-password-hint" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`Password (${MIN_PASSWORD}+ characters)`} className={`${input} pr-12`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2 text-bai-black/70 hover:text-bai-blue">
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              <div id="reg-password-hint" className="mt-2 px-1" aria-live="polite">
                {password && (
                  <>
                    <div className="h-1 w-full bg-bai-black/10 rounded-full overflow-hidden" aria-hidden="true">
                      <div className={`h-full ${strength.bar} transition-[width] duration-300`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-bai-black/70 mt-1.5">{strength.label}</p>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-bai-black/75">
              By creating an account you agree to our <Link to={ROUTES.TERMS} className="link">terms</Link> and <Link to={ROUTES.PRIVACY} className="link">privacy policy</Link>.
            </p>

            <button type="submit" disabled={loading} className="btn btn-lg btn-primary btn-block">
              {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" aria-label="Creating your account" /> : <><span>Create account</span> <UserPlus size={18} aria-hidden="true" /></>}
            </button>
          </form>
        </div>

        <p className="p-6 bg-bai-bone text-center border-t border-bai-black/10 text-sm text-bai-black/70">
          Already have an account? <Link to={ROUTES.LOGIN} state={location.state} className="link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
