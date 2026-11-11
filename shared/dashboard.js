import { STATUSES, filterApplications } from './domain.js';

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Calendar arithmetic in local time, including DST/month/year changes.
export function snoozeDate(days, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 12);
  return localDate(date);
}

export function isFollowUpDue(item, now = new Date()) {
  return !item.archived && Boolean(item.followUpAt) && item.followUpAt <= localDate(now);
}

export function dueApplications(applications, now = new Date()) {
  return applications.filter((item) => isFollowUpDue(item, now))
    .sort((a, b) => a.followUpAt.localeCompare(b.followUpAt) || a.id - b.id);
}

export function interviewAccess(applications) {
  const sent = applications.filter((item) => item.status !== STATUSES[0]);
  const reached = sent.filter((item) => [STATUSES[2], STATUSES[3]].includes(item.status)).length;
  return { sent: sent.length, reached, rate: sent.length ? Math.round(reached / sent.length * 100) : 0 };
}

export function selectApplications(applications, { archived = false, query = '', status = '', sort = 'desc', dueOnly = false } = {}, now = new Date()) {
  const scoped = applications.filter((item) => Boolean(item.archived) === archived && (!dueOnly || isFollowUpDue(item, now)));
  return filterApplications(scoped, { query, status, sort });
}

// Only actionable, unambiguous contact values become links. Free text remains visible.
export function contactHref(contact) {
  const text = contact.trim();
  if (/^[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+$/.test(text)) return `mailto:${encodeURIComponent(text)}`;
  if (/^\+?[\d ().-]+$/.test(text) && text.replace(/\D/g, '').length >= 6) return `tel:${text.replace(/[^\d+]/g, '')}`;
  return null;
}
