// Self-contained function: also embedded verbatim in the universal bookmarklet.
export function extractSchemaOrg(document, currentUrl = '') {
  function text(value) {
    if (typeof value !== 'string') return '';
    const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => entities[entity.toLowerCase()])
      .replace(/\s+/g, ' ').trim();
  }
  function salary(value) {
    if (typeof value === 'string') return text(value);
    if (!value || typeof value !== 'object') return '';
    const currency = text(value.currency);
    const amount = value.value;
    const number = (n) => typeof n === 'number' && Number.isFinite(n) ? String(n) : '';
    if (typeof amount === 'number') return `${number(amount)} ${currency}`.trim();
    if (!amount || typeof amount !== 'object') return '';
    const min = number(amount.minValue), max = number(amount.maxValue), exact = number(amount.value);
    const unit = text(amount.unitText).toLowerCase();
    const range = min && max ? `${min}–${max}` : min ? `À partir de ${min}` : max ? `Jusqu'à ${max}` : exact;
    return range ? `${range}${currency ? ` ${currency}` : ''}${unit ? ` / ${unit}` : ''}` : '';
  }
  function location(entity) {
    const places = Array.isArray(entity.jobLocation) ? entity.jobLocation : [entity.jobLocation];
    const parts = [];
    for (const place of places) {
      if (!place || typeof place !== 'object') continue;
      const address = place.address;
      if (typeof address === 'string') parts.push(text(address));
      else if (address && typeof address === 'object') {
        const country = typeof address.addressCountry === 'object' ? address.addressCountry?.name : address.addressCountry;
        parts.push([address.addressLocality, address.addressRegion, country].map(text).filter(Boolean).join(', '));
      }
    }
    if ([entity.jobLocationType].flat().includes('TELECOMMUTE')) parts.push('Télétravail');
    return [...new Set(parts.filter(Boolean))].join(' · ');
  }
  const candidates = [];
  let visited = 0;
  function visit(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 8 || ++visited > 300) return;
    if (Array.isArray(value)) { for (const item of value.slice(0, 100)) visit(item, depth + 1); return; }
    const types = [value['@type']].flat();
    if (types.some((type) => typeof type === 'string' && /(?:^|[/#])JobPosting$/.test(type))) candidates.push(value);
    for (const key of ['@graph', 'mainEntity', 'itemListElement', 'item']) visit(value[key], depth + 1);
  }
  for (const script of [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 30)) {
    try { if (script.textContent.length <= 1000000) visit(JSON.parse(script.textContent)); } catch { /* Malformed metadata is not executable code. */ }
  }
  function matching(entity) {
    try { return new URL(entity.url, currentUrl).href === new URL(currentUrl).href; } catch { return false; }
  }
  candidates.sort((a, b) => Number(matching(b)) - Number(matching(a)));
  for (const entity of candidates) {
    const organization = Array.isArray(entity.hiringOrganization) ? entity.hiringOrganization[0] : entity.hiringOrganization;
    const company = text(typeof organization === 'string' ? organization : organization?.name);
    const position = text(entity.title) || text(entity.name);
    if (!company && !position) continue;
    const description = text(entity.description);
    return {
      company: company.slice(0, 160), position: position.slice(0, 160),
      location: location(entity).slice(0, 200), salary: salary(entity.baseSalary).slice(0, 120),
      url: typeof entity.url === 'string' ? entity.url : currentUrl,
      notes: description ? `Description : ${description.slice(0, 500)}${description.length > 500 ? '…' : ''}` : '',
      source: 'schema.org',
    };
  }
  return null;
}
