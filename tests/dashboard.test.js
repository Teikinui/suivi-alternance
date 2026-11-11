import { describe, it, expect } from 'vitest';
import { EMPTY_APPLICATION, STATUSES } from '../shared/domain.js';
import { localDate, snoozeDate, isFollowUpDue, dueApplications, interviewAccess, selectApplications, contactHref } from '../shared/dashboard.js';
import { csvCell, toCsv, exportDocument, EXPORT_FIELDS } from '../src/export.js';

const now = new Date(2026, 2, 28, 23, 45);
const row = (id, changes = {}) => ({ ...EMPTY_APPLICATION, id, company: `Entreprise ${id}`, position: 'Dev', archived: false, ...changes });
const rows = [
  row(1, { followUpAt: '2026-03-28', status: STATUSES[1] }),
  row(2, { followUpAt: '2026-03-25', status: STATUSES[2] }),
  row(3, { followUpAt: '2026-03-29', status: STATUSES[3] }),
  row(4, { followUpAt: '2026-03-20', archived: true, status: STATUSES[4] }),
  row(5),
];

describe('action center dates and scoping', () => {
  it('uses the local calendar date, never the UTC date', () => {
    expect(localDate(now)).toBe('2026-03-28');
  });
  it.each([[2, '2026-03-30'], [7, '2026-04-04']])('snoozes %i days from today, not an old due date', (days, expected) => {
    expect(snoozeDate(days, now)).toBe(expected);
  });
  it('crosses year boundaries correctly', () => {
    expect(snoozeDate(2, new Date(2026, 11, 31, 23, 59))).toBe('2027-01-02');
  });
  it('includes today/overdue active records only, earliest due first', () => {
    expect(dueApplications(rows, now).map((item) => item.id)).toEqual([2, 1]);
    expect(isFollowUpDue(rows[3], now)).toBe(false);
    expect(isFollowUpDue(rows[4], now)).toBe(false);
  });
  it('combines due filter, status and search without changing the source array', () => {
    expect(selectApplications(rows, { dueOnly: true, status: STATUSES[2], query: 'ENTREPRISE' }, now).map((item) => item.id)).toEqual([2]);
    expect(selectApplications(rows, { archived: true }, now).map((item) => item.id)).toEqual([4]);
    expect(rows.map((item) => item.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('interview access metric', () => {
  it('counts interview OR offer once among sent applications, not drafts', () => {
    const items = STATUSES.map((status, index) => row(index, { status }));
    expect(interviewAccess(items)).toEqual({ sent: 4, reached: 2, rate: 50 });
    expect(interviewAccess([row(1, { status: STATUSES[3] })])).toEqual({ sent: 1, reached: 1, rate: 100 });
  });
  it('returns zero for no sent applications and never uses updatedAt as a response event', () => {
    expect(interviewAccess([])).toEqual({ sent: 0, reached: 0, rate: 0 });
    expect(interviewAccess([row(1, { updatedAt: '2099-01-01' })])).toEqual({ sent: 0, reached: 0, rate: 0 });
  });
});

describe('contact links', () => {
  it.each([
    ['rh@example.com', 'mailto:rh%40example.com'],
    [' +33 6 12 34 56 78 ', 'tel:+33612345678'],
    ['Camille RH', null], ['javascript:alert(1)', null], ['a@example.com?subject=bad', null], ['', null],
  ])('converts only unambiguous contact %j', (contact, expected) => {
    expect(contactHref(contact)).toBe(expected);
  });
});

describe('client exports', () => {
  it('exports the filtered active set only and declares its filters', () => {
    const document = exportDocument(rows, { dueOnly: true, query: 'Entreprise', status: STATUSES[2] }, now);
    expect(document.applications.map((item) => item.id)).toEqual([2]);
    expect(document.scope).toMatchObject({ archived: false, selection: 'filtered', filters: { dueOnly: true, status: STATUSES[2] } });
    expect(Object.keys(document.applications[0])).toEqual(EXPORT_FIELDS);
    expect(document.exportedAt).toBe(now.toISOString());
  });
  it('all-tab export ignores search/status/due filters but never leaks the other archive scope', () => {
    expect(exportDocument(rows, { selection: 'tab', query: 'absent', dueOnly: true }, now).applications).toHaveLength(4);
    const archived = exportDocument(rows, { archived: true, selection: 'tab', query: 'absent' }, now);
    expect(archived.applications.map((item) => item.id)).toEqual([4]);
    expect(archived.scope.filters).toBeNull();
    expect(exportDocument(rows, { archived: true, dueOnly: true }, now).applications).toHaveLength(1);
  });
  it('JSON preserves exact values, unicode, newlines and formula-like notes', () => {
    const item = row(9, { company: 'Acme, "Paris"', notes: '=SUM(1,2)\nRéponse\r\n日本語' });
    const document = exportDocument([item], {}, now);
    expect(JSON.parse(JSON.stringify(document)).applications[0].notes).toBe(item.notes);
    expect(document.schemaVersion).toBe(1);
  });
  it('CSV escapes commas, quotes, LF/CRLF, preserves UTF-8 and declares all fields even when empty', () => {
    const csv = toCsv(exportDocument([row(9, { company: 'Acme, "Paris"', notes: 'Ligne 1\nLigne 2\r\nÉté' })], {}, now));
    expect(csv.startsWith('\uFEFF"id","company"')).toBe(true);
    expect(csv).toContain('"Acme, ""Paris"""');
    expect(csv).toContain('"Ligne 1\nLigne 2\r\nÉté"');
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(toCsv(exportDocument([], {}, now))).toBe('\uFEFF' + EXPORT_FIELDS.map(csvCell).join(',') + '\r\n');
  });
  it.each(['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1', '\n=1+1', '\rDANGER'])('neutralizes spreadsheet formula prefixes in %j', (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it('does not mutate records or include unknown server fields', () => {
    const item = row(3, { privateUnknown: 'not exported', notes: '=1+1' });
    const document = exportDocument([item], {}, now);
    toCsv(document);
    expect(item.notes).toBe('=1+1');
    expect(document.applications[0]).not.toHaveProperty('privateUnknown');
    expect(() => exportDocument(rows, { selection: 'unknown' })).toThrow();
  });
});
