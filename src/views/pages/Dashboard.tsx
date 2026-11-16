import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Ticket } from 'lucide-react';
import { ROUTES } from '../../controllers/navigation';
import { useAuth } from '../components/AuthProvider';
import { AdminShell } from '../admin/AdminShell';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { userController } from '../../controllers/userController';
import { logger } from '../../services/loggerService';
import { formatCurrency, formatDateTime } from '../../controllers/lib/utils';
import { isEventManager, isFinance, isScanner, isUserAdmin, TicketScan } from '../../models/types';

const SCAN_LIMITS = [5, 10, 20];

function readPref(key: string, fallback: number, valid: (v: number) => boolean): number {
  try {
    const v = Number(localStorage.getItem(key));
    return localStorage.getItem(key) !== null && valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: number) {
  try { localStorage.setItem(key, String(value)); } catch { /* private mode: just not remembered */ }
}

export default function Dashboard() {
  const { role } = useAuth();
  const canSeeUsers = isUserAdmin(role);
  const canSeeSales = isFinance(role);
  const canManageEvents = isEventManager(role);

  const [stats, setStats] = useState<{ totalUsers?: number; totalTickets?: number; revenue?: Array<{ currency: string; total: number }>; activeEvents?: number }>({});
  const [recentScans, setRecentScans] = useState<TicketScan[]>([]);
  const [loading, setLoading] = useState(true);
  // How many scans to list, and whether the section is folded away; remembered on this device.
  const [scanLimit, setScanLimit] = useState<number>(() => readPref('bai-scan-limit', 5, v => SCAN_LIMITS.includes(v)));
  const [scansOpen, setScansOpen] = useState<boolean>(() => readPref('bai-scans-open', 1, v => v === 0 || v === 1) === 1);
  const [scansLoading, setScansLoading] = useState(true);
  const [scanCount, setScanCount] = useState<number | undefined>();

  useEffect(() => {
    let active = true;
    const load = async () => {
      // Each figure is fetched as a server-side total and fails on its own.
      const [users, sales] = await Promise.allSettled([
        canSeeUsers ? userController.countUsers() : Promise.resolve(undefined),
        canSeeSales ? ticketController.getSalesTotals() : Promise.resolve(undefined),
      ]);
      if (!active) return;
      setStats(prev => ({
        ...prev,
        totalUsers: users.status === 'fulfilled' ? users.value : undefined,
        totalTickets: sales.status === 'fulfilled' ? sales.value?.totalTickets : undefined,
        revenue: sales.status === 'fulfilled' ? sales.value?.revenue : undefined,
      }));
      [users, sales].forEach(r => { if (r.status === 'rejected') logger.error('Dashboard figure failed to load', r.reason); });
      setLoading(false);
    };
    void load();

    const unsubscribe = eventController.subscribeToEvents((events) => {
      if (active) setStats(prev => ({ ...prev, activeEvents: events.length }));
    }, true);

    return () => { active = false; unsubscribe(); };
  }, [canSeeUsers, canSeeSales]);

  // The list follows the chosen size; the total comes from one server-side count.
  useEffect(() => {
    let active = true;
    setScansLoading(true);
    Promise.allSettled([ticketController.getRecentScans(scanLimit), ticketController.countScans()]).then(([scans, total]) => {
      if (!active) return;
      if (scans.status === 'fulfilled') setRecentScans(scans.value);
      else logger.error('Recent scans failed to load', scans.reason);
      if (total.status === 'fulfilled') setScanCount(total.value);
      else logger.error('Scan count failed to load', total.reason);
      setScansLoading(false);
    });
    return () => { active = false; };
  }, [scanLimit]);

  const chooseLimit = (n: number) => { setScanLimit(n); writePref('bai-scan-limit', n); };
  const toggleScans = () => setScansOpen(open => { writePref('bai-scans-open', open ? 0 : 1); return !open; });

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
          {canSeeSales && <Stat title="Ticket value" value={loading ? null : stats.revenue === undefined ? '—' : stats.revenue.map(r => formatCurrency(r.total, r.currency)).join(' + ')} />}
          <Stat title="Events on sale" value={stats.activeEvents === undefined ? null : String(stats.activeEvents)} />
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          <section className="lg:col-span-2" aria-labelledby="scans-heading">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-5">
              <h2 id="scans-heading" className="m-0">
                <button type="button" onClick={toggleScans} aria-expanded={scansOpen} aria-controls="recent-scans" className="group flex items-center gap-3 min-h-[44px] text-left">
                  <span className="display text-2xl">Recent scans</span>
                  <span className="num text-sm font-bold bg-bai-black text-white rounded-full px-2.5 py-0.5" aria-label={scanCount === undefined ? 'Count loading' : `${scanCount} tickets scanned in total`}>
                    {scanCount === undefined ? '…' : `${scanCount.toLocaleString('en-ZA')} scanned`}
                  </span>
                  <ChevronDown size={20} className={`shrink-0 transition-transform duration-200 ${scansOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  <span className="sr-only">{scansOpen ? 'Collapse' : 'Expand'}</span>
                </button>
              </h2>
              {scansOpen && (
                <div className="flex items-center gap-2" role="group" aria-label="How many scans to show">
                  <span className="text-sm text-bai-black/70">Show</span>
                  {SCAN_LIMITS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => chooseLimit(n)}
                      aria-pressed={scanLimit === n}
                      className={`num min-w-[44px] min-h-[44px] px-3 rounded-full text-sm font-semibold border transition-colors ${scanLimit === n ? 'bg-bai-black text-white border-bai-black' : 'border-bai-black/25 hover:border-bai-black'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div id="recent-scans" hidden={!scansOpen}>
            {scansLoading && recentScans.length === 0 ? (
              <div className="space-y-3" role="status" aria-label="Loading scans">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white animate-pulse rounded-lg" />)}
              </div>
            ) : recentScans.length > 0 ? (
              <ul className={`border-t border-bai-black/15 transition-opacity ${scansLoading ? 'opacity-60' : ''}`} aria-busy={scansLoading}>
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
            {!scansLoading && scanCount !== undefined && scanCount > recentScans.length && recentScans.length > 0 && (
              <p className="num text-sm text-bai-black/70 mt-3">Showing the latest {recentScans.length} of {scanCount.toLocaleString('en-ZA')}.</p>
            )}
            </div>
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
