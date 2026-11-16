import React, { useCallback, useEffect, useState } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { UserX, UserCheck } from 'lucide-react';
import { AdminShell } from './AdminShell';
import { useAuth } from '../components/AuthProvider';
import { userController } from '../../controllers/userController';
import { logger } from '../../services/loggerService';
import { toast } from '../../services/toast';
import { friendlyError } from '../../controllers/lib/utils';
import { RECENT_SIGN_IN_HOURS } from '../../config';
import { ROLE_LABELS, UserProfile, UserRole } from '../../models/types';

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as UserRole[];
const EMPTY_USER = { displayName: '', email: '', password: '', role: 'USER' as UserRole };

/** Role and account changes need a fresh sign-in (enforced in firestore.rules); say so plainly when that is the reason. */
function accountChangeError(err: unknown, signedInAt: string | undefined, fallback: string) {
  const age = signedInAt ? Date.now() - new Date(signedInAt).getTime() : 0;
  if ((err as { code?: string })?.code === 'permission-denied' && age > RECENT_SIGN_IN_HOURS * 3_600_000) {
    return `For security, changing roles or accounts needs a sign-in from the last ${RECENT_SIGN_IN_HOURS} hours. Sign out, sign in again, and repeat the change.`;
  }
  return friendlyError(err, fallback);
}

/** Staff accounts: add, change roles, deactivate. Super admins and CEOs only (enforced in firestore.rules). */
export default function AdminUsers() {
  const { user, role } = useAuth();
  const isSuper = role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | undefined>();
  const [usersLoading, setUsersLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_USER);

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
      toast.error(accountChangeError(err, user?.metadata.lastSignInTime, 'The role could not be changed.'));
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
      toast.error(accountChangeError(err, user?.metadata.lastSignInTime, 'The account status could not be changed.'));
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
    } catch (err) {
      logger.error('Failed to create user', err);
      toast.error(accountChangeError(err, user?.metadata.lastSignInTime, 'The account could not be created.'));
    } finally {
      setAddingUser(false);
    }
  };

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  // CEOs may add staff, but only a super admin can create another super admin.
  const creatableRoles = ROLE_OPTIONS.filter(r => isSuper || r !== 'SUPER_ADMIN');

  return (
    <AdminShell title="Users">
            <form onSubmit={handleAddUser} className="mb-8 border-b border-bai-black/15 pb-8">
              <h2 className="font-semibold text-lg mb-3">Add a staff account</h2>
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
                    {inactive && <span className="self-start lg:self-auto text-xs font-bold bg-red-100 text-red-800 px-3 py-1 rounded-full">Deactivated</span>}
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
    </AdminShell>
  );
}
