import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { Clock, ExternalLink, KeyRound, Loader2, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { AdminShell } from './AdminShell';
import { FieldEditor, fieldId } from './FieldEditor';
import { useAuth } from '../components/AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { clean, type Data, type Errors } from '../../content/fields';
import { SECTIONS, SECTION_KEYS, isSectionKey, type SectionKey } from '../../content/sections';
import { ContentValidationError, saveSection, useContentState } from '../../content/store';
import { formatDateTime, friendlyError, toDate } from '../../controllers/lib/utils';
import { contentAccessController, hasLiveAccess, NOTE_LIMIT } from '../../controllers/contentAccessController';
import { needsContentApproval, type ContentAccess } from '../../models/types';
import { toast } from '../../services/toast';
import { confirmAction } from '../../services/confirm';
import { logger } from '../../services/loggerService';

export default function AdminContent() {
  const { section } = useParams();
  const key: SectionKey = isSectionKey(section) ? section : 'site';
  const { role } = useAuth();

  return (
    <AdminShell title="Site content">
      {needsContentApproval(role) ? <AccessGate>{editorFor(key)}</AccessGate> : editorFor(key)}
    </AdminShell>
  );
}

function editorFor(key: SectionKey) {
  return (
    <>
      <nav aria-label="Content sections" className="mb-10">
        <ul className="flex flex-wrap gap-2">
          {SECTION_KEYS.map(k => (
            <li key={k}>
              <NavLink
                to={`${ROUTES.ADMIN_CONTENT}/${k}`}
                aria-current={k === key ? 'page' : undefined}
                className={`inline-flex items-center min-h-11 px-4 rounded-lg font-semibold border-2 transition-colors ${
                  k === key ? 'bg-bai-black text-white border-bai-black' : 'border-bai-black/20 hover:border-bai-black'
                }`}
              >
                {SECTIONS[k].title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {/* A fresh editor per section, so one section's unsaved text never leaks into another. */}
      <SectionEditor key={key} sectionKey={key} />
    </>
  );
}

/**
 * PRO staff see the editor only while a super admin or the CEO has approved it.
 * The Firestore rules enforce the same thing; this screen explains it and lets them ask.
 */
function AccessGate({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const [access, setAccess] = useState<ContentAccess | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  // Once the editor has been open this visit, keep it open when access runs out, so unsaved text is not lost.
  const [hadAccess, setHadAccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    return contentAccessController.subscribeMine(user.uid, (a) => { setAccess(a); setFailed(false); }, () => setFailed(true));
  }, [user]);

  // Re-check when the approval is due to run out.
  const until = toDate(access?.expiresAt)?.getTime();
  useEffect(() => {
    if (!until || until <= Date.now()) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(until - Date.now() + 500, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [until]);

  const live = hasLiveAccess(access, now);
  useEffect(() => { if (live) setHadAccess(true); }, [live]);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || sending) return;
    setSending(true);
    try {
      await contentAccessController.request(user, userData?.displayName || user.displayName || '', note);
      setNote('');
      toast.success('Request sent. You can edit as soon as it is approved.');
    } catch (err) {
      logger.error('Could not request content access', err);
      toast.error(friendlyError(err, 'Your request could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  if (access === undefined && !failed) {
    return <div className="py-20 flex justify-center" role="status" aria-label="Checking your access"><Loader2 className="animate-spin" size={28} aria-hidden="true" /></div>;
  }

  const requestForm = (
    <form onSubmit={ask} className="mt-6 space-y-4">
      <div>
        <label htmlFor="access-note" className="field-label">What would you like to change? <span className="font-normal text-bai-black/70">(optional)</span></label>
        <textarea id="access-note" rows={3} maxLength={NOTE_LIMIT} value={note} onChange={(e) => setNote(e.target.value)} className="field leading-relaxed" placeholder="For example: add the new tour photos to the About page" />
      </div>
      <button type="submit" disabled={sending} className="btn btn-primary">
        {sending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
        <span>{sending ? 'Sending request' : 'Request access'}</span>
      </button>
    </form>
  );

  if (live || hadAccess) {
    return (
      <>
        {live ? (
          <p className="mb-8 p-4 rounded-xl bg-green-50 text-green-950 flex items-center gap-3" role="status">
            <ShieldCheck size={20} className="shrink-0 text-green-800" aria-hidden="true" />
            <span>You can edit site content until <strong className="num">{formatDateTime(access?.expiresAt)}</strong>.</span>
          </p>
        ) : (
          <div className="mb-8 p-5 rounded-xl bg-amber-50 text-amber-950" role="alert">
            <p className="font-semibold">Your editing access has ended, so changes can no longer be saved.</p>
            <p className="mt-1 text-sm">Keep this page open and ask again: your unsaved text stays here.</p>
            {access?.status === 'PENDING' ? <p className="mt-3 text-sm font-semibold">Request sent. Waiting for approval.</p> : requestForm}
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <section className="panel p-6 sm:p-8 max-w-2xl" aria-labelledby="access-heading">
      <h2 id="access-heading" className="display text-3xl">Ask to edit site content</h2>
      <p className="text-bai-ink-soft mt-3 leading-relaxed">
        PRO staff need approval from a super admin or the CEO before changing site content. Once approved, you can edit for the time they choose.
      </p>
      {failed && <p className="mt-5 p-4 rounded-xl bg-red-50 text-red-900" role="alert">Your access could not be checked. Check your connection and reload the page.</p>}
      {access?.status === 'PENDING' ? (
        <div className="mt-6 p-5 rounded-xl bg-blue-50 text-blue-950" role="status">
          <p className="font-semibold flex items-center gap-2"><Clock size={18} aria-hidden="true" />Request sent {formatDateTime(access.requestedAt)}</p>
          <p className="mt-1 text-sm">Waiting for approval. This page opens the editor by itself once it is approved.</p>
          {access.note && <p className="mt-3 text-sm break-words">Your note: {access.note}</p>}
        </div>
      ) : (
        <>
          {access?.status === 'DECLINED' && <p className="mt-5 p-4 rounded-xl bg-red-50 text-red-900">Your last request was declined {formatDateTime(access.decidedAt)}. You can ask again.</p>}
          {(access?.status === 'ENDED' || access?.status === 'APPROVED') && <p className="mt-5 p-4 rounded-xl bg-bai-sand">Your last access ended {formatDateTime(access.expiresAt)}.</p>}
          {requestForm}
        </>
      )}
    </section>
  );
}

function SectionEditor({ sectionKey }: { sectionKey: SectionKey }) {
  const def = SECTIONS[sectionKey];
  const state = useContentState(sectionKey);
  const { user } = useAuth();
  const [draft, setDraft] = useState<Data | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const liveJson = useMemo(() => JSON.stringify(clean(def.fields, state.content)), [def, state.content]);
  const draftJson = useMemo(() => (draft ? JSON.stringify(clean(def.fields, draft)) : liveJson), [def, draft, liveJson]);
  const dirty = draft !== null && draftJson !== liveJson;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Start from what is live. If someone else saves while this form is untouched, follow them.
  useEffect(() => {
    if (state.ready && !dirtyRef.current) setDraft(structuredClone(state.content) as unknown as Data);
  }, [state.ready, state.content]);

  // Warn before a tab close throws away typed changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !user || saving) return;
    setSaving(true);
    try {
      await saveSection(sectionKey, draft, user.uid);
      setErrors({});
      toast.success(`${def.title} saved and confirmed. Every visitor now sees your changes.`);
    } catch (err) {
      if (err instanceof ContentValidationError) {
        setErrors(err.errors);
        requestAnimationFrame(() => summaryRef.current?.focus());
      } else {
        logger.error('Saving content failed', err);
        toast.error(friendlyError(err, 'Your changes could not be saved. Check your connection and try again.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    if (!await confirmAction({ title: 'Discard your changes?', message: 'Your unsaved changes to this section will be lost.', confirmLabel: 'Discard changes', tone: 'danger' })) return;
    setDraft(structuredClone(state.content) as unknown as Data);
    setErrors({});
  };

  const loadDefaults = async () => {
    if (!await confirmAction({ title: 'Fill in the defaults?', message: 'This form will be filled with the built-in defaults. Nothing changes on the site until you save.', confirmLabel: 'Use defaults' })) return;
    setDraft(structuredClone(def.defaults) as unknown as Data);
    setErrors({});
  };

  if (!draft) {
    return (
      <div className="py-20 flex justify-center" role="status" aria-label="Loading content">
        <div className="w-10 h-10 border-4 border-bai-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const errorList = Object.entries(errors);
  const status =
    state.source === 'store' ? `Last saved ${state.updatedAt ? formatDateTime(state.updatedAt) : 'just now'}.`
    : state.source === 'legacy' ? 'This is the content saved before the admin area existed. Saving here moves it into the content store.'
    : 'Nothing has been saved for this section yet, so visitors see the built-in defaults shown below.';

  return (
    <form onSubmit={handleSave} noValidate className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="max-w-xl">
          <h2 className="display text-2xl md:text-3xl">{def.title}</h2>
          <p className="text-bai-black/75 mt-2">Shown on: {def.shownOn}</p>
          <p className="text-bai-black/75 mt-1">{status}</p>
          <p className="text-bai-black/75 mt-1">Headings and titles are shown in capital letters on the site, so a change to capitalisation alone will not be visible there.</p>
        </div>
        <Link to={def.preview} target="_blank" rel="noopener" className="btn btn-outline">
          <span>View page</span>
          <ExternalLink size={16} aria-hidden="true" />
        </Link>
      </div>

      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="mb-8 p-5 bg-red-50 text-red-900 rounded-lg">
          <p className="font-bold">Not saved yet. {errorList.length === 1 ? 'One thing needs' : `${errorList.length} things need`} fixing:</p>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            {errorList.map(([path, message]) => (
              <li key={path}>
                {path
                  ? <a href={`#${fieldId(path)}`} className="underline" onClick={(e) => { e.preventDefault(); document.getElementById(fieldId(path))?.focus(); }}>{message}</a>
                  : message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-10">
        {def.fields.map(field => (
          <FieldEditor key={field.key} field={field} value={draft[field.key]} path={field.key} errors={errors}
            onChange={(next) => setDraft(current => ({ ...(current || {}), [field.key]: next }))} />
        ))}
      </div>

      <div className="sticky bottom-0 mt-12 -mx-4 px-4 py-4 bg-bai-bone border-t border-bai-black/15 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || !dirty} className="btn btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          <span>{saving ? 'Saving' : 'Save changes'}</span>
        </button>
        <button type="button" disabled={saving || !dirty} onClick={discard} className="btn btn-outline">Discard</button>
        <button type="button" disabled={saving} onClick={loadDefaults} className="btn btn-outline">
          <RotateCcw size={16} aria-hidden="true" />
          <span>Load defaults</span>
        </button>
        <p className="text-sm text-bai-black/75 ml-auto" role="status">
          {dirty ? 'You have unsaved changes.' : state.pending ? 'Sending to the database. Not live yet.' : 'Everything is saved and live.'}
        </p>
      </div>
    </form>
  );
}
