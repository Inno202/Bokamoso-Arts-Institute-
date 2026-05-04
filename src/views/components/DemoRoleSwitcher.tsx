import React, { useState } from 'react';
import { useAuth, UserRole } from './AuthProvider';
import { db } from '../../controllers/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DemoRoleSwitcher() {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const demoRoles: { label: string, value: UserRole }[] = [
    { label: 'Regular User', value: 'USER' },
    { label: 'Super Admin', value: 'SUPER_ADMIN' },
    { label: 'CEO', value: 'CEO' },
    { label: 'Finance Manager', value: 'FINANCE_MANAGER' },
    { label: 'PR Officer', value: 'PUBLIC_RELATIONS' },
    { label: 'Ticket Scanner', value: 'TICKET_SCANNER' },
  ];

  const handleRoleChange = (newRole: UserRole) => {
    setIsUpdating(true);
    // Optimistically update and navigate before network completes
    updateDoc(doc(db, 'users', user.uid), { role: newRole }).catch(err => {
      console.error("Failed to change role:", err);
      alert("Failed to change role. See console.");
    });
    
    let redirectUrl = '/';
    if (['SUPER_ADMIN', 'CEO', 'FINANCE_MANAGER', 'PUBLIC_RELATIONS'].includes(newRole)) {
      redirectUrl = '/dashboard';
    } else if (newRole === 'TICKET_SCANNER') {
      redirectUrl = '/scanner';
    }
    
    setIsOpen(false);
    setIsUpdating(false);
    navigate(redirectUrl);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
         <div className="absolute bottom-16 right-0 w-64 bg-white shadow-2xl rounded-xl p-4 border border-gray-200">
           <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Demo Controls</h3>
           <p className="text-sm mb-3">Current Role: <strong>{role || 'None'}</strong></p>
           <div className="space-y-2">
             {demoRoles.map(r => (
               <button
                 key={r.value}
                 onClick={() => handleRoleChange(r.value)}
                 disabled={isUpdating || role === r.value}
                 className={`w-full text-left px-3 py-2 text-sm rounded ${role === r.value ? 'bg-bai-blue text-white' : 'bg-gray-100 hover:bg-gray-200 text-bai-black'} disabled:opacity-50`}
               >
                 {r.label}
               </button>
             ))}
           </div>
         </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
        title="Developer Role Switcher"
      >
        <Settings size={24} />
      </button>
    </div>
  );
}
