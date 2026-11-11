// Generic fallback; title heuristics can be wrong and must be reviewed by the user.
export function extractMetadata(document, currentUrl = '') {
  const text = (value) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const meta = (selector) => text(document.querySelector(selector)?.getAttribute('content'));
  const title = meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || text(document.title) || text(document.querySelector('h1')?.textContent);
  let position = title, company = '';
  for (const separator of [' chez ', ' @ ', ' | ', ' - ', ' · ']) {
    const index = title.indexOf(separator);
    if (index > 0) { position = title.slice(0, index).trim(); company = title.slice(index + separator.length).trim(); break; }
  }
  if (!position && !company) return null;
  const description = meta('meta[property="og:description"]') || meta('meta[name="description"]');
  const url = text(document.querySelector('link[rel="canonical"]')?.getAttribute('href')) || meta('meta[property="og:url"]') || currentUrl;
  return {
    company: company.slice(0, 160), position: position.slice(0, 160), location: '', salary: '', url,
    notes: description ? `Description : ${description.slice(0, 500)}${description.length > 500 ? '…' : ''}` : '', source: 'metadata',
  };
}
