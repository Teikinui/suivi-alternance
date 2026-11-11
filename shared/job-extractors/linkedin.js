// Best effort against the currently open page only. No request, login bypass or scrolling.
export function extractLinkedIn(document, currentUrl = '') {
  let url;
  try {
    url = new URL(currentUrl);
    if (!['http:', 'https:'].includes(url.protocol) || !(url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com'))) return null;
  } catch { return null; }
  const text = (selector) => document.querySelector(selector)?.textContent.replace(/\s+/g, ' ').trim() || '';
  const position = text('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .top-card-layout__title, h1.topcard__title, h1');
  const company = text('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .topcard__org-name-link, .top-card-layout__first-subline a, .top-card-layout__second-subline a');
  if (!position && !company) return null;
  const location = text('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .topcard__flavor--bullet, .top-card-layout__first-subline .topcard__flavor:not(.topcard__flavor--link)');
  const salary = text('.compensation__salary, .salary-range');
  const description = text('.jobs-description__content, .jobs-box__html-content, .show-more-less-html__markup');
  const selectedId = url.searchParams.get('currentJobId');
  if (selectedId && /^\d+$/.test(selectedId)) { url.pathname = `/jobs/view/${selectedId}/`; url.search = ''; }
  for (const key of ['refId', 'trackingId', 'trk', 'midToken', 'midSig']) url.searchParams.delete(key);
  return {
    company: company.slice(0, 160), position: position.slice(0, 160), location: location.slice(0, 200), salary: salary.slice(0, 120),
    url: url.href, notes: description ? `Offre LinkedIn : ${description.slice(0, 500)}${description.length > 500 ? '…' : ''}` : 'Importé depuis LinkedIn.', source: 'linkedin',
  };
}
