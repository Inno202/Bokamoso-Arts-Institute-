import React, { useState } from 'react';
import { useAuth, UserRole } from '../components/AuthProvider';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../controllers/lib/firebase';
import { Navigate } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { ROUTES } from '../../controllers/navigation';

export default function Login() {
  const { user, role, loading } = useAuth();
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in cancelled.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bai-black flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-bai-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (role === 'TICKET_SCANNER') return <Navigate to={ROUTES.SCANNER} />;
    return <Navigate to={ROUTES.HOME} />;
  }

  return (
    <div className="min-h-screen bg-bai-black text-white flex items-center justify-center p-4 py-20">
      <div className="max-w-md w-full bg-white text-bai-black rounded-3xl p-8 shadow-2xl border-4 border-bai-red">
         <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-bai-red text-white flex items-center justify-center rounded-full mb-4">
               <Music2 size={32} />
            </div>
            <h1 className="font-display font-black tracking-tighter text-3xl">SIGN IN</h1>
            <p className="text-bai-black/50 text-sm mt-2 text-center">
               Access the Bokamoso Arts Institute portal to view tickets, manage operations, and more.
            </p>
         </div>

         {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 text-sm font-bold border-l-4 border-red-500">
               {error}
            </div>
         )}

         <div className="space-y-4">
            <button 
               onClick={handleGoogleLogin}
               className="w-full py-4 bg-bai-blue hover:bg-bai-blue/90 text-white font-display font-bold uppercase tracking-widest transition-colors flex items-center justify-center space-x-3"
            >
               <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" className="w-6 h-6 bg-white p-1 rounded-full" />
               <span>Continue with Google</span>
            </button>
         </div>

         <div className="my-8 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-gray-300 after:mt-0.5 after:flex-1 after:border-t after:border-gray-300">
            <p className="mx-4 mb-0 text-center font-semibold text-gray-500 text-sm">Demo Instructions</p>
         </div>
         
         <p className="text-sm text-center text-bai-black/80 font-medium">
           Please sign in with Google first. <br/><br/>
           After signing in, use the <strong>Developer Settings</strong> floating button (bottom right) to switch roles!
         </p>
         
         <p className="mt-8 text-center text-xs text-bai-black/40">
           Protected by Google Firebase. <br/> By signing in, you accept our rules.
         </p>
      </div>
    </div>
  );
}
