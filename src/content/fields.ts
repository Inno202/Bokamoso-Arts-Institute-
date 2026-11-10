/**
 * Field definitions for editable content.
 *
 * One list of fields per content section drives three things, so they can never
 * drift apart:
 *   - resolve():  merge whatever is in the store over the built-in defaults,
 *                 ignoring anything missing or malformed (the public site reads this);
 *   - validate(): check what staff typed before it is saved;
 *   - the admin form, which is drawn from the same list.
 *
 * This file is pure: no Firebase, no React, so it is easy to test.
 */

export type Field =
  | { kind: 'text'; key: string; label: string; max: number; required?: boolean; multiline?: boolean; help?: string }
  | { kind: 'number'; key: string; label: string; min: number; max: number; integer?: boolean; help?: string }
  | { kind: 'url'; key: string; label: string; required?: boolean; help?: string }
  | { kind: 'email'; key: string; label: string; required?: boolean; help?: string }
  | { kind: 'tel'; key: string; label: string; required?: boolean; help?: string }
  | { kind: 'image'; key: string; label: string; required?: boolean; help?: string }
  | { kind: 'select'; key: string; label: string; options: Array<{ value: string; label: string }>; help?: string }
  | { kind: 'images'; key: string; label: string; max: number; help?: string }
  | { kind: 'group'; key: string; label: string; fields: Field[]; help?: string }
  | { kind: 'list'; key: string; label: string; itemLabel: string; titleKey: string; min?: number; max: number; fields: Field[]; help?: string };

export type Data = Record<string, unknown>;
export type Errors = Record<string, string>;

const isObject = (v: unknown): v is Data => typeof v === 'object' && v !== null && !Array.isArray(v);

// ---------- what counts as safe ----------

/** Only full https links, with no embedded username or password. Blocks javascript:, data:, http: and friends. */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** A picture: an https link, a file shipped with the site (assets/…), or an uploaded JPEG/PNG/WebP. */
export function isSafeImage(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return true;
  if (/^assets\/[\w\-./]+\.(jpe?g|png|webp)$/i.test(value) && !value.includes('..')) return true;
  return isSafeUrl(value);
}

export const isEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 320 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(value);

export const isPhone = (value: unknown): value is string =>
  typeof value === 'string' && /^\+?[0-9][0-9 ()-]{6,19}$/.test(value);

const formatOk = (field: Field, value: string) => {
  switch (field.kind) {
    case 'url': return isSafeUrl(value);
    case 'email': return isEmail(value);
    case 'tel': return isPhone(value);
    case 'image': return isSafeImage(value);
    default: return true;
  }
};

// ---------- defaults for a brand-new list item ----------

export function blankItem(fields: Field[], strict = false): Data {
  const item: Data = {};
  for (const f of fields) {
    switch (f.kind) {
      case 'number': item[f.key] = ''; break; // empty on purpose: staff must type a figure
      // When reading stored data, an unknown choice must not turn into the first option.
      case 'select': item[f.key] = strict ? '' : f.options[0]?.value ?? ''; break;
      case 'images': case 'list': item[f.key] = []; break;
      case 'group': item[f.key] = blankItem(f.fields, strict); break;
      default: item[f.key] = '';
    }
  }
  return item;
}

// ---------- reading: store data over defaults ----------

/**
 * Returns content that is always complete and always safe to render. Each field
 * takes the stored value when it is usable and the default when it is not, so a
 * half-filled, outdated or tampered document can never break a page.
 */
export function resolve(fields: Field[], raw: unknown, defaults: Data): Data {
  const source = isObject(raw) ? raw : {};
  const out: Data = {};

  for (const f of fields) {
    const stored = source[f.key];
    const fallback = defaults[f.key];

    switch (f.kind) {
      case 'text': {
        const ok = typeof stored === 'string' && (!f.required || stored.trim() !== '');
        out[f.key] = ok ? (stored as string).slice(0, f.max) : fallback;
        break;
      }
      case 'number': {
        const ok = typeof stored === 'number' && Number.isFinite(stored) && stored >= f.min && stored <= f.max
          && (!f.integer || Number.isInteger(stored));
        out[f.key] = ok ? stored : fallback;
        break;
      }
      case 'url': case 'email': case 'tel': case 'image': {
        const ok = typeof stored === 'string' && (stored === '' ? !f.required : formatOk(f, stored));
        out[f.key] = ok ? stored : fallback;
        break;
      }
      case 'select':
        out[f.key] = f.options.some(o => o.value === stored) ? stored : fallback;
        break;
      case 'images':
        out[f.key] = Array.isArray(stored) ? stored.filter(isSafeImage).slice(0, f.max) : fallback;
        break;
      case 'group':
        out[f.key] = resolve(f.fields, stored, isObject(fallback) ? fallback : {});
        break;
      case 'list': {
        if (!Array.isArray(stored)) { out[f.key] = fallback; break; }
        const blank = blankItem(f.fields, true);
        const items = stored
          .filter(isObject)
          .slice(0, f.max)
          .map(item => resolve(f.fields, item, blank))
          // An item whose required parts did not survive is dropped, not shown half-empty.
          .filter(item => Object.keys(validate(f.fields, item)).length === 0);
        out[f.key] = items.length >= (f.min ?? 0) ? items : fallback;
        break;
      }
    }
  }
  return out;
}

// ---------- writing: check what staff typed ----------

const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

/** Returns one message per problem, keyed by the field's path (for example "tiers.1.amount"). Empty means valid. */
export function validate(fields: Field[], data: unknown, prefix = ''): Errors {
  const errors: Errors = {};
  const source = isObject(data) ? data : {};

  for (const f of fields) {
    const path = prefix + f.key;
    const value = source[f.key];

    switch (f.kind) {
      case 'text': {
        const text = typeof value === 'string' ? value : '';
        if (f.required && text.trim() === '') errors[path] = `Add the ${lower(f.label)}.`;
        else if (text.length > f.max) errors[path] = `Keep the ${lower(f.label)} to ${f.max} characters or fewer (it is ${text.length}).`;
        break;
      }
      case 'number': {
        if (typeof value !== 'number' || !Number.isFinite(value)) errors[path] = `Enter the ${lower(f.label)} as a number.`;
        else if (f.integer && !Number.isInteger(value)) errors[path] = `The ${lower(f.label)} must be a whole number.`;
        else if (value < f.min || value > f.max) errors[path] = `The ${lower(f.label)} must be between ${f.min} and ${f.max}.`;
        break;
      }
      case 'url': case 'email': case 'tel': case 'image': {
        const text = typeof value === 'string' ? value.trim() : '';
        if (text === '') {
          if (f.required) errors[path] = `Add the ${lower(f.label)}.`;
        } else if (!formatOk(f, text)) {
          errors[path] = {
            url: 'Use a full link that starts with https://',
            email: 'That does not look like an email address.',
            tel: 'Use digits, spaces and an optional leading +, for example +27 12 345 6789.',
            image: 'Upload a JPEG, PNG or WebP image, or paste a link that starts with https://',
          }[f.kind];
        }
        break;
      }
      case 'select':
        if (!f.options.some(o => o.value === value)) errors[path] = `Choose the ${lower(f.label)}.`;
        break;
      case 'images': {
        const list = Array.isArray(value) ? value : [];
        if (list.length > f.max) errors[path] = `Use ${f.max} images or fewer.`;
        else if (!list.every(isSafeImage)) errors[path] = 'One of these images is not a JPEG, PNG, WebP or https link.';
        break;
      }
      case 'group':
        Object.assign(errors, validate(f.fields, value, `${path}.`));
        break;
      case 'list': {
        const list = Array.isArray(value) ? value : [];
        if (list.length < (f.min ?? 0)) errors[path] = `Add at least ${f.min} ${lower(f.itemLabel)}${f.min === 1 ? '' : 's'}.`;
        else if (list.length > f.max) errors[path] = `Use ${f.max} ${lower(f.itemLabel)}s or fewer.`;
        list.forEach((item, i) => Object.assign(errors, validate(f.fields, item, `${path}.${i}.`)));
        break;
      }
    }
  }
  return errors;
}

/** Trims text and drops unknown keys, so only declared fields are ever saved. */
export function clean(fields: Field[], data: unknown): Data {
  const source = isObject(data) ? data : {};
  const out: Data = {};
  for (const f of fields) {
    const value = source[f.key];
    switch (f.kind) {
      case 'group': out[f.key] = clean(f.fields, value); break;
      case 'list': out[f.key] = (Array.isArray(value) ? value : []).map(item => clean(f.fields, item)); break;
      case 'images': out[f.key] = Array.isArray(value) ? value.filter(v => typeof v === 'string') : []; break;
      case 'number': case 'select': out[f.key] = value; break;
      default: out[f.key] = typeof value === 'string' ? value.trim() : '';
    }
  }
  return out;
}
