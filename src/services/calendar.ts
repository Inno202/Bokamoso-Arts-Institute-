/**
 * "Add to calendar" for an event: a Google Calendar link, and a standard .ics file that
 * iPhone, Android, Outlook and Mac calendars all open. Events have a start time only, so
 * the calendar entry lasts three hours (staff can change it in their own calendar).
 */
import { toDate } from '../controllers/lib/utils';
import type { DateLike } from '../models/types';

export const EVENT_HOURS = 3;

export interface CalendarEvent {
  id: string;
  name: string;
  date: DateLike;
  venue?: string;
  city?: string;
  description?: string;
  url?: string;
}

/** 20261216T113400Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function span(event: CalendarEvent) {
  const start = toDate(event.date);
  if (!start) return null;
  return { start, end: new Date(start.getTime() + EVENT_HOURS * 3600e3) };
}

const place = (e: CalendarEvent) => [e.venue, e.city].filter(Boolean).join(', ');
const details = (e: CalendarEvent) => [e.description?.slice(0, 600), e.url].filter(Boolean).join('\n\n');

export function googleCalendarUrl(event: CalendarEvent) {
  const s = span(event);
  if (!s) return '';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${stamp(s.start)}/${stamp(s.end)}`,
    location: place(event),
    details: details(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Text in an .ics line: commas, semicolons, backslashes and new lines escaped; long lines folded. */
const icsText = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line: string) => line.match(/.{1,73}/g)?.join('\r\n ') ?? line;

export function icsFile(event: CalendarEvent) {
  const s = span(event);
  if (!s) return '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bokamoso Arts Institute//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@bokamoso-arts-institute`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(s.start)}`,
    `DTEND:${stamp(s.end)}`,
    `SUMMARY:${icsText(event.name)}`,
    ...(place(event) ? [`LOCATION:${icsText(place(event))}`] : []),
    ...(details(event) ? [`DESCRIPTION:${icsText(details(event))}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(event.name)} starts in 3 hours`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Downloads the .ics file; phones offer to add it to their calendar. */
export function downloadIcs(event: CalendarEvent) {
  const text = icsFile(event);
  if (!text) return;
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
