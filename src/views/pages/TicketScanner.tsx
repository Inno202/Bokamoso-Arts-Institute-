import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../controllers/lib/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function TicketScanner() {
  const { user, role } = useAuth();
  const [ticketId, setTicketId] = useState('');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    
    const onScanSuccess = (decodedText: string, decodedResult: any) => {
      // Pause scanner immediately upon success to prevent multiple rapid scans
      setTicketId(decodedText);
      handleVerification(decodedText);
    };

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: {width: 250, height: 250} },
      /* verbose= */ false
    );
    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [user]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleVerification(ticketId);
  };

  const handleVerification = async (currentTicketId: string) => {
    setScanResult(null);
    setMessage('');

    if (!user) {
       setScanResult('error');
       setMessage('You must be signed in.');
       return;
    }
    
    try {
      // Expected: ticketId format -> ticket:uuid OR just uuid if manually typed
      const rawId = currentTicketId.replace('ticket:', '').trim();
      
      if (!rawId) {
        setScanResult('error');
        setMessage('Empty ticket ID.');
        return;
      }

      const ticketRef = doc(db, 'tickets', rawId);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        setScanResult('error');
        setMessage('Ticket not found.');
        return;
      }

      const ticket = ticketSnap.data();

      if (ticket.status === 'VALID') {
        // Scanner changes status to SCANNED to prevent double entry
        await updateDoc(ticketRef, { status: 'SCANNED' });
        setScanResult('success');
        setMessage('Ticket verified and scanned successfully.');
      } else {
        setScanResult('error');
        setMessage(`Ticket already scanned or invalid. Status: ${ticket.status}`);
      }
    } catch (err: any) {
      console.error(err);
      setScanResult('error');
      setMessage(err.message || 'Permission denied or network error.');
    }
  };

  return (
    <div className="min-h-screen bg-bai-black text-white p-4 flex flex-col items-center pt-20">
      <div className="text-center mb-10">
        <h1 className="font-display font-black text-4xl mb-2 text-bai-red">SCANNER APP</h1>
        <p className="text-white/50 text-sm">Authorized Personnel Only</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl p-6 text-bai-black shadow-2xl">
        <div className="mb-6 relative w-full overflow-hidden rounded-2xl bg-black border-4 border-bai-black" id="qr-reader">
            {/* The QR Reader will attach itself here */}
        </div>
        
        {scanResult === 'success' && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded flex items-start space-x-3 border-l-4 border-green-500">
             <CheckCircle className="shrink-0 w-6 h-6" />
             <div>
               <p className="font-bold text-lg leading-tight mb-1">Valid Ticket!</p>
               <p className="text-sm">{message}</p>
             </div>
          </div>
        )}

        {scanResult === 'error' && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded flex items-start space-x-3 border-l-4 border-red-500">
             <XCircle className="shrink-0 w-6 h-6" />
             <div>
               <p className="font-bold text-lg leading-tight mb-1">Invalid / Error</p>
               <p className="text-sm">{message}</p>
             </div>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
             <label className="block text-xs font-bold uppercase mb-2">Manual Ticket ID Entry</label>
             <input 
                type="text" 
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder="Enter Ticket UUID"
                className="w-full bg-white border-2 border-bai-black/20 p-3 font-bold outline-none focus:border-bai-blue rounded"
             />
          </div>
          <button type="submit" className="w-full py-4 bg-bai-blue hover:bg-bai-blue/90 text-white font-display font-bold uppercase tracking-widest rounded transition-colors active:scale-95">
            Verify Manually
          </button>
        </form>
      </div>
    </div>
  );
}
