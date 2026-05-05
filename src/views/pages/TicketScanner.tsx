import { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, Search, Calendar, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { logger } from '../../services/loggerService';

export default function TicketScanner() {
  const { user, role } = useAuth();
  const [ticketId, setTicketId] = useState('');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (!user || (role !== 'SUPER_ADMIN' && role !== 'TICKET_SCANNER' && role !== 'PUBLIC_RELATIONS')) return;
    
    let scanner: Html5QrcodeScanner | null = null;
    
    if (!showManual) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: {width: 250, height: 250}, aspectRatio: 1.0 },
        /* verbose= */ false
      );
      scanner.render(onScanSuccess, onScanError);
    }

    function onScanSuccess(decodedText: string) {
      if (loading) return;
      handleVerification(decodedText);
    }

    function onScanError(_err: any) {
      // Ignore normal scanning errors
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => logger.error("Failed to clear scanner", error));
      }
    };
  }, [user, role, showManual]);

  const handleVerification = async (currentTicketId: string) => {
    setLoading(true);
    setScanResult(null);
    setTicketData(null);
    setMessage('');

    try {
      const result = await ticketController.validateTicketOnServer(currentTicketId);
      setScanResult('success');
      setTicketData(result.ticket);
      setMessage('Access Granted: Valid Entry');
      
      // Auto-clear result after delay to ready for next scan
      setTimeout(() => {
         // setScanResult(null);
      }, 5000);
    } catch (err: any) {
      setScanResult('error');
      setMessage(err.message || 'Invalid or already scanned');
    } finally {
      setLoading(false);
    }
  };

  const manualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketId) handleVerification(ticketId);
  };

  if (role !== 'SUPER_ADMIN' && role !== 'TICKET_SCANNER' && role !== 'PUBLIC_RELATIONS') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bai-black text-white p-6">
        <div className="text-center">
           <XCircle size={64} className="text-bai-red mx-auto mb-6" />
           <h2 className="font-display font-black text-3xl uppercase italic mb-2">Access Denied</h2>
           <p className="text-white/40 italic">You do not have the required permissions to access this tool.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bai-black text-white p-4 relative overflow-hidden flex flex-col">
      {/* Visual background overlay on scan */}
      <AnimatePresence>
         {scanResult === 'success' && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.15 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-green-500 z-0"
            />
         )}
         {scanResult === 'error' && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.15 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-red-500 z-0"
            />
         )}
      </AnimatePresence>

      <div className="relative z-10 max-w-lg mx-auto w-full flex-grow flex flex-col">
         {/* Header */}
         <div className="pt-10 pb-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
               <div className="w-8 h-8 bg-bai-red flex items-center justify-center rounded-full border-2 border-white">
                  <TicketIcon size={16} />
               </div>
               <h1 className="font-display font-black text-2xl uppercase tracking-tighter italic">Scanner <span className="text-bai-red">App</span></h1>
            </div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest bg-white/5 py-1 px-4 rounded-full inline-block">Authorized: {user?.displayName || 'Staff'}</p>
         </div>

         {/* Result Display */}
         <div className="mb-8">
            <AnimatePresence mode="wait">
               {scanResult === 'success' && ticketData ? (
                  <motion.div 
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="bg-white text-bai-black rounded-[2rem] p-8 shadow-2xl border-l-[12px] border-green-500"
                  >
                     <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                           <CheckCircle size={40} />
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-black uppercase tracking-widest text-white px-3 py-1 bg-green-500 rounded-full">VALID</span>
                        </div>
                     </div>
                     <h2 className="font-display font-black text-3xl uppercase tracking-tighter leading-tight mb-6 italic">{ticketData.buyerEmail.split('@')[0]}</h2>
                     <div className="space-y-4 border-t border-bai-black/5 pt-6">
                        <div className="flex items-center space-x-3 text-sm font-bold">
                           <Calendar size={16} className="text-bai-red" />
                           <span className="text-bai-black/60 uppercase text-[10px] tracking-widest">General Entry</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm font-bold">
                           <MapPin size={16} className="text-bai-red" />
                           <span className="text-bai-black/60 uppercase text-[10px] tracking-widest">Mabopane Station Event</span>
                        </div>
                     </div>
                  </motion.div>
               ) : scanResult === 'error' ? (
                  <motion.div 
                     initial={{ x: 0, opacity: 0 }}
                     animate={{ 
                       x: [0, -10, 10, -10, 10, 0],
                       opacity: 1 
                     }}
                     className="bg-bai-red text-white rounded-[2rem] p-8 shadow-2xl text-center"
                  >
                     <XCircle size={64} className="mx-auto mb-6" />
                     <h3 className="font-display font-black text-3xl uppercase italic mb-2">Access Denied</h3>
                     <p className="font-bold text-sm uppercase tracking-widest opacity-80">{message}</p>
                  </motion.div>
               ) : (
                  <div className="h-48 flex items-center justify-center border-2 border-dashed border-white/10 rounded-[2rem] text-white/20 italic text-sm">
                     {loading ? "Verifying..." : "Awaiting Scan"}
                  </div>
               )}
            </AnimatePresence>
         </div>

         {/* Scanner Surface */}
         <div className="flex-grow flex flex-col items-center">
            {!showManual ? (
               <div className="w-full relative aspect-square bg-white/5 rounded-[2rem] overflow-hidden border-2 border-white/10" id="qr-reader">
                  {/* Scanner attaches here */}
               </div>
            ) : (
               <div className="w-full bg-white/5 rounded-[2rem] p-8 border-2 border-white/10">
                  <form onSubmit={manualVerify} className="space-y-6">
                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4">Manual Ticket ID</label>
                        <input 
                           type="text" 
                           value={ticketId}
                           onChange={(e) => setTicketId(e.target.value)}
                           placeholder="Enter UUID..."
                           className="w-full h-16 bg-white/5 border-2 border-white/10 text-white rounded-xl px-6 outline-none focus:border-bai-red font-mono text-lg transition-all"
                        />
                     </div>
                     <button 
                        type="submit"
                        disabled={loading || !ticketId}
                        className="w-full h-16 bg-white text-bai-black font-display font-black uppercase tracking-widest rounded-xl hover:bg-bai-red hover:text-white transition-all active:scale-95 disabled:opacity-30"
                     >
                        Verify Manual Code
                     </button>
                  </form>
               </div>
            )}

            <div className="w-full grid grid-cols-2 gap-4 mt-8">
               <button 
                  onClick={() => { setShowManual(false); setScanResult(null); }}
                  className={`h-14 rounded-xl flex items-center justify-center space-x-3 font-bold text-[10px] uppercase tracking-widest border-2 transition-all ${!showManual ? 'bg-white text-bai-black border-white' : 'border-white/10 text-white/40'}`}
               >
                  <Camera size={18} />
                  <span>Camera</span>
               </button>
               <button 
                  onClick={() => { setShowManual(true); setScanResult(null); }}
                  className={`h-14 rounded-xl flex items-center justify-center space-x-3 font-bold text-[10px] uppercase tracking-widest border-2 transition-all ${showManual ? 'bg-white text-bai-black border-white' : 'border-white/10 text-white/40'}`}
               >
                  <Search size={18} />
                  <span>Manual</span>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
