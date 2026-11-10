import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { blankItem, isSafeImage, type Data, type Errors, type Field } from '../../content/fields';
import { contentImage } from '../../content/image';
import { cloudinaryService } from '../../services/cloudinaryService';
import { friendlyError } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';

/** The id of the control for a field path, so an error summary can jump to it. */
export const fieldId = (path: string) => `f-${path.replace(/\./g, '-')}`;

interface EditorProps {
  field: Field;
  value: unknown;
  path: string;
  errors: Errors;
  onChange: (value: unknown) => void;
}

const UPLOAD_FOLDER = 'content';

async function uploadImage(file: File): Promise<string | null> {
  try {
    return (await cloudinaryService.upload(file, UPLOAD_FOLDER)).url;
  } catch (err) {
    toast.error(friendlyError(err, 'The image could not be uploaded. Please try again.'));
    return null;
  }
}

function UploadButton({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`btn btn-outline cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bai-blue has-[:focus-visible]:outline-offset-2 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
      {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}
      <span>{busy ? 'Uploading' : label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          const url = await uploadImage(file);
          setBusy(false);
          if (url) onUploaded(url);
        }}
      />
    </label>
  );
}

const describeImage = (value: string) =>
  value.startsWith('data:') ? 'Uploaded photo (stored with this page)' : value.startsWith('assets/') ? `Built-in photo: ${value}` : value;

export function FieldEditor({ field, value, path, errors, onChange }: EditorProps) {
  const id = fieldId(path);
  const error = errors[path];
  const describedBy = [error && `${id}-error`, 'help' in field && field.help && `${id}-help`].filter(Boolean).join(' ') || undefined;
  const help = 'help' in field && field.help ? <p id={`${id}-help`} className="field-help">{field.help}</p> : null;
  const errorLine = error ? <p id={`${id}-error`} className="field-error">{error}</p> : null;

  switch (field.kind) {
    case 'text': {
      const text = typeof value === 'string' ? value : '';
      const shared = {
        id,
        value: text,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
        'aria-required': field.required,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      };
      return (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={id} className="field-label">{field.label}{!field.required && <span className="font-normal text-bai-black/70"> (optional)</span>}</label>
            <span className={`num text-sm ${text.length > field.max ? 'text-red-700 font-bold' : 'text-bai-black/70'}`} aria-hidden="true">{text.length}/{field.max}</span>
          </div>
          {field.multiline
            ? <textarea {...shared} rows={Math.min(8, Math.max(3, Math.ceil(field.max / 90)))} className="field leading-relaxed" />
            : <input {...shared} type="text" className="field" />}
          {help}{errorLine}
        </div>
      );
    }

    case 'number':
      return (
        <div>
          <label htmlFor={id} className="field-label">{field.label}</label>
          <input
            id={id}
            type="number"
            inputMode={field.integer ? 'numeric' : 'decimal'}
            min={field.min}
            max={field.max}
            step={field.integer ? 1 : 'any'}
            value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className="field num max-w-xs"
            // An emptied box stays empty (and fails validation) rather than turning into 0.
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
          {help}{errorLine}
        </div>
      );

    case 'url': case 'email': case 'tel':
      return (
        <div>
          <label htmlFor={id} className="field-label">{field.label}{!field.required && <span className="font-normal text-bai-black/70"> (optional)</span>}</label>
          <input
            id={id}
            type={field.kind}
            inputMode={field.kind}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.kind === 'url' ? 'https://' : undefined}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className="field"
            onChange={(e) => onChange(e.target.value)}
          />
          {help}{errorLine}
        </div>
      );

    case 'select':
      return (
        <div>
          <label htmlFor={id} className="field-label">{field.label}</label>
          <select id={id} value={typeof value === 'string' ? value : ''} aria-invalid={!!error} aria-describedby={describedBy} className="field" onChange={(e) => onChange(e.target.value)}>
            {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {help}{errorLine}
        </div>
      );

    case 'image': {
      const image = typeof value === 'string' ? value : '';
      const isLink = image.startsWith('https://') || image === '';
      return (
        <div>
          <label htmlFor={id} className="field-label">{field.label}{!field.required && <span className="font-normal text-bai-black/70"> (optional)</span>}</label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-bai-black/10 shrink-0">
              {isSafeImage(image) && <img src={contentImage(image, 200)} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-grow min-w-[min(100%,16rem)] space-y-3">
              <input
                id={id}
                type="url"
                value={isLink ? image : describeImage(image)}
                readOnly={!isLink}
                placeholder="Paste an https:// link, or upload"
                aria-invalid={!!error}
                aria-describedby={describedBy}
                className="field"
                onChange={(e) => onChange(e.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <UploadButton label={image ? 'Replace photo' : 'Upload photo'} onUploaded={onChange} />
                {image && !field.required && (
                  <button type="button" className="btn btn-danger" onClick={() => onChange('')}>
                    <Trash2 size={16} aria-hidden="true" /><span>Remove photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          {help}{errorLine}
        </div>
      );
    }

    case 'images': {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const move = (from: number, to: number) => {
        const next = [...list];
        next.splice(to, 0, next.splice(from, 1)[0]);
        onChange(next);
      };
      return (
        <fieldset id={id} tabIndex={-1} aria-describedby={describedBy}>
          <legend className="field-label">{field.label} <span className="num font-normal text-bai-black/70">({list.length} of {field.max})</span></legend>
          {list.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {list.map((image, i) => (
                <li key={`${i}-${image.slice(-24)}`}>
                  <div className="aspect-square rounded-lg overflow-hidden bg-bai-black/10">
                    {isSafeImage(image) && <img src={contentImage(image, 300)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex justify-between mt-1">
                    <button type="button" className="icon-btn hover:bg-bai-black/10 disabled:opacity-30" disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} onClick={() => move(i, i - 1)}>
                      <ArrowUp size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-btn text-bai-red hover:bg-bai-red hover:text-white" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(list.filter((_, n) => n !== i))}>
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {list.length < field.max && <UploadButton label="Add photo" onUploaded={(url) => onChange([...list, url])} />}
          {help}{errorLine}
        </fieldset>
      );
    }

    case 'group': {
      const group = (typeof value === 'object' && value !== null ? value : {}) as Data;
      return (
        <fieldset className="border-t-2 border-bai-black pt-6">
          <legend className="font-display font-bold uppercase tracking-wide text-lg pr-4">{field.label}</legend>
          {help}
          <div className="space-y-6 mt-2">
            {field.fields.map(child => (
              <FieldEditor key={child.key} field={child} value={group[child.key]} path={`${path}.${child.key}`} errors={errors}
                onChange={(next) => onChange({ ...group, [child.key]: next })} />
            ))}
          </div>
        </fieldset>
      );
    }

    case 'list':
      return <ListEditor field={field} value={value} path={path} errors={errors} onChange={onChange} />;
  }
}

function ListEditor({ field, value, path, errors, onChange }: EditorProps & { field: Extract<Field, { kind: 'list' }> }) {
  const baseId = useId();
  const id = fieldId(path);
  const list = Array.isArray(value) ? (value as Data[]) : [];
  const error = errors[path];
  const itemName = field.itemLabel.toLowerCase();

  const move = (from: number, to: number) => {
    const next = [...list];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };
  const titleOf = (item: Data, i: number) => {
    const raw = item[field.titleKey];
    return typeof raw === 'string' && raw.trim() ? raw : `${field.itemLabel} ${i + 1}`;
  };
  const remove = (i: number) => {
    if (window.confirm(`Remove "${titleOf(list[i], i)}"? It disappears from the site once you save.`)) {
      onChange(list.filter((_, n) => n !== i));
    }
  };

  return (
    <fieldset id={id} tabIndex={-1} className="border-t-2 border-bai-black pt-6" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="font-display font-bold uppercase tracking-wide text-lg pr-4">
        {field.label} <span className="num font-sans font-normal normal-case tracking-normal text-base text-bai-black/70">({list.length} of {field.max})</span>
      </legend>
      {field.help && <p className="field-help">{field.help}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}

      {list.length === 0 && <p className="text-bai-black/70 mt-2">None yet. This part of the page stays hidden until you add one.</p>}

      <ol className="mt-2">
        {list.map((item, i) => (
          <li key={`${baseId}-${i}`} className="py-6 border-b border-bai-black/15">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="font-bold text-lg break-words min-w-0">{titleOf(item, i)}</h4>
              <div className="flex shrink-0">
                <button type="button" className="icon-btn hover:bg-bai-black/10 disabled:opacity-30" disabled={i === 0} aria-label={`Move ${titleOf(item, i)} up`} onClick={() => move(i, i - 1)}>
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button type="button" className="icon-btn hover:bg-bai-black/10 disabled:opacity-30" disabled={i === list.length - 1} aria-label={`Move ${titleOf(item, i)} down`} onClick={() => move(i, i + 1)}>
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
                <button type="button" className="icon-btn text-bai-red hover:bg-bai-red hover:text-white" aria-label={`Remove ${titleOf(item, i)}`} onClick={() => remove(i)}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="space-y-5">
              {field.fields.map(child => (
                <FieldEditor key={child.key} field={child} value={item[child.key]} path={`${path}.${i}.${child.key}`} errors={errors}
                  onChange={(next) => onChange(list.map((entry, n) => (n === i ? { ...entry, [child.key]: next } : entry)))} />
              ))}
            </div>
          </li>
        ))}
      </ol>

      <button type="button" className="btn btn-outline mt-6" disabled={list.length >= field.max} onClick={() => onChange([...list, blankItem(field.fields)])}>
        <Plus size={16} aria-hidden="true" />
        <span>Add {itemName}</span>
      </button>
      {list.length >= field.max && <p className="field-help">That is the most this part of the page can hold.</p>}
    </fieldset>
  );
}
