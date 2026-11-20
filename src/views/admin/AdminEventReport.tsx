import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AdminShell } from './AdminShell';
import { eventController } from '../../controllers/eventController';
import { ticketController } from '../../controllers/ticketController';
import { ROUTES } from '../../controllers/navigation';
import { formatCurrency, formatDateTime, friendlyError, toDate } from '../../controllers/lib/utils';
import { ticketTypesOf } from '../../models/ticketTypes';
import { currencyOf } from '../../models/currency';
import type { BAIEvent, Ticket } from '../../models/types';
import { confirmAction } from '../../services/confirm';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';
import { useActivity } from '../components/useActivity';

const STATUS_LABEL: Record<string, string> = { VALID: 'Not yet arrived', SCANNED: 'Arrived', CANCELLED: 'Cancelled' };

/** A cell for a CSV file: quoted, and never read as a formula by spreadsheet apps. */
const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/** One event: what was sold and to whom, who has arrived, cancellations, and the attendee list. */
export default function AdminEventReport() {
  const { eventId = '' } = useParams();
  const record = useActivity();
  const [event, setEvent] = useState<BAIEvent | null | undefined>(undefined);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'VALID' | 'SCANNED' | 'CANCELLED'>('all');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ev, list] = await Promise.all([eventController.getEventById(eventId), ticketController.listForEvent(eventId)]);
      setEvent(ev);
      setTickets(list);
    } catch (err) {
      logger.error('Event report failed to load', err);
      setError(friendlyError(err, 'The report could not be loaded.'));
      setEvent(null);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => {
    const list = tickets || [];
    const live = list.filter(t => t.status !== 'CANCELLED');
    const currency = currencyOf(event?.currency);
    const byType = new Map<string, { sold: number; arrived: number; value: number }>();
    for (const t of live) {
      const row = byType.get(t.ticketType) || { sold: 0, arrived: 0, value: 0 };
      row.sold += 1;
      if (t.status === 'SCANNED') row.arrived += 1;
      row.value += Number(t.price) || 0;
      byType.set(t.ticketType, row);
    }
    return {
      issued: live.length,
      arrived: live.filter(t => t.status === 'SCANNED').length,
      waiting: live.filter(t => t.status === 'VALID').length,
      cancelled: list.length - live.length,
      value: live.reduce((sum, t) => sum + (Number(t.price) || 0), 0),
      currency,
      byType,
    };
  }, [tickets, event]);

  const downloadCsv = () => {
    if (!event || !tickets) return;
    const header = ['Ticket reference', 'Ticket type', 'Price', 'Currency', 'Email', 'Status', 'Booked', 'Arrived'];
    const rows = tickets.map(t => [t.id, t.ticketType, t.price, currencyOf(t.currency || event.currency), t.buyerEmail, STATUS_LABEL[t.status] || t.status, formatDateTime(t.createdAt), formatDateTime(t.scannedAt)]);
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    // A byte-order mark so Excel opens names with accents correctly.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const setStatus = async (t: Ticket, status: 'VALID' | 'CANCELLED') => {
    if (status === 'CANCELLED' && !await confirmAction({
      title: `Cancel ticket ${t.id}?`,
      message: `${t.buyerEmail || 'The holder'} will see it as cancelled and it will not be accepted at the door. You can restore it later.`,
      confirmLabel: 'Cancel ticket',
      cancelLabel: 'Keep it',
      tone: 'danger',
    })) return;
    setBusy(t.id);
    try {
      await ticketController.setTicketStatus(t.id, status);
      setTickets(list => (list || []).map(x => (x.id === t.id ? { ...x, status } : x)));
      toast.success(status === 'CANCELLED' ? 'Ticket cancelled.' : 'Ticket restored.');
      void record('ticket.cancelled', `${status === 'CANCELLED' ? 'Cancelled' : 'Restored'} ticket ${t.id} (${t.ticketType}) for "${event?.name || t.eventName}", booked by ${t.buyerEmail || 'unknown'}.`, t.id);
    } catch (err) {
      logger.error('Ticket status change failed', err);
      toast.error(friendlyError(err, 'The ticket could not be changed.'));
    } finally {
      setBusy(null);
    }
  };

  const shown = (tickets || []).filter(t => filter === 'all' || t.status === filter);
  const types = event ? ticketTypesOf(event) : [];

  return (
    <AdminShell title="Event report">
      <Link to={ROUTES.ADMIN_EVENTS} className="inline-flex items-center gap-2 min-h-[44px] font-semibold mb-4 hover:text-bai-red">
        <ArrowLeft size={18} aria-hidden="true" /><span>All events</span>
      </Link>

      {error && <p className="p-4 rounded-xl bg-red-50 text-red-900 mb-6" role="alert">{error}</p>}
      {event === undefined ? (
        <div className="h-40 bg-white animate-pulse rounded-2xl" role="status" aria-label="Loading report" />
      ) : !event ? (
        !error && <p className="py-8">This event no longer exists.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div className="min-w-0">
              <h2 className="display text-3xl md:text-4xl break-words">{event.name}</h2>
              <p className="num text-bai-black/75 mt-1">{formatDateTime(event.date)} · {[event.venue, event.city].filter(Boolean).join(', ')}{event.status === 'Cancelled' ? ' · Cancelled' : ''}</p>
            </div>
            <button type="button" onClick={downloadCsv} disabled={!tickets || tickets.length === 0} className="btn btn-primary">
              Download attendee list
            </button>
          </div>

          <dl className="grid grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-6 border-y border-bai-black/15 py-6 mb-8">
            {[
              ['Tickets issued', String(summary.issued)],
              ['Arrived', String(summary.arrived)],
              ['Not yet arrived', String(summary.waiting)],
              ['Cancelled', String(summary.cancelled)],
              ['Ticket value', formatCurrency(summary.value, summary.currency)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-bai-black/75 font-semibold mt-1">{label}</dt>
                <dd className="num text-2xl sm:text-3xl font-display font-bold break-words">{tickets ? value : '—'}</dd>
              </div>
            ))}
          </dl>

          <h3 className="font-semibold text-lg mb-3">By ticket type</h3>
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-left num">
              <thead className="text-sm text-bai-black/70">
                <tr><th className="py-2 pr-4 font-semibold">Type</th><th className="py-2 pr-4 font-semibold">Price</th><th className="py-2 pr-4 font-semibold">Sold</th><th className="py-2 pr-4 font-semibold">Arrived</th><th className="py-2 font-semibold">Value</th></tr>
              </thead>
              <tbody>
                {types.map(t => {
                  const row = summary.byType.get(t.name) || { sold: 0, arrived: 0, value: 0 };
                  return (
                    <tr key={t.id} className="border-t border-bai-black/10">
                      <td className="py-2 pr-4 font-semibold">{t.name}</td>
                      <td className="py-2 pr-4">{t.price > 0 ? formatCurrency(t.price, event.currency) : 'Free'}</td>
                      <td className="py-2 pr-4">{row.sold} of {t.capacity}</td>
                      <td className="py-2 pr-4">{row.arrived}</td>
                      <td className="py-2">{formatCurrency(row.value, event.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold text-lg">Tickets</h3>
            <div className="even-row w-full sm:w-auto sm:flex-1 sm:max-w-xl" role="group" aria-label="Show tickets">
              {(['all', 'VALID', 'SCANNED', 'CANCELLED'] as const).map(f => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                  className={`min-h-[44px] px-4 rounded-full text-sm font-semibold border ${filter === f ? 'bg-bai-black text-white border-bai-black' : 'border-bai-black/25 hover:border-bai-black'}`}>
                  {f === 'all' ? 'All' : STATUS_LABEL[f]}
                </button>
              ))}
            </div>
          </div>
          {tickets === null ? (
            <div className="h-24 bg-white animate-pulse rounded-xl" role="status" aria-label="Loading tickets" />
          ) : shown.length === 0 ? (
            <p className="py-6 border-y border-bai-black/15 text-bai-black/75">No tickets here yet.</p>
          ) : (
            <ul className="border-t border-bai-black/15">
              {shown.map(t => (
                <li key={t.id} className="py-3 border-b border-bai-black/15 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-grow">
                    <p className="font-semibold break-all">{t.buyerEmail || 'Unknown'}</p>
                    <p className="num text-sm text-bai-black/70">{t.id} · {t.ticketType} · {STATUS_LABEL[t.status] || t.status}{t.status === 'SCANNED' && toDate(t.scannedAt) ? ` ${formatDateTime(t.scannedAt)}` : ''}</p>
                  </div>
                  {t.status === 'VALID' && (
                    <button type="button" onClick={() => setStatus(t, 'CANCELLED')} disabled={busy === t.id} className="btn btn-danger">
                      Cancel
                    </button>
                  )}
                  {t.status === 'CANCELLED' && (
                    <button type="button" onClick={() => setStatus(t, 'VALID')} disabled={busy === t.id} className="btn btn-outline">
                      Restore
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
}
