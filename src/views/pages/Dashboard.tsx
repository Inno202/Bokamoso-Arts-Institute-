import { useState, useEffect } from 'react';
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
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../controllers/lib/firebase';
import { logger } from '../../services/loggerService';

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTickets: 0,
    revenue: 0,
    activeEvents: 0
  });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        let totalUsers = 0;
        let totalTickets = 0;
        let revenue = 0;
        
        const events = await eventController.getAllEvents();
        const activeEvents = events.length;

        const isAdmin = role === 'SUPER_ADMIN' || role === 'CEO' || role === 'FINANCE_MANAGER' || role === 'PUBLIC_RELATIONS';
        
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

        setStats({ totalUsers, totalTickets, revenue, activeEvents });
      } catch (err) {
        logger.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
                  {user?.displayName || 'Admin'}
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
               [1,2,3,4].map(i => <div key={i} className="h-40 bg-white animate-pulse rounded-3xl" />)
            ) : (
               <>
                  {(role === 'SUPER_ADMIN' || role === 'CEO') && <Widget title="Total Users" value={stats.totalUsers} icon={<Users size={24} />} />}
                  {(role === 'SUPER_ADMIN' || role === 'CEO' || role === 'FINANCE_MANAGER') && <Widget title="Ticket Sales" value={stats.totalTickets} icon={<Ticket size={24} />} />}
                  {(role === 'SUPER_ADMIN' || role === 'CEO' || role === 'FINANCE_MANAGER') && <Widget title="Revenue" value={`R${stats.revenue.toLocaleString()}`} icon={<DollarSign size={24} />} />}
                  <Widget title="Active Events" value={stats.activeEvents} icon={<Activity size={24} />} />
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
                       {[1,2,3].map(i => <div key={i} className="h-12 bg-bai-bone animate-pulse rounded-xl" />)}
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
                                   <p className="font-bold text-sm leading-tight mb-1 uppercase tracking-tight">{scan.buyerEmail.split('@')[0]}</p>
                                   <p className="text-[9px] font-bold text-bai-black/30 uppercase tracking-[0.2em]">{new Date(scan.scannedAt?.seconds * 1000).toLocaleString()}</p>
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
                  {(role === 'SUPER_ADMIN' || role === 'CEO' || role === 'PUBLIC_RELATIONS') && (
                     <>
                        <button className="flex items-center justify-between p-6 bg-white border border-bai-black/5 rounded-2xl group hover:border-bai-red transition-all">
                           <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-bai-bone text-bai-black rounded-xl flex items-center justify-center group-hover:bg-bai-red group-hover:text-white transition-all">
                                 <Plus size={20} />
                              </div>
                              <span className="font-bold text-xs uppercase tracking-widest leading-none">New Event</span>
                           </div>
                           <ChevronRight size={18} className="text-bai-black/20" />
                        </button>
                        <button className="flex items-center justify-between p-6 bg-white border border-bai-black/5 rounded-2xl group hover:border-bai-red transition-all">
                           <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-bai-bone text-bai-black rounded-xl flex items-center justify-center group-hover:bg-bai-red group-hover:text-white transition-all">
                                 <TrendingUp size={20} />
                              </div>
                              <span className="font-bold text-xs uppercase tracking-widest leading-none">Update About</span>
                           </div>
                           <ChevronRight size={18} className="text-bai-black/20" />
                        </button>
                     </>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
