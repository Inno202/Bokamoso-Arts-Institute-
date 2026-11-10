import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { ArrowRight, Ticket, UserX, UserCheck } from 'lucide-react';
import { ROUTES } from '../../controllers/navigation';
import { useAuth } from '../components/AuthProvider';
import { AdminShell } from '../admin/AdminShell';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { userController } from '../../controllers/userController';
import { logger } from '../../services/loggerService';
import { toast } from '../../services/toast';
import { formatCurrency, formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { isEventManager, isFinance, isScanner, isUserAdmin, ROLE_LABELS, TicketScan, UserProfile, UserRole } from '../../models/types';

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as UserRole[];
const EMPTY_USER = { displayName: '', email: '', password: '', role: 'USER' as UserRole };

export default function Dashboard() {
  const { user, role } = useAuth();
  const canSeeUsers = isUserAdmin(role);
  const canSeeSales = isFinance(role);
  const canManageEvents = isEventManager(role);
  const isSuper = role === 'SUPER_ADMIN';

  const [stats, setStats] = useState<{ totalUsers?: number; totalTickets?: number; revenue?: number; activeEvents?: number }>({});
  const [recentScans, setRecentScans] = useState<TicketScan[]>([]);
  const [loading, setLoading] = useState(true);

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

  const show = (value: number | undefined, format: (n: number) => string = String) => (value === undefined ? '—' : format(value));
  // CEOs may add staff, but only a super admin can create another super admin.
  const creatableRoles = ROLE_OPTIONS.filter(r => isSuper || r !== 'SUPER_ADMIN');
  const links = [
    { name: 'Events', detail: 'Add, edit and remove events', to: ROUTES.ADMIN_EVENTS, show: canManageEvents },
    { name: 'Site content', detail: 'Edit the text and photos on the public pages', to: ROUTES.ADMIN_CONTENT, show: canManageEvents },
    { name: 'Door scanner', detail: 'Check tickets at the door', to: ROUTES.SCANNER, show: isScanner(role) },
  ].filter(link => link.show);

  return (
    <AdminShell title="Overview">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8 border-y border-bai-black/15 py-8" aria-busy={loading}>
          {canSeeUsers && <Stat title="Registered users" value={loading ? null : show(stats.totalUsers)} />}
          {canSeeSales && <Stat title="Tickets issued" value={loading ? null : show(stats.totalTickets)} />}
          {canSeeSales && <Stat title="Ticket value" value={loading ? null : show(stats.revenue, formatCurrency)} />}
          <Stat title="Events on sale" value={stats.activeEvents === undefined ? null : String(stats.activeEvents)} />
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          <section className="lg:col-span-2" aria-labelledby="scans-heading">
            <h2 id="scans-heading" className="display text-2xl mb-5">Recent scans</h2>
            {loading ? (
              <div className="space-y-3" role="status" aria-label="Loading scans">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white animate-pulse rounded-lg" />)}
              </div>
            ) : recentScans.length > 0 ? (
              <ul className="border-t border-bai-black/15">
                {recentScans.map((scan) => (
                  <li key={scan.id} className="py-4 border-b border-bai-black/15 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <Ticket size={20} className="text-green-800 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{scan.buyerEmail || 'Unknown buyer'}</p>
                        <p className="num text-sm text-bai-black/70">{scan.ticketId}</p>
                      </div>
                    </div>
                    <p className="num text-sm text-bai-black/70 text-right shrink-0">{formatDateTime(scan.scannedAt) || 'Just now'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 border-y border-bai-black/15 text-bai-black/75">No tickets have been scanned yet. Scans appear here as people arrive.</p>
            )}
          </section>

          <section aria-labelledby="manage-heading">
            <h2 id="manage-heading" className="display text-2xl mb-5">Manage</h2>
            <ul className="border-t border-bai-black/15">
              {links.map(link => (
                <li key={link.to} className="border-b border-bai-black/15">
                  <Link to={link.to} className="group flex items-center justify-between gap-4 py-4 min-h-14">
                    <span>
                      <span className="block font-bold group-hover:text-bai-red transition-colors">{link.name}</span>
                      <span className="block text-sm text-bai-black/70">{link.detail}</span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {canSeeUsers && (
                <li className="border-b border-bai-black/15">
                  <button onClick={() => { setShowUsers(true); void loadUsers(); }} aria-expanded={showUsers} className="group w-full text-left flex items-center justify-between gap-4 py-4 min-h-14">
                    <span>
                      <span className="block font-bold group-hover:text-bai-red transition-colors">Users</span>
                      <span className="block text-sm text-bai-black/70">Add staff, change roles, deactivate accounts</span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </button>
                </li>
              )}
            </ul>
          </section>
        </div>

        {showUsers && canSeeUsers && (
          <section className="mt-14" aria-labelledby="users-heading">
            <div className="flex items-center justify-between mb-6">
              <h2 id="users-heading" className="display text-2xl">Users</h2>
              <button onClick={() => setShowUsers(false)} className="btn btn-outline">Close</button>
            </div>

            <form onSubmit={handleAddUser} className="mb-8 border-y border-bai-black/15 py-6">
              <h3 className="font-bold mb-3">Add a staff account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input required type="text" aria-label="Full name" placeholder="Full name" maxLength={100} className="field" value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} />
                <input required type="email" aria-label="Email address" placeholder="Email address" autoComplete="off" className="field" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                <input required type="password" aria-label="Temporary password, at least 8 characters" placeholder="Temporary password (8+)" minLength={8} autoComplete="new-password" className="field" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                <select aria-label="Role" className="field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                  {creatableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button type="submit" disabled={addingUser} className="btn btn-primary">
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
                        className="field w-auto flex-1 lg:flex-none disabled:opacity-70"
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
                          className={`btn ${inactive ? 'btn-primary' : 'btn-danger'}`}
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
              <button onClick={() => loadUsers(cursor)} className="btn btn-outline btn-block mt-4">Load more users</button>
            )}
          </section>
        )}
    </AdminShell>
  );
}

function Stat({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-bai-black/75 font-semibold mt-1">{title}</dt>
      <dd className="num text-3xl sm:text-4xl font-display font-bold tracking-tight break-words">
        {value === null ? <span className="inline-block h-8 w-20 bg-bai-black/10 animate-pulse rounded" aria-label="Loading" /> : value}
      </dd>
    </div>
  );
}
