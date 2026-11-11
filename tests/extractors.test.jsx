import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { extractSchemaOrg } from '../shared/job-extractors/schema-org.js';
import { extractLinkedIn } from '../shared/job-extractors/linkedin.js';
import { extractMetadata } from '../shared/job-extractors/metadata.js';
import {
  extractJobOffer,
  parsePrefillParams,
  generateBookmarkletCode,
  parseImportFragment,
  validateImportedOffer,
  validateTargetOrigin,
  clearImportLocation,
} from '../shared/job-extractors/index.js';

describe('Job Extractors', () => {
  describe('Schema.org JSON-LD Extractor', () => {
    it('extracts structured JobPosting from valid JSON-LD script', () => {
      const doc = document.implementation.createHTMLDocument();
      const script = doc.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: 'Développeur Full-Stack React / Node',
        hiringOrganization: {
          '@type': 'Organization',
          name: 'Tech Horizon',
        },
        jobLocation: {
          address: {
            addressLocality: 'Lyon',
            addressRegion: 'Auvergne-Rhône-Alpes',
          },
        },
        jobLocationType: 'TELECOMMUTE',
        baseSalary: {
          currency: 'EUR',
          value: {
            minValue: 45000,
            maxValue: 52000,
            unitText: 'YEAR',
          },
        },
        description: '<p>Rejoignez notre équipe agile pour concevoir des applications web modernes.</p>',
        url: 'https://example.com/jobs/dev-123',
      });
      doc.head.appendChild(script);

      const result = extractSchemaOrg(doc, 'https://example.com/jobs/dev-123');
      expect(result).toEqual({
        company: 'Tech Horizon',
        position: 'Développeur Full-Stack React / Node',
        location: 'Lyon, Auvergne-Rhône-Alpes · Télétravail',
        salary: '45000–52000 EUR / year',
        url: 'https://example.com/jobs/dev-123',
        notes: 'Description : Rejoignez notre équipe agile pour concevoir des applications web modernes.',
        source: 'schema.org',
      });
    });

    it('handles nested @graph schema structures', () => {
      const doc = document.implementation.createHTMLDocument();
      const script = doc.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'BreadcrumbList' },
          {
            '@type': 'JobPosting',
            title: 'Lead SRE',
            hiringOrganization: 'Cloud Corp',
          },
        ],
      });
      doc.head.appendChild(script);

      const result = extractSchemaOrg(doc);
      expect(result).toMatchObject({
        company: 'Cloud Corp',
        position: 'Lead SRE',
      });
    });

    it('returns null if no JobPosting script exists', () => {
      const doc = document.implementation.createHTMLDocument();
      expect(extractSchemaOrg(doc)).toBeNull();
    });
  });

  describe('LinkedIn DOM Extractor', () => {
    it('extracts job details from standard LinkedIn DOM layout', () => {
      const doc = document.implementation.createHTMLDocument();
      doc.body.innerHTML = `
        <div class="job-details-jobs-unified-top-card__content--two-pane">
          <h1 class="job-details-jobs-unified-top-card__job-title">Ingénieur Cloud DevOps</h1>
          <div class="job-details-jobs-unified-top-card__company-name">
            <a href="/company/dataflow">DataFlow Systems</a>
          </div>
          <span class="job-details-jobs-unified-top-card__bullet">Paris, Île-de-France (Hybride)</span>
          <div class="jobs-description__content">
            <p>Concevoir et maintenir nos clusters Kubernetes et pipelines CI/CD.</p>
          </div>
        </div>
      `;

      const result = extractLinkedIn(doc, 'https://www.linkedin.com/jobs/view/123456789/?trackingId=abc&refId=xyz');
      expect(result).toEqual({
        company: 'DataFlow Systems',
        position: 'Ingénieur Cloud DevOps',
        location: 'Paris, Île-de-France (Hybride)',
        salary: '',
        url: 'https://www.linkedin.com/jobs/view/123456789/',
        notes: 'Offre LinkedIn : Concevoir et maintenir nos clusters Kubernetes et pipelines CI/CD.',
        source: 'linkedin',
      });
    });

    it('returns null if essential job selectors are absent', () => {
      const doc = document.implementation.createHTMLDocument();
      doc.body.innerHTML = '<div>Feed principal sans offre</div>';
      expect(extractLinkedIn(doc)).toBeNull();
    });
  });

  describe('Metadata Fallback Extractor', () => {
    it('extracts title and company from pattern-based meta titles', () => {
      const doc = document.implementation.createHTMLDocument();
      const metaTitle = doc.createElement('meta');
      metaTitle.setAttribute('property', 'og:title');
      metaTitle.setAttribute('content', 'Designer Produit UI/UX chez Atelier Studio');
      doc.head.appendChild(metaTitle);

      const metaDesc = doc.createElement('meta');
      metaDesc.setAttribute('property', 'og:description');
      metaDesc.setAttribute('content', 'Recherche un designer talentueux pour notre studio.');
      doc.head.appendChild(metaDesc);

      const result = extractMetadata(doc, 'https://example.com/job/456');
      expect(result).toMatchObject({
        position: 'Designer Produit UI/UX',
        company: 'Atelier Studio',
        url: 'https://example.com/job/456',
        source: 'metadata',
      });
    });
  });

  describe('Universal Pipeline and Dispatcher', () => {
    it('prioritizes Schema.org over metadata', () => {
      const doc = document.implementation.createHTMLDocument();

      // Meta
      const meta = doc.createElement('meta');
      meta.setAttribute('property', 'og:title');
      meta.setAttribute('content', 'Meta Position - Meta Company');
      doc.head.appendChild(meta);

      // Schema
      const script = doc.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@type': 'JobPosting',
        title: 'Schema Position',
        hiringOrganization: 'Schema Company',
      });
      doc.head.appendChild(script);

      const result = extractJobOffer(doc, 'https://example.com/test');
      expect(result.company).toBe('Schema Company');
      expect(result.position).toBe('Schema Position');
      expect(result.status).toBe('À postuler'); // Initial draft status
    });
  });

  describe('Prefill URL Parameter Parsing', () => {
    it('parses valid prefill query parameters and enforces status À postuler', () => {
      const search = '?prefill=1&company=Studio+Acme&position=Dev&url=https%3A%2F%2Fexample.com&location=Paris&salary=45k';
      const parsed = parsePrefillParams(search);
      expect(parsed).toEqual({
        company: 'Studio Acme',
        position: 'Dev',
        url: 'https://example.com',
        location: 'Paris',
        salary: '45k',
        notes: '',
        status: 'À postuler',
      });
    });

    it('accepts import=1 as alternative query parameter', () => {
      const search = '?import=1&company=Alternative&position=Designer';
      const parsed = parsePrefillParams(search);
      expect(parsed).toMatchObject({
        company: 'Alternative',
        position: 'Designer',
        status: 'À postuler',
      });
    });

    it('rejects parameters when prefill flag is missing or no identifying info is present', () => {
      expect(parsePrefillParams('?company=OnlyCompany')).toBeNull();
      expect(() => parsePrefillParams('?prefill=1')).toThrow(/vide/);
      expect(parsePrefillParams('')).toBeNull();
      expect(parsePrefillParams(null)).toBeNull();
    });
  });

  describe('Bookmarklet Code Generation', () => {
    it('generates a valid javascript: URL pointing to target host', () => {
      const code = generateBookmarkletCode('http://127.0.0.1:3000');
      expect(code.startsWith('javascript:')).toBe(true);
      const script = decodeURIComponent(code.slice('javascript:'.length));
      expect(script.startsWith('void (')).toBe(true);
      expect(script).toContain('http://127.0.0.1:3000');
      expect(script).toContain('#job-import=');
      expect(code).not.toContain('\n'); // URI-encoded, including line breaks and comments
    });
  });
});

const fixture = (name) => new DOMParser().parseFromString(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'jobs', name), 'utf8'), 'text/html');
const fragment = (offer, extra = {}) => '#job-import=' + encodeURIComponent(JSON.stringify({ version: 1, source: 'web', offer, ...extra }));

describe('import security and modular bookmarklet parity', () => {
  it.each([
    ['schema.html', 'https://careers.example.test/page', 'Atelier & Horizon', 'Ingénieur·e logiciel', 'schema.org'],
    ['linkedin.html', 'https://www.linkedin.com/jobs/search/?currentJobId=123&trackingId=abc', 'DataFlow Systems', 'Ingénieur Cloud DevOps', 'linkedin'],
    ['generic.html', 'https://jobs.example.test/page', 'Studio Nova', 'Designer produit', 'metadata'],
  ])('executes the actual generated bookmarklet on %s with the same results as the modules', (file, url, company, position, source) => {
    const doc = fixture(file);
    const expected = extractJobOffer(doc, url);
    expect(expected).toMatchObject({ company, position, source, status: 'À postuler' });
    const target = 'http://localhost:3000';
    const code = generateBookmarkletCode(target);
    const browser = { location: { href: url }, open: vi.fn(), alert: vi.fn() };
    // Test-only execution on local fixtures, not eval of untrusted imported data.
    new Function('window', 'document', decodeURIComponent(code.slice('javascript:'.length)))(browser, doc);
    expect(browser.alert).not.toHaveBeenCalled();
    expect(browser.open).toHaveBeenCalledOnce();
    const [destination, name, features] = browser.open.mock.calls[0];
    expect(name).toBe('_blank');
    expect(features).toBe('noopener,noreferrer');
    const opened = new URL(destination);
    expect(opened.search).toBe('');
    const draft = parseImportFragment(opened.hash);
    expect(draft).toMatchObject({ company, position, importSource: source, status: 'À postuler' });
    expect(draft.url).not.toContain('utm_');
    expect(draft.url).not.toContain('trackingId');
    if (source === 'linkedin') expect(draft.url).toBe('https://www.linkedin.com/jobs/view/123/');
    if (source === 'schema.org') expect(draft.url).toBe('https://careers.example.test/offres/42?jobId=42');
  });

  it('does not overwrite nonempty schema fields with lower-priority partial metadata', () => {
    const doc = fixture('generic.html');
    const script = doc.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@type': 'JobPosting', title: 'Titre structuré' });
    doc.head.append(script);
    expect(extractJobOffer(doc, 'https://jobs.example.test')).toMatchObject({ position: 'Titre structuré', company: 'Studio Nova', source: 'schema.org' });
  });
  it('matches the actual LinkedIn hostname, not a substring in another URL', () => {
    const doc = fixture('linkedin.html');
    expect(extractLinkedIn(doc, 'https://linkedin.com.evil.test/?site=linkedin.com')).toBeNull();
    expect(extractLinkedIn(doc, 'https://evil.test/linkedin.com')).toBeNull();
    expect(extractJobOffer(doc, 'https://evil.test/linkedin.com').source).toBe('metadata');
  });
  it('falls back from malformed or hostile schema values and unsafe canonical URLs', () => {
    const doc = fixture('generic.html');
    doc.querySelector('link').setAttribute('href', 'javascript:alert(1)');
    const script = doc.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@graph': [null, 3, { '@type': 'JobPosting', title: {}, hiringOrganization: null, jobLocation: [null], baseSalary: { value: { unitText: {} } } }] });
    doc.head.append(script);
    expect(extractJobOffer(doc, 'https://jobs.example.test?jobId=42&utm_source=test')).toMatchObject({ company: 'Studio Nova', url: 'https://jobs.example.test/?jobId=42' });
    expect(extractJobOffer(doc, 'file:///private.txt')).toBeNull();
  });
  it('allows link-only partial drafts but no unknown database fields', () => {
    expect(validateImportedOffer({ url: 'https://example.com/job?id=2' })).toMatchObject({ company: '', position: '', status: 'À postuler' });
    for (const key of ['id', 'archived', 'status', 'appliedAt', 'createdAt', '__proto__']) {
      const raw = JSON.parse(`{"position":"Dev","${key}":"injected"}`);
      expect(() => validateImportedOffer(raw)).toThrow();
    }
  });
  it.each(['javascript:alert(1)', 'data:text/html,bad', 'file:///etc/passwd', 'ftp://example.com', 'https://user:password@example.com/job', 'not a URL', 'https://example.com/\njob'])('rejects unsafe imported URL %j', (url) => {
    expect(() => parseImportFragment(fragment({ company: 'A', url }))).toThrow();
    expect(() => parsePrefillParams(new URLSearchParams({ prefill: '1', position: 'Dev', url }))).toThrow();
  });
  it('rejects wrong types, excessive fields/payloads, unsupported versions and malformed encoding', () => {
    for (const raw of [null, [], { company: 42 }, { company: null }, { company: 'A'.repeat(161) }, { company: 'A', notes: 'x'.repeat(10001) }, { company: 'A\u0000B' }]) expect(() => validateImportedOffer(raw)).toThrow();
    expect(() => parseImportFragment(fragment({ position: 'Dev' }, { version: 2 }))).toThrow();
    expect(() => parseImportFragment(fragment({ position: 'Dev' }, { source: 'untrusted' }))).toThrow();
    expect(() => parseImportFragment('#job-import=%ZZ')).toThrow();
    expect(() => parseImportFragment('#job-import=' + 'x'.repeat(65000))).toThrow();
    expect(parseImportFragment('#other')).toBeNull();
  });
  it('enforces draft status on legacy links and clears only import-related URL data', () => {
    const params = new URLSearchParams({ prefill: '1', company: 'Studio', status: 'Offre reçue', id: '123' });
    expect(parsePrefillParams(params)).toMatchObject({ company: 'Studio', status: 'À postuler' });
    expect(() => parsePrefillParams('?prefill=1&company=A&company=B')).toThrow();
    expect(clearImportLocation(new URL('http://localhost:3000/?keep=1&prefill=1&company=Studio#tab'))).toBe('/?keep=1#tab');
    expect(clearImportLocation(new URL('http://localhost:3000/?keep=1' + fragment({ position: 'Dev' })))).toBe('/?keep=1');
  });
  it.each(['javascript:alert(1)', 'https://host.test/path', 'https://host.test/?x=1', 'https://user:pass@host.test', 'https://host.test/#x', 'invalid'])('refuses unsafe bookmarklet target %j', (target) => {
    expect(() => validateTargetOrigin(target)).toThrow();
    expect(() => generateBookmarkletCode(target)).toThrow();
  });
});
