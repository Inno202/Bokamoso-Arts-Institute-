import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';
import { useAuth } from '../components/AuthProvider';
import { isEventManager, ROLE_LABELS } from '../../models/types';

/** Frame shared by every staff page: who is signed in, and the admin sections they may open. */
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, userData, role } = useAuth();
  const tabs = [
    { name: 'Overview', path: ROUTES.DASHBOARD, show: true },
    { name: 'Events', path: ROUTES.ADMIN_EVENTS, show: isEventManager(role) },
    { name: 'Site content', path: ROUTES.ADMIN_CONTENT, show: isEventManager(role) },
  ].filter(tab => tab.show);

  return (
    <div className="bg-bai-bone min-h-screen pb-24">
      <div className="bg-bai-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <p className="text-white/80 text-sm">
            {userData?.displayName || user?.displayName || user?.email}{role ? `, ${ROLE_LABELS[role]}` : ''}
          </p>
          <h1 className="display text-3xl md:text-5xl mt-2">{title}</h1>
          <nav aria-label="Admin" className="mt-8">
            <ul className="flex flex-wrap gap-x-2">
              {tabs.map(tab => (
                <li key={tab.path}>
                  <NavLink
                    to={tab.path}
                    end={tab.path === ROUTES.DASHBOARD}
                    className={({ isActive }) => `inline-flex items-center min-h-12 px-4 font-display font-bold uppercase tracking-wide text-sm border-b-4 transition-colors ${
                      isActive ? 'border-bai-red text-white' : 'border-transparent text-white/75 hover:text-white'
                    }`}
                  >
                    {tab.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">{children}</div>
    </div>
  );
}
