import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ticket } from 'lucide-react';
import { ROUTES } from '../../controllers/navigation';
import { useAuth } from '../components/AuthProvider';
import { AdminShell } from '../admin/AdminShell';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { userController } from '../../controllers/userController';
import { logger } from '../../services/loggerService';
import { formatCurrency, formatDateTime } from '../../controllers/lib/utils';
import { isEventManager, isFinance, isScanner, isUserAdmin, TicketScan } from '../../models/types';

export default function Dashboard() {
  const { role } = useAuth();
  const canSeeUsers = isUserAdmin(role);
  const canSeeSales = isFinance(role);
  const canManageEvents = isEventManager(role);

  const [stats, setStats] = useState<{ totalUsers?: number; totalTickets?: number; revenue?: number; activeEvents?: number }>({});
  const [recentScans, setRecentScans] = useState<TicketScan[]>([]);
  const [loading, setLoading] = useState(true);

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

  const show = (value: number | undefined, format: (n: number) => string = String) => (value === undefined ? '—' : format(value));
  const links = [
    { name: 'Events', to: ROUTES.ADMIN_EVENTS, show: canManageEvents },
    { name: 'Site content', to: ROUTES.ADMIN_CONTENT, show: canManageEvents },
    { name: 'Users', to: ROUTES.ADMIN_USERS, show: canSeeUsers },
    { name: 'Door scanner', to: ROUTES.SCANNER, show: isScanner(role) },
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
                    </span>
                    <ArrowRight size={18} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

    </AdminShell>
  );
}

function Stat({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-bai-black/75 font-semibold mt-1">{title}</dt>
      <dd className="num text-3xl sm:text-4xl font-display font-bold break-words">
        {value === null ? <span className="inline-block h-8 w-20 bg-bai-black/10 animate-pulse rounded" aria-label="Loading" /> : value}
      </dd>
    </div>
  );
}
