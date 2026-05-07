import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';
import { 
  Users, 
  Ticket, 
  DollarSign, 
  Activity, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Shield, 
  Settings,
  ChevronRight,
  Plus,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../controllers/lib/firebase';
import { logger } from '../../services/loggerService';
import { NewEventModal } from '../components/NewEventModal';

const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

export default function Dashboard() {
  const { user, userData, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    const isAdmin = role === 'SUPER_ADMIN' || role === 'PRO' || role === 'CEO' || role === 'FINANCE_MANAGER';
    if (!isAdmin) {
      navigate(ROUTES.MY_TICKETS);
    }
  }, [role, authLoading, navigate]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTickets: 0,
    revenue: 0,
    activeEvents: 0
  });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showUsersAdmin, setShowUsersAdmin] = useState(false);

  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: '', email: '', password: '', role: 'USER' });

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fetchedUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setUsers(fetchedUsers);
      
      // Update global stats too
      setStats(prev => ({
        ...prev,
        totalUsers: fetchedUsers.length
      }));
    } catch (err) {
      logger.error('Failed to fetch users', err);
    }
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      fetchUsers(); // Refresh
    } catch (err) {
      logger.error('Failed to update role', err);
      alert('Failed to update role');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.displayName) return;
    
    setAddingUser(true);
    try {
      // 1. Create user in Firebase Auth using secondary app
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      
      // 2. Set display name
      await updateProfile(userCredential.user, {
        displayName: newUser.displayName
      });

      // 3. Add to Firestore users collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        isActive: true,
        createdAt: serverTimestamp()
      });

      // 4. Sign out secondary app
      await secondaryAuth.signOut();

      setNewUser({ displayName: '', email: '', password: '', role: 'USER' });
      fetchUsers();
    } catch (err: any) {
      logger.error('Failed to create user', err);
      alert(`Failed to create user: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    let unsubscribeEvents: () => void;

    const fetchData = async () => {
      try {
        let totalUsers = 0;
        let totalTickets = 0;
        let revenue = 0;
        
        const isAdmin = role === 'SUPER_ADMIN' || role === 'PRO' || role === 'CEO' || role === 'FINANCE_MANAGER';
        
        if (isAdmin) {
          const [usersSnap, ticketsSnap] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'tickets'))
          ]);

          totalUsers = usersSnap.size;
          totalTickets = ticketsSnap.size;
          revenue = ticketsSnap.docs.reduce((sum, doc) => sum + (doc.data().price || 0), 0);
          
          try {
            const scans = await ticketController.getRecentScans(8);
            setRecentScans(scans);
          } catch (scanErr) {
            logger.error(scanErr);
          }
        }

        setStats(prev => ({ ...prev, totalUsers, totalTickets, revenue }));
      } catch (err) {
        logger.error(err);
      } finally {
        setLoading(false);
      }
    };

    unsubscribeEvents = eventController.subscribeToEvents((data) => {
      setStats(prev => ({ ...prev, activeEvents: data.length }));
    }, true);

    fetchData();

    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [authLoading, role]);

  const greetings = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const Widget = ({ title, value, icon, color = 'bg-white' }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${color} p-6 rounded-3xl shadow-sm border border-bai-black/5 hover:shadow-xl transition-all group`}
    >
       <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-bai-bone rounded-2xl group-hover:bg-bai-red group-hover:text-white transition-all">
             {icon}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-bai-black/20">Live Sync</span>
       </div>
       <div className="space-y-1">
          <h3 className="text-bai-black/40 text-[10px] font-black uppercase tracking-widest">{title}</h3>
          <p className="text-3xl font-display font-black tracking-tighter italic">{value}</p>
       </div>
    </motion.div>
  );

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      {/* Hero Header */}
      <section className="bg-bai-black text-white py-16 px-4 mb-2 relative overflow-hidden">
         <div className="absolute inset-0 piano-key-pattern opacity-10" />
         <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
               <p className="text-bai-red font-display font-bold uppercase tracking-[0.4em] text-[10px] mb-2">{greetings()},</p>
               <h1 className="font-display font-black text-4xl md:text-6xl tracking-tighter uppercase italic leading-none">
                  {userData?.displayName || user?.displayName || 'Admin'}
               </h1>
               <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-4 flex items-center space-x-2">
                  <Shield size={12} className="text-bai-blue" />
                  <span>Role: {role?.replace('_', ' ')}</span>
               </p>
            </div>
            <div className="bg-white p-4 rounded-2xl flex items-center space-x-4 shadow-sm border border-white/10">
               <div className="w-10 h-10 bg-bai-bone rounded-full flex items-center justify-center text-bai-black">
                  <Calendar size={18} />
               </div>
               <div className="text-bai-black">
                  <p className="text-[9px] font-black uppercase text-black/30 tracking-widest">Current Date</p>
                  <p className="font-bold text-sm">{new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
               </div>
            </div>
         </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
               [1,2,3,4].map(i => <div key={`stat-skeleton-${i}`} className="h-40 bg-white animate-pulse rounded-3xl" />)
            ) : (
               <>
                  {(role === 'SUPER_ADMIN' || role === 'CEO') && <Widget key="stat-users" title="Total Users" value={stats.totalUsers} icon={<Users size={24} />} />}
                  {(role === 'SUPER_ADMIN' || role === 'CEO' || role === 'FINANCE_MANAGER') && <Widget key="stat-tickets" title="Ticket Sales" value={stats.totalTickets} icon={<Ticket size={24} />} />}
                  {(role === 'SUPER_ADMIN' || role === 'CEO' || role === 'FINANCE_MANAGER') && <Widget key="stat-revenue" title="Revenue" value={`R${stats.revenue.toLocaleString()}`} icon={<DollarSign size={24} />} />}
                  <Widget key="stat-events" title="Active Events" value={stats.activeEvents} icon={<Activity size={24} />} />
               </>
            )}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
            {/* Recent Activity */}
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="font-display font-black text-2xl uppercase tracking-tighter italic flex items-center space-x-3">
                     <Clock size={20} className="text-bai-red" />
                     <span>Recent Scans</span>
                  </h2>
                  <button className="text-[10px] font-black uppercase tracking-widest text-bai-blue flex items-center">
                     View All <ChevronRight size={14} />
                  </button>
               </div>

               <div className="bg-white rounded-[2rem] border border-bai-black/5 overflow-hidden">
                  {loading ? (
                    <div className="p-8 space-y-4">
                       {[1,2,3].map(i => <div key={`scan-skeleton-${i}`} className="h-12 bg-bai-bone animate-pulse rounded-xl" />)}
                    </div>
                  ) : recentScans.length > 0 ? (
                    <div className="divide-y divide-bai-black/5">
                       {recentScans.map((scan) => (
                          <div key={scan.id} className="p-6 flex items-center justify-between hover:bg-bai-bone transition-all">
                             <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center">
                                   <Ticket size={18} />
                                </div>
                                <div>
                                   <p className="font-bold text-sm leading-tight mb-1 uppercase tracking-tight">{(scan.buyerEmail || 'User').split('@')[0]}</p>
                                   <p className="text-[9px] font-bold text-bai-black/30 uppercase tracking-[0.2em]">{scan.scannedAt?.seconds ? new Date(scan.scannedAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="px-3 py-1 bg-green-500 text-white text-[9px] font-black uppercase rounded-full">Success</span>
                             </div>
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                       <p className="italic text-bai-black/30 text-sm">No recent scans logged.</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
               <h2 className="font-display font-black text-2xl uppercase tracking-tighter italic flex items-center space-x-3">
                  <Settings size={20} className="text-bai-red" />
                  <span>Management</span>
               </h2>
               <div className="grid grid-cols-1 gap-4">
                  {(role === 'SUPER_ADMIN' || role === 'PRO' || role === 'CEO') && (
                     <>
                        <button onClick={() => setIsEventModalOpen(true)} className="flex items-center justify-between p-6 bg-white border border-bai-black/5 rounded-2xl group hover:border-bai-red transition-all">
                           <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-bai-bone text-bai-black rounded-xl flex items-center justify-center group-hover:bg-bai-red group-hover:text-white transition-all">
                                 <Plus size={20} />
                              </div>
                              <span className="font-bold text-xs uppercase tracking-widest leading-none">New Event</span>
                           </div>
                           <ChevronRight size={18} className="text-bai-black/20" />
                        </button>
                        <Link to={ROUTES.ABOUT} className="flex items-center justify-between p-6 bg-white border border-bai-black/5 rounded-2xl group hover:border-bai-red transition-all">
                           <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-bai-bone text-bai-black rounded-xl flex items-center justify-center group-hover:bg-bai-red group-hover:text-white transition-all">
                                 <TrendingUp size={20} />
                              </div>
                              <span className="font-bold text-xs uppercase tracking-widest leading-none">Update About</span>
                           </div>
                           <ChevronRight size={18} className="text-bai-black/20" />
                        </Link>
                        {(role === 'SUPER_ADMIN' || role === 'CEO') && (
                          <button 
                            onClick={() => {
                              setShowUsersAdmin(true);
                              fetchUsers();
                            }}
                            className="flex items-center justify-between p-6 bg-white border border-bai-black/5 rounded-2xl group hover:border-bai-red transition-all"
                          >
                             <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-bai-bone text-bai-black rounded-xl flex items-center justify-center group-hover:bg-bai-red group-hover:text-white transition-all">
                                   <Users size={20} />
                                </div>
                                <span className="font-bold text-xs uppercase tracking-widest leading-none">Manage Users</span>
                             </div>
                             <ChevronRight size={18} className="text-bai-black/20" />
                          </button>
                        )}
                     </>
                  )}
               </div>
            </div>
         </div>
         
         {/* Manage Users section */}
         {showUsersAdmin && (
             <div className="mt-8 lg:mt-12 bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-8 border border-bai-black/5">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="font-display font-black text-xl lg:text-2xl uppercase tracking-tighter italic">Manage <span className="text-bai-red">Users</span></h2>
                <div className="flex items-center space-x-4">
                  <button onClick={() => setShowUsersAdmin(false)} className="text-xs lg:text-sm font-bold text-bai-black/40 hover:text-bai-red">Close</button>
                </div>
              </div>

              {/* Add User Form - Stacks on mobile */}
              <div className="w-full mb-6 lg:mb-8 bg-bai-bone p-3 lg:p-4 rounded-xl lg:rounded-2xl">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
                 <input 
                   type="text"
                   placeholder="Full Name"
                   className="w-full lg:flex-1 h-12 lg:h-10 px-4 bg-white border border-bai-black/5 rounded-lg outline-none text-sm focus:border-bai-red focus:ring-1 focus:ring-bai-red placeholder:text-bai-black/30 transition-all font-medium"
                   value={newUser.displayName}
                   onChange={e => setNewUser({...newUser, displayName: e.target.value})}
                 />
                 <input 
                   type="email"
                   placeholder="Email Address"
                   className="w-full lg:flex-1 h-12 lg:h-10 px-4 bg-white border border-bai-black/5 rounded-lg outline-none text-sm focus:border-bai-red focus:ring-1 focus:ring-bai-red placeholder:text-bai-black/30 transition-all font-medium"
                   value={newUser.email}
                   onChange={e => setNewUser({...newUser, email: e.target.value})}
                 />
                 <input 
                   type="password"
                   placeholder="Password (Min 6)"
                   className="w-full lg:flex-1 h-12 lg:h-10 px-4 bg-white border border-bai-black/5 rounded-lg outline-none text-sm focus:border-bai-red focus:ring-1 focus:ring-bai-red placeholder:text-bai-black/30 transition-all font-medium"
                   value={newUser.password}
                   onChange={e => setNewUser({...newUser, password: e.target.value})}
                 />
                 <select 
                   className="w-full lg:flex-1 h-12 lg:h-10 px-4 bg-white border border-bai-black/5 rounded-lg outline-none text-sm lg:text-[10px] focus:border-bai-red focus:ring-1 focus:ring-bai-red text-bai-black transition-all cursor-pointer font-bold uppercase tracking-widest"
                   value={newUser.role}
                   onChange={e => setNewUser({...newUser, role: e.target.value})}
                 >
                    <option value="USER">User (Standard)</option>
                    <option value="PRO">PRO / PR Officer</option>
                    <option value="TICKET_SCANNER">Ticket Scanner</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="CEO">CEO</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                 </select>
                 <button 
                   onClick={handleAddUser}
                   disabled={addingUser || !newUser.email || !newUser.password || !newUser.displayName}
                   className="w-full lg:w-auto h-12 lg:h-10 px-6 bg-bai-black text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-bai-red transition-all whitespace-nowrap disabled:opacity-50 disabled:hover:bg-bai-black mt-2 lg:mt-0"
                 >
                   {addingUser ? 'Adding...' : 'Add New'}
                 </button>
                </div>
              </div>

              <div className="overflow-x-auto lg:overflow-visible">
                <table className="w-full text-left border-collapse block lg:table">
                  <thead className="hidden lg:table-header-group">
                    <tr className="border-b border-bai-black/5">
                      <th className="py-4 font-bold text-[10px] uppercase tracking-widest text-bai-black/40">Email</th>
                      <th className="py-4 font-bold text-[10px] uppercase tracking-widest text-bai-black/40">Name</th>
                      <th className="py-4 font-bold text-[10px] uppercase tracking-widest text-bai-black/40">Role</th>
                      <th className="py-4 font-bold text-[10px] uppercase tracking-widest text-bai-black/40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="block lg:table-row-group divide-y lg:divide-y-0 divide-bai-black/5">
                    {users.map(u => (
                      <tr key={u.uid} className="block lg:table-row py-4 lg:py-0 border-b border-bai-black/5 last:border-0 hover:bg-bai-bone/50 transition-colors">
                        <td className="block lg:table-cell py-1 lg:py-4 font-medium text-sm">
                           <span className="inline-block w-20 text-[10px] uppercase tracking-widest text-bai-black/40 font-bold lg:hidden">Email</span>
                           {u.email}
                        </td>
                        <td className="block lg:table-cell py-1 lg:py-4 text-sm">
                           <span className="inline-block w-20 text-[10px] uppercase tracking-widest text-bai-black/40 font-bold lg:hidden">Name</span>
                           {u.displayName}
                        </td>
                        <td className="block lg:table-cell py-1 lg:py-4">
                           <span className="inline-block w-20 text-[10px] uppercase tracking-widest text-bai-black/40 font-bold lg:hidden">Role</span>
                           <span className="text-[10px] font-black uppercase tracking-widest bg-bai-black text-white px-3 py-1 rounded-full">{u.role}</span>
                        </td>
                        <td className="block lg:table-cell py-3 lg:py-4 lg:text-right mt-2 lg:mt-0 border-t border-bai-black/5 lg:border-t-0">
                          <div className="flex items-center lg:justify-end space-x-2">
                             <select 
                               className="bg-bai-bone text-xs px-3 py-2 rounded-lg outline-none flex-1 lg:flex-none"
                               value={u.role || 'USER'}
                               onChange={e => handleRoleChange(u.uid, e.target.value)}
                               disabled={role !== 'SUPER_ADMIN'}
                             >
                               <option value="USER">User</option>
                               <option value="PRO">PRO / PR Officer</option>
                               <option value="SUPER_ADMIN">Super Admin</option>
                               <option value="CEO">CEO</option>
                               <option value="FINANCE_MANAGER">Finance</option>
                               <option value="TICKET_SCANNER">Scanner</option>
                             </select>
                             {(role === 'SUPER_ADMIN' || role === 'CEO' || role === 'PRO' || role === 'FINANCE_MANAGER') && (
                               <button 
                                 onClick={async () => {
                                   if (u.uid === user?.uid) {
                                     alert("You cannot delete your own account from the dashboard.");
                                     return;
                                   }
                                   
                                   const confirmDelete = window.confirm(`Are you sure you want to delete ${u.displayName || 'this user'}?`);
                                   if (confirmDelete) {
                                      try {
                                         logger.info(`Attempting to delete user ${u.uid}`);
                                         
                                         const response = await fetch(`/api/users/${u.uid}`, {
                                           method: 'DELETE',
                                           headers: {
                                             'Content-Type': 'application/json'
                                           }
                                         });

                                         if (!response.ok) {
                                           const errorData = await response.json().catch(() => ({}));
                                           throw new Error(errorData.message || `Server error: ${response.status}`);
                                         }

                                         setUsers(prev => prev.filter(userItem => userItem.uid !== u.uid));
                                         
                                         await fetchUsers();
                                         alert('User deleted successfully from system.');
                                      } catch (err: any) {
                                         logger.error('Failed to delete user', err);
                                         alert(`Failed to delete user: ${err.message}`);
                                      }
                                   }
                                 }}
                                 className="bg-bai-red text-white text-xs px-3 py-2 rounded-lg hover:bg-black transition-all flex items-center space-x-1"
                               >
                                 <Trash2 size={12} />
                                 <span>Delete</span>
                               </button>
                             )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
         )}
      </div>

      <NewEventModal 
        isOpen={isEventModalOpen} 
        onClose={() => setIsEventModalOpen(false)} 
        onCreated={() => setIsEventModalOpen(false)}
      />
    </div>
  );
}
