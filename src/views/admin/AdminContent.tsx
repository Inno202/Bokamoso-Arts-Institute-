import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { ExternalLink, Loader2, RotateCcw, Save } from 'lucide-react';
import { AdminShell } from './AdminShell';
import { FieldEditor, fieldId } from './FieldEditor';
import { useAuth } from '../components/AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { clean, type Data, type Errors } from '../../content/fields';
import { SECTIONS, SECTION_KEYS, isSectionKey, type SectionKey } from '../../content/sections';
import { ContentValidationError, saveSection, useContentState } from '../../content/store';
import { formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';

export default function AdminContent() {
  const { section } = useParams();
  const key: SectionKey = isSectionKey(section) ? section : 'site';

  return (
    <AdminShell title="Site content">
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
    </AdminShell>
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
      toast.success(`${def.title} saved. The site now shows your changes.`);
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

  const discard = () => {
    if (!window.confirm('Discard your unsaved changes to this section?')) return;
    setDraft(structuredClone(state.content) as unknown as Data);
    setErrors({});
  };

  const loadDefaults = () => {
    if (!window.confirm('Fill this form with the built-in defaults? Nothing changes on the site until you save.')) return;
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

      <div className="sticky bottom-0 mt-12 -mx-4 px-4 py-4 bg-bai-bone/95 backdrop-blur-sm border-t border-bai-black/15 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || !dirty} className="btn btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          <span>{saving ? 'Saving' : 'Save changes'}</span>
        </button>
        <button type="button" disabled={saving || !dirty} onClick={discard} className="btn btn-outline">Discard</button>
        <button type="button" disabled={saving} onClick={loadDefaults} className="btn btn-outline">
          <RotateCcw size={16} aria-hidden="true" />
          <span>Load defaults</span>
        </button>
        <p className="text-sm text-bai-black/75 ml-auto" role="status">{dirty ? 'You have unsaved changes.' : 'Everything is saved.'}</p>
      </div>
    </form>
  );
}
