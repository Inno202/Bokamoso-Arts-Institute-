import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { Users, Ticket, Banknote, Activity, Calendar, TrendingUp, Clock, Shield, Settings, ChevronRight, Plus, UserX, UserCheck } from 'lucide-react';
import { ROUTES } from '../../controllers/navigation';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { userController } from '../../controllers/userController';
import { logger } from '../../services/loggerService';
import { toast } from '../../services/toast';
import { NewEventModal } from '../components/NewEventModal';
import { formatCurrency, formatDate, formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { isEventManager, isFinance, isUserAdmin, ROLE_LABELS, TicketScan, UserProfile, UserRole } from '../../models/types';

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as UserRole[];
const EMPTY_USER = { displayName: '', email: '', password: '', role: 'USER' as UserRole };
const field = 'w-full h-12 px-4 bg-white border border-bai-black/20 rounded-lg text-sm focus:border-bai-black placeholder:text-bai-black/60 transition-colors';

export default function Dashboard() {
  const { user, userData, role } = useAuth();
  const canSeeUsers = isUserAdmin(role);
  const canSeeSales = isFinance(role);
  const canManageEvents = isEventManager(role);
  const isSuper = role === 'SUPER_ADMIN';

  const [stats, setStats] = useState<{ totalUsers?: number; totalTickets?: number; revenue?: number; activeEvents?: number }>({});
  const [recentScans, setRecentScans] = useState<TicketScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | undefined>();
  const [usersLoading, setUsersLoading] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_USER);

  useEffect(() => {
    let active = true;
    const load = async () => {
      // Each figure is fetched as a server-side total and fails on its own.
      const [users, sales, scans] = await Promise.allSettled([
        canSeeUsers ? userController.countUsers() : Promise.resolve(undefined),
        canSeeSales ? ticketController.getSalesTotals() : Promise.resolve(undefined),
        ticketController.getRecentScans(8),
      ]);
      if (!active) return;
      setStats(prev => ({
        ...prev,
        totalUsers: users.status === 'fulfilled' ? users.value : undefined,
        totalTickets: sales.status === 'fulfilled' ? sales.value?.totalTickets : undefined,
        revenue: sales.status === 'fulfilled' ? sales.value?.revenue : undefined,
      }));
      if (scans.status === 'fulfilled') setRecentScans(scans.value);
      [users, sales, scans].forEach(r => { if (r.status === 'rejected') logger.error('Dashboard figure failed to load', r.reason); });
      setLoading(false);
    };
    void load();

    const unsubscribe = eventController.subscribeToEvents((events) => {
      if (active) setStats(prev => ({ ...prev, activeEvents: events.length }));
    }, true);

    return () => { active = false; unsubscribe(); };
  }, [canSeeUsers, canSeeSales]);

  const loadUsers = useCallback(async (after?: QueryDocumentSnapshot) => {
    setUsersLoading(true);
    try {
      const page = await userController.listUsers(after);
      setUsers(prev => (after ? [...prev, ...page.users] : page.users));
      setCursor(page.cursor);
    } catch (err) {
      logger.error('Failed to load users', err);
      toast.error(friendlyError(err, 'The user list could not be loaded.'));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const patchUser = (uid: string, patch: Partial<UserProfile>) =>
    setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, ...patch } : u)));

  const handleRoleChange = async (target: UserProfile, newRole: UserRole) => {
    if (newRole === target.role) return;
    if (!window.confirm(`Change ${target.displayName || target.email} from ${ROLE_LABELS[target.role] || target.role} to ${ROLE_LABELS[newRole]}?`)) return;
    try {
      await userController.setRole(target.uid, newRole);
      patchUser(target.uid, { role: newRole });
      toast.success(`${target.displayName || target.email} is now ${ROLE_LABELS[newRole]}.`);
    } catch (err) {
      logger.error('Failed to update role', err);
      toast.error(friendlyError(err, 'The role could not be changed.'));
    }
  };

  const handleToggleActive = async (target: UserProfile) => {
    const next = target.isActive === false;
    if (!next && !window.confirm(`Deactivate ${target.displayName || target.email}? They will be signed out and lose all staff access until reactivated.`)) return;
    try {
      await userController.setActive(target.uid, next);
      patchUser(target.uid, { isActive: next });
      toast.success(next ? 'Account reactivated.' : 'Account deactivated.');
    } catch (err) {
      logger.error('Failed to change account status', err);
      toast.error(friendlyError(err, 'The account status could not be changed.'));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      await userController.createUser(newUser);
      toast.success(`Account created for ${newUser.displayName}.`);
      setNewUser(EMPTY_USER);
      void loadUsers();
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers === undefined ? undefined : prev.totalUsers + 1 }));
    } catch (err) {
      logger.error('Failed to create user', err);
      toast.error(friendlyError(err, 'The account could not be created.'));
    } finally {
      setAddingUser(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const show = (value: number | undefined, format: (n: number) => string = String) => (value === undefined ? '—' : format(value));
  // CEOs may add staff, but only a super admin can create another super admin.
  const creatableRoles = ROLE_OPTIONS.filter(r => isSuper || r !== 'SUPER_ADMIN');
  const actionCard = 'flex items-center justify-between p-5 bg-white border border-bai-black/10 rounded-2xl group hover:border-bai-red transition-colors text-left w-full';
  const actionIcon = 'w-10 h-10 bg-bai-bone text-bai-black rounded-xl flex items-center justify-center group-hover:bg-bai-red group-hover:text-white transition-colors';

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      <section className="bg-bai-black text-white py-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" aria-hidden="true" />
        <div className="max-w-7xl mx-auto sm:px-2 lg:px-4 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-6xl tracking-tighter uppercase italic leading-none">
              <span className="block text-lg md:text-xl not-italic tracking-normal normal-case font-sans font-normal text-white/80 mb-2">{greeting()},</span>
              {userData?.displayName || user?.displayName || 'Admin'}
            </h1>
            <p className="text-white/80 text-sm mt-4 flex items-center gap-2">
              <Shield size={14} className="text-bai-blue-soft" aria-hidden="true" />
              <span>{role ? ROLE_LABELS[role] : ''}</span>
            </p>
          </div>
          <p className="text-white/80 text-sm flex items-center gap-2">
            <Calendar size={16} aria-hidden="true" />
            <span>{formatDate(new Date())}</span>
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" aria-busy={loading}>
          {canSeeUsers && <Stat title="Registered users" value={loading ? null : show(stats.totalUsers)} icon={<Users size={22} aria-hidden="true" />} />}
          {canSeeSales && <Stat title="Tickets issued" value={loading ? null : show(stats.totalTickets)} icon={<Ticket size={22} aria-hidden="true" />} />}
          {canSeeSales && <Stat title="Ticket value" value={loading ? null : show(stats.revenue, formatCurrency)} icon={<Banknote size={22} aria-hidden="true" />} />}
          <Stat title="Events on sale" value={stats.activeEvents === undefined ? null : String(stats.activeEvents)} icon={<Activity size={22} aria-hidden="true" />} />
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-12">
          <section className="lg:col-span-2" aria-labelledby="scans-heading">
            <h2 id="scans-heading" className="font-display font-bold text-2xl uppercase tracking-tighter italic flex items-center gap-3 mb-6">
              <Clock size={20} className="text-bai-red" aria-hidden="true" />
              <span>Recent scans</span>
            </h2>
            <div className="bg-white rounded-3xl border border-bai-black/10 overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-4" role="status" aria-label="Loading scans">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-bai-bone animate-pulse rounded-xl" />)}
                </div>
              ) : recentScans.length > 0 ? (
                <ul className="divide-y divide-bai-black/10">
                  {recentScans.map((scan) => (
                    <li key={scan.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 bg-green-100 text-green-800 rounded-xl flex items-center justify-center shrink-0">
                          <Ticket size={18} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{scan.buyerEmail || 'Unknown buyer'}</p>
                          <p className="num text-xs text-bai-black/70">{scan.ticketId}</p>
                        </div>
                      </div>
                      <p className="num text-xs text-bai-black/70 text-right shrink-0">{formatDateTime(scan.scannedAt) || 'Just now'}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-10 text-center text-bai-black/70 text-sm">No tickets have been scanned yet. Scans appear here as people arrive.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="manage-heading">
            <h2 id="manage-heading" className="font-display font-bold text-2xl uppercase tracking-tighter italic flex items-center gap-3 mb-6">
              <Settings size={20} className="text-bai-red" aria-hidden="true" />
              <span>Manage</span>
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {canManageEvents && (
                <button onClick={() => setIsEventModalOpen(true)} className={actionCard}>
                  <span className="flex items-center gap-4">
                    <span className={actionIcon}><Plus size={20} aria-hidden="true" /></span>
                    <span className="font-bold text-xs uppercase tracking-widest">New event</span>
                  </span>
                  <ChevronRight size={18} className="text-bai-black/60" aria-hidden="true" />
                </button>
              )}
              <Link to={ROUTES.ABOUT} className={actionCard}>
                <span className="flex items-center gap-4">
                  <span className={actionIcon}><TrendingUp size={20} aria-hidden="true" /></span>
                  <span className="font-bold text-xs uppercase tracking-widest">Edit About page</span>
                </span>
                <ChevronRight size={18} className="text-bai-black/60" aria-hidden="true" />
              </Link>
              {canSeeUsers && (
                <button
                  onClick={() => { setShowUsers(true); void loadUsers(); }}
                  aria-expanded={showUsers}
                  className={actionCard}
                >
                  <span className="flex items-center gap-4">
                    <span className={actionIcon}><Users size={20} aria-hidden="true" /></span>
                    <span className="font-bold text-xs uppercase tracking-widest">Manage users</span>
                  </span>
                  <ChevronRight size={18} className="text-bai-black/60" aria-hidden="true" />
                </button>
              )}
            </div>
          </section>
        </div>

        {showUsers && canSeeUsers && (
          <section className="mt-12 bg-white rounded-3xl p-4 sm:p-8 border border-bai-black/10" aria-labelledby="users-heading">
            <div className="flex items-center justify-between mb-6">
              <h2 id="users-heading" className="font-display font-bold text-2xl uppercase tracking-tighter italic">Users</h2>
              <button onClick={() => setShowUsers(false)} className="text-sm font-bold text-bai-black/70 hover:text-bai-red px-3 py-2">Close</button>
            </div>

            <form onSubmit={handleAddUser} className="mb-8 bg-bai-bone p-4 rounded-2xl">
              <h3 className="text-sm font-bold mb-3">Add a staff account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input required type="text" aria-label="Full name" placeholder="Full name" maxLength={100} className={field} value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} />
                <input required type="email" aria-label="Email address" placeholder="Email address" autoComplete="off" className={field} value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                <input required type="password" aria-label="Temporary password, at least 8 characters" placeholder="Temporary password (8+)" minLength={8} autoComplete="new-password" className={field} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                <select aria-label="Role" className={field} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                  {creatableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button type="submit" disabled={addingUser} className="h-12 px-6 bg-bai-black text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-bai-red transition-colors disabled:opacity-60">
                  {addingUser ? 'Adding' : 'Add user'}
                </button>
              </div>
            </form>

            <ul className="divide-y divide-bai-black/10">
              {users.map(u => {
                const inactive = u.isActive === false;
                const isSelf = u.uid === user?.uid;
                const canToggle = !isSelf && (isSuper || u.role !== 'SUPER_ADMIN');
                return (
                  <li key={u.uid} className={`py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 ${inactive ? 'opacity-70' : ''}`}>
                    <div className="min-w-0 flex-grow">
                      <p className="font-semibold text-sm truncate">{u.displayName || 'No name'}{isSelf && <span className="font-normal text-bai-black/70"> (you)</span>}</p>
                      <p className="text-sm text-bai-black/70 truncate">{u.email}</p>
                    </div>
                    {inactive && <span className="self-start lg:self-auto text-xs font-bold uppercase tracking-widest bg-red-100 text-red-800 px-3 py-1 rounded-full">Deactivated</span>}
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Role for ${u.displayName || u.email}`}
                        className="h-11 bg-bai-bone text-sm px-3 rounded-lg flex-1 lg:flex-none disabled:opacity-70"
                        value={u.role || 'USER'}
                        onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                        disabled={!isSuper || isSelf}
                        title={!isSuper ? 'Only a super admin can change roles' : isSelf ? 'You cannot change your own role' : undefined}
                      >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      {canToggle && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`h-11 px-4 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${
                            inactive ? 'bg-bai-black text-white hover:bg-green-800' : 'border border-bai-black/20 text-bai-black hover:bg-bai-red hover:text-white hover:border-bai-red'
                          }`}
                        >
                          {inactive ? <UserCheck size={14} aria-hidden="true" /> : <UserX size={14} aria-hidden="true" />}
                          <span>{inactive ? 'Reactivate' : 'Deactivate'}</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {usersLoading && <p className="py-6 text-center text-sm text-bai-black/70" role="status">Loading users</p>}
            {!usersLoading && users.length === 0 && <p className="py-6 text-center text-sm text-bai-black/70">No users found.</p>}
            {cursor && !usersLoading && (
              <button onClick={() => loadUsers(cursor)} className="mt-4 w-full h-12 border border-bai-black/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-bai-bone transition-colors">Load more users</button>
            )}
          </section>
        )}
      </div>

      <NewEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} />
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: string | null; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-bai-black/10">
      <div className="w-11 h-11 bg-bai-bone rounded-2xl flex items-center justify-center mb-5">{icon}</div>
      <dt className="text-bai-black/70 text-xs font-bold uppercase tracking-widest">{title}</dt>
      <dd className="num text-2xl sm:text-3xl font-display font-bold tracking-tight mt-1 break-words">
        {value === null ? <span className="inline-block h-7 w-20 bg-bai-bone animate-pulse rounded" aria-label="Loading" /> : value}
      </dd>
    </div>
  );
}
