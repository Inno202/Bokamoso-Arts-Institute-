import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from 'lucide-react';
import { motion } from 'motion/react';
import { ROUTES } from '../../controllers/navigation';
import { authController } from '../../controllers/authController';
import { logger } from '../../services/loggerService';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (!password) return { label: 'None', color: 'bg-transparent', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (password.length < 10) return { label: 'Fair', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authController.register(email, password, displayName);
      alert("Registration successful! Please check your email for verification.");
      navigate(ROUTES.DASHBOARD);
    } catch (err: any) {
      if (err.message?.includes('auth/operation-not-allowed') || err.message?.includes('auth/email-password-not-enabled')) {
        setError('Email/Password registration is not enabled in Firebase Console. Please ask the administrator to enable it or use Google Login.');
      } else {
        setError(err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-bai-bone">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-2xl shadow-xl border-t-8 border-bai-blue overflow-hidden">
          <div className="p-8 text-center border-b border-bai-bone">
             <div className="w-12 h-12 bg-bai-black text-white flex items-center justify-center rounded-full mx-auto mb-4 border-2 border-bai-blue">
                <span className="font-display font-black text-xs">BAI</span>
             </div>
             <h1 className="font-display font-black text-2xl uppercase tracking-tighter italic leading-none">
                Join <br/> <span className="text-bai-blue">Bokamoso</span>
             </h1>
          </div>
          
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest border-l-4 border-red-500 rounded-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/30" size={18} />
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full h-12 pl-12 pr-4 bg-bai-bone/50 border-2 border-transparent focus:border-bai-blue outline-none text-sm transition-all rounded-lg font-medium"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/30" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full h-12 pl-12 pr-4 bg-bai-bone/50 border-2 border-transparent focus:border-bai-blue outline-none text-sm transition-all rounded-lg font-medium"
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/30" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full h-12 pl-12 pr-12 bg-bai-bone/50 border-2 border-transparent focus:border-bai-blue outline-none text-sm transition-all rounded-lg font-medium"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-bai-black/30 hover:text-bai-blue"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {password && (
                  <div className="px-1">
                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                       <div className={`h-full ${strength.color} transition-all duration-500`} style={{ width: strength.width }}></div>
                    </div>
                    <div className="flex justify-between mt-1">
                       <span className="text-[8px] font-black uppercase tracking-widest text-bai-black/30">Strength</span>
                       <span className={`text-[8px] font-black uppercase tracking-widest ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-bai-black text-white font-display font-black uppercase tracking-[0.2em] hover:bg-bai-blue transition-all flex items-center justify-center space-x-3 disabled:opacity-50 rounded-lg shadow-lg active:scale-95"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Sign Up</span> <UserPlus size={18} /></>}
              </button>
            </form>
          </div>
          
          <div className="p-6 bg-bai-bone/50 text-center border-t border-bai-black/5">
             <p className="text-[10px] font-bold uppercase tracking-widest text-bai-black/40">
                Already have an account? <Link to={ROUTES.LOGIN} className="text-bai-blue hover:underline">Login</Link>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
