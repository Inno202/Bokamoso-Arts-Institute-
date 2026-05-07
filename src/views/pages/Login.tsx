import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { ROUTES } from '../../controllers/navigation';
import { authController } from '../../controllers/authController';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../controllers/lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handlePostLoginRedirect = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const role = userDoc.exists() ? userDoc.data().role : 'USER';
      
      // Determine source path from state
      const fromPath = (location.state as any)?.from;
      // location.state.from might be a string (from navigate(..., {state: {from: 'path'}}))
      // or an object (from ProtectedRoute)
      const from = typeof fromPath === 'string' ? fromPath : fromPath?.pathname || ROUTES.HOME;
      
      // Define what counts as a "purchase checkpoint"
      const isPurchaseCheckpoint = from.includes(ROUTES.CART) || from.includes(ROUTES.CHECKOUT);

      if (role === 'USER') {
        if (isPurchaseCheckpoint) {
          navigate(from, { replace: true });
        } else {
          // Regular users always go to Home by default as requested
          navigate(ROUTES.HOME, { replace: true });
        }
      } else {
        // Staff/Admin go to Dashboard
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
    } catch (err) {
      navigate(ROUTES.HOME, { replace: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await authController.login(email, password);
      if (user) {
        await handlePostLoginRedirect(user.uid);
      }
    } catch (err: any) {
      if (err.message?.includes('auth/operation-not-allowed') || err.message?.includes('auth/email-password-not-enabled')) {
        setError('Email/Password login is not enabled. Please use Google Login or enable it in the Firebase Console.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await authController.loginWithGoogle();
      if (user) {
        await handlePostLoginRedirect(user.uid);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-bai-bone">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-2xl shadow-xl border-t-8 border-bai-red overflow-hidden">
          <div className="p-8 text-center border-b border-bai-bone">
             <div className="w-12 h-12 bg-bai-black text-white flex items-center justify-center rounded-full mx-auto mb-4 border-2 border-bai-red">
                <span className="font-display font-black text-xs">BAI</span>
             </div>
             <h1 className="font-display font-black text-2xl uppercase tracking-tighter italic leading-none">
                Bokamoso <br/> <span className="text-bai-red">Login</span>
             </h1>
          </div>
          
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest border-l-4 border-red-500 rounded-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/30" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full h-12 pl-12 pr-4 bg-bai-bone/50 border-2 border-transparent focus:border-bai-red outline-none text-sm transition-all rounded-lg font-medium"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/30" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-12 pl-12 pr-12 bg-bai-bone/50 border-2 border-transparent focus:border-bai-red outline-none text-sm transition-all rounded-lg font-medium"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-bai-black/30 hover:text-bai-red"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => authController.forgotPassword(email)}
                  className="text-[10px] font-bold uppercase tracking-widest text-bai-blue hover:text-bai-red transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-bai-black text-white font-display font-black uppercase tracking-[0.2em] hover:bg-bai-red transition-all flex items-center justify-center space-x-3 disabled:opacity-50 rounded-lg shadow-lg active:scale-95"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Enter</span> <LogIn size={18} /></>}
              </button>
            </form>

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-bai-black/5"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase font-black bg-white px-4 tracking-[0.4em] text-bai-black/20">
                OR
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-8 w-full h-12 bg-white border-2 border-bai-black/5 hover:border-bai-black transition-all flex items-center justify-center space-x-4 rounded-lg font-bold text-xs uppercase tracking-widest group"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" />
              <span>Sing in with Google</span>
            </button>
          </div>
          
          <div className="p-6 bg-bai-bone/50 text-center border-t border-bai-black/5">
             <p className="text-[10px] font-bold uppercase tracking-widest text-bai-black/40">
                Don't have an account? <Link to={ROUTES.REGISTER} state={location.state} className="text-bai-red hover:underline">Register</Link>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
