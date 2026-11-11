import { extractSchemaOrg } from './schema-org.js';
import { extractLinkedIn } from './linkedin.js';
import { extractMetadata } from './metadata.js';
import { STATUSES } from '../domain.js';

export const IMPORT_LIMITS = { company: 160, position: 160, url: 2048, location: 200, salary: 120, notes: 10000 };
const SOURCES = ['schema.org', 'linkedin', 'metadata', 'web'];

// This factory and its three extractors are self-contained, so the installed bookmarklet
// uses exactly the same implementation as the tested modules (also after a production build).
export function createExtractionRuntime(schema, linkedin, metadata) {
  function safeUrl(value, base = '') {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = base ? new URL(value, base) : new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
      for (const key of [...url.searchParams.keys()]) {
        if (/^utm_/i.test(key) || ['refId', 'trackingId', 'trk', 'midToken', 'midSig', 'fbclid', 'gclid'].includes(key)) url.searchParams.delete(key);
      }
      return url.href.length <= 2048 ? url.href : '';
    } catch { return ''; }
  }
  function extract(document, currentUrl) {
    const fallback = safeUrl(currentUrl);
    if (!fallback) return null;
    const results = [];
    for (const extractor of [schema, linkedin, metadata]) {
      try { const result = extractor(document, fallback); if (result) results.push(result); } catch { /* An adapter must not prevent generic fallback. */ }
    }
    const limits = { company: 160, position: 160, location: 200, salary: 120, notes: 10000 };
    const offer = {};
    for (const [key, limit] of Object.entries(limits)) {
      const result = results.find((item) => typeof item[key] === 'string' && item[key].trim());
      offer[key] = result ? result[key].trim().slice(0, limit) : '';
    }
    offer.url = results.map((item) => safeUrl(item.url, fallback)).find(Boolean) || fallback;
    offer.status = 'À postuler';
    offer.source = results[0]?.source || 'web';
    return offer;
  }
  return { extract, safeUrl };
}

const runtime = createExtractionRuntime(extractSchemaOrg, extractLinkedIn, extractMetadata);
export function extractJobOffer(document, currentUrl = '') {
  return runtime.extract(document, currentUrl || document.location?.href || '');
}

export function validateImportedOffer(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Le brouillon doit être un objet.');
  if (Object.keys(raw).some((key) => !Object.hasOwn(IMPORT_LIMITS, key))) throw new Error('Le brouillon contient un champ non autorisé.');
  const offer = {};
  for (const [key, limit] of Object.entries(IMPORT_LIMITS)) {
    const value = Object.hasOwn(raw, key) ? raw[key] : '';
    if (typeof value !== 'string' || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new Error(`Champ importé invalide : ${key}.`);
    offer[key] = value.trim();
  }
  if (offer.url) {
    if (/\s/.test(offer.url)) throw new Error('Le lien importé contient des espaces ou caractères de contrôle.');
    let url;
    try { url = new URL(offer.url); } catch { throw new Error('Le lien importé est invalide.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Le lien doit utiliser HTTP(S), sans identifiants.');
  }
  if (!offer.company && !offer.position && !offer.url) throw new Error('Le brouillon importé est vide.');
  return { ...offer, status: STATUSES[0] };
}

export function parseImportFragment(hash) {
  if (!hash?.startsWith('#job-import')) return null;
  if (!hash.startsWith('#job-import=') || hash.length > 65000) throw new Error('Fragment d’import invalide ou trop volumineux.');
  let envelope;
  try {
    const text = decodeURIComponent(hash.slice('#job-import='.length));
    if (text.length > 16000) throw new Error();
    envelope = JSON.parse(text);
  } catch { throw new Error('Les données d’import sont illisibles ou trop volumineuses.'); }
  if (!envelope || envelope.version !== 1 || !SOURCES.includes(envelope.source) || Object.keys(envelope).some((key) => !['version', 'source', 'offer'].includes(key))) throw new Error('Format d’import non pris en charge.');
  return { ...validateImportedOffer(envelope.offer), importSource: envelope.source };
}

// Backward-compatible links created by the initial prototype. New bookmarklets use a
// fragment instead, so descriptions never appear in HTTP requests/server access logs.
export function parsePrefillParams(searchParams) {
  if (!searchParams) return null;
  const params = typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;
  if (params.get('prefill') !== '1' && params.get('import') !== '1') return null;
  if (params.toString().length > 65000) throw new Error('Import trop volumineux.');
  const raw = {};
  for (const key of Object.keys(IMPORT_LIMITS)) {
    if (params.getAll(key).length > 1) throw new Error('Champ importé en double.');
    raw[key] = params.get(key) || '';
  }
  return validateImportedOffer(raw);
}

export function clearImportLocation(location) {
  const url = new URL(location.href);
  if (url.hash.startsWith('#job-import')) url.hash = '';
  if (url.searchParams.get('prefill') === '1' || url.searchParams.get('import') === '1') {
    for (const key of ['prefill', 'import', ...Object.keys(IMPORT_LIMITS)]) url.searchParams.delete(key);
  }
  return url.pathname + url.search + url.hash;
}

export function validateTargetOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Adresse de l’application invalide.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Utilisez l’origine HTTP(S) de l’application, sans chemin, identifiants, paramètres ou fragment.');
  return url.origin;
}

// No network calls, cookie/storage reads, injected scripts, third-party submissions or auto-save.
function runBookmarklet(targetOrigin, extractor) {
  try {
    const extracted = extractor.extract(document, window.location.href);
    if (!extracted) { window.alert('Ouvrez une page d’offre HTTP(S), puis réessayez.'); return; }
    const offer = {};
    for (const key of ['company', 'position', 'url', 'location', 'salary', 'notes']) offer[key] = extracted[key];
    const json = JSON.stringify({ version: 1, source: extracted.source, offer });
    const fragment = '#job-import=' + encodeURIComponent(json);
    if (json.length > 16000 || fragment.length > 65000) { window.alert('Offre trop volumineuse. Ajoutez-la manuellement.'); return; }
    window.open(targetOrigin + '/' + fragment, '_blank', 'noopener,noreferrer');
  } catch { window.alert('Extraction impossible sur cette page. Vous pouvez saisir cette offre manuellement.'); }
}

export function generateBookmarkletCode(targetOrigin = 'http://localhost:3000') {
  const origin = validateTargetOrigin(targetOrigin);
  const factory = `(${createExtractionRuntime.toString()})(${extractSchemaOrg.toString()},${extractLinkedIn.toString()},${extractMetadata.toString()})`;
  const script = `void (${runBookmarklet.toString()})(${JSON.stringify(origin)},${factory})`;
  return 'javascript:' + encodeURIComponent(script);
}
