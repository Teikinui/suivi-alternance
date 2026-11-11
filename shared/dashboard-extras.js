import { STATUSES } from './domain.js';

export const STORAGE_KEYS = {
  WEEKLY_GOAL: 'candidatures_weekly_goal',
  CHECKLIST: 'candidatures_interview_checklist',
};

export const DEFAULT_WEEKLY_GOAL = 5;

export const DEFAULT_CHECKLIST = [
  { id: 'review_offer', text: 'Relire l’offre et identifier les compétences clés' },
  { id: 'research_company', text: 'Explorer le site et l’actualité de l’entreprise' },
  { id: 'prepare_pitch', text: 'Préparer son pitch de présentation (1–2 min)' },
  { id: 'questions_recruiter', text: 'Préparer 3 questions pertinentes pour le recruteur' },
  { id: 'test_logistics', text: 'Vérifier la logistique (trajet ou micro / caméra)' },
];

export const VALID_CHECKLIST_IDS = new Set(DEFAULT_CHECKLIST.map((item) => item.id));

/**
 * Validates and sanitizes a stored weekly goal value.
 * Must be an integer between 1 and 50 inclusive.
 */
export function sanitizeGoal(raw) {
  const num = Number(raw);
  if (Number.isInteger(num) && num >= 1 && num <= 50) return num;
  return DEFAULT_WEEKLY_GOAL;
}

/**
 * Filters out unknown or stale checklist IDs from storage.
 */
export function sanitizeChecklist(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id) => typeof id === 'string' && VALID_CHECKLIST_IDS.has(id));
}

/**
 * Computes Monday at 00:00:00 of the current week in local calendar time.
 */
export function currentMonday(now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday is 0, Sunday is 6
  date.setDate(date.getDate() - diff);
  return date;
}

/**
 * Counts applications submitted during the current calendar week (Monday to Sunday).
 * Adheres to the specified archive scope (defaults to active applications).
 */
export function weeklySentCount(applications, { now = new Date(), archived = false } = {}) {
  const monday = currentMonday(now);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  return applications.filter((item) => {
    if (Boolean(item.archived) !== archived) return false;
    if (item.status === STATUSES[0]) return false;
    if (!item.appliedAt) return false;

    const date = new Date(`${item.appliedAt}T00:00:00`);
    return date >= monday && date < nextMonday && date <= now;
  }).length;
}

/**
 * Safely extracts a clean domain name from an HTTP(S) URL string (stripping 'www.').
 * Returns null if the URL is invalid, empty, or uses non-HTTP(S) protocols.
 */
export function extractDomain(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Aggregates frequency of offer domains from the provided applications.
 * Sorted by count descending, then alphabetically.
 */
export function domainDistribution(applications) {
  const counts = new Map();
  for (const item of applications) {
    const domain = extractDomain(item.url);
    if (domain) {
      counts.set(domain, (counts.get(domain) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

/**
 * Calculates current active or archived status funnel stages.
 * Represents current status snapshot, not an event-based historical conversion log.
 */
export function statusFunnel(applications, { archived = false } = {}) {
  const scoped = applications.filter((item) => Boolean(item.archived) === archived);
  const sent = scoped.filter((item) => item.status !== STATUSES[0]);
  const interviews = sent.filter((item) => [STATUSES[2], STATUSES[3]].includes(item.status));
  const offers = sent.filter((item) => item.status === STATUSES[3]);

  const totalSent = sent.length;

  return [
    {
      id: 'sent',
      statusClass: 'status-1',
      label: 'Candidatures envoyées',
      count: totalSent,
      rate: totalSent > 0 ? 100 : 0,
    },
    {
      id: 'interviews',
      statusClass: 'status-2',
      label: 'Entretiens prévus ou offres',
      count: interviews.length,
      rate: totalSent > 0 ? Math.round((interviews.length / totalSent) * 100) : 0,
    },
    {
      id: 'offers',
      statusClass: 'status-3',
      label: 'Offres reçues',
      count: offers.length,
      rate: totalSent > 0 ? Math.round((offers.length / totalSent) * 100) : 0,
    },
  ];
}
