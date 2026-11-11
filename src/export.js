import { EMPTY_APPLICATION } from '../shared/domain.js';
import { selectApplications } from '../shared/dashboard.js';

export const EXPORT_FIELDS = ['id', ...Object.keys(EMPTY_APPLICATION), 'archived', 'createdAt', 'updatedAt'];

export function exportDocument(applications, { archived = false, selection = 'filtered', query = '', status = '', sort = 'desc', dueOnly = false } = {}, now = new Date()) {
  if (!['filtered', 'tab'].includes(selection)) throw new Error('Périmètre d’export invalide.');
  const filters = { archived, query, status, sort, dueOnly: !archived && dueOnly };
  const rows = selectApplications(applications, selection === 'tab' ? { archived } : filters, now);
  return {
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    scope: { archived, selection, filters: selection === 'filtered' ? filters : null },
    applications: rows.map((item) => Object.fromEntries(EXPORT_FIELDS.map((key) => [key, item[key] ?? (key === 'archived' ? false : '')]))),
  };
}

export function csvCell(value) {
  let text = String(value ?? '');
  // Neutralize spreadsheet formulas, including formulas hidden behind whitespace.
  // JSON remains the lossless export; CSV may add a protective apostrophe.
  if (typeof value === 'string' && (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(document) {
  return '\uFEFF' + [EXPORT_FIELDS.map(csvCell).join(','), ...document.applications.map((item) => EXPORT_FIELDS.map((key) => csvCell(item[key])).join(','))].join('\r\n') + '\r\n';
}

export function downloadExport(document, format) {
  if (!['csv', 'json'].includes(format)) throw new Error('Format d’export invalide.');
  const csv = format === 'csv';
  const blob = new Blob([csv ? toCsv(document) : JSON.stringify(document, null, 2)], { type: csv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `candidatures-${document.scope.archived ? 'archives' : 'actives'}-${document.scope.selection}-${document.exportedAt.slice(0, 10)}.${format}`;
  window.document.body.append(link);
  try { link.click(); } finally {
    link.remove();
    // Allow the browser to start the download before releasing its object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
