import { A11yCrawler } from '../crawler';

// Private methods are erased by TypeScript at compile time — they're plain
// properties in the emitted JS.  Casting to `any` lets us call them directly
// without exposing them in the public API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const crawler = new A11yCrawler() as any;

// ─────────────────────────────────────────────────────────
// normalizeUrl
// ─────────────────────────────────────────────────────────
describe('normalizeUrl', () => {
  it('lowercases the hostname', () => {
    expect(crawler.normalizeUrl('https://EXAMPLE.COM/page')).toBe('https://example.com/page');
  });

  it('strips hash fragments', () => {
    expect(crawler.normalizeUrl('https://example.com/page#section')).toBe(
      'https://example.com/page',
    );
  });

  it('removes a trailing slash on non-root paths', () => {
    expect(crawler.normalizeUrl('https://example.com/about/')).toBe('https://example.com/about');
  });

  it('preserves the root slash', () => {
    // "https://example.com/" must stay as-is — stripping it changes the URL.
    expect(crawler.normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('preserves query parameters', () => {
    expect(crawler.normalizeUrl('https://example.com/search?q=hello')).toBe(
      'https://example.com/search?q=hello',
    );
  });

  it('strips hash but keeps query parameters', () => {
    expect(crawler.normalizeUrl('https://example.com/page?q=1#top')).toBe(
      'https://example.com/page?q=1',
    );
  });

  it('returns an empty string for a malformed URL', () => {
    expect(crawler.normalizeUrl('not a url')).toBe('');
  });

  it('returns an empty string for an empty string', () => {
    expect(crawler.normalizeUrl('')).toBe('');
  });

  it('strips utm_source parameter', () => {
    expect(crawler.normalizeUrl('https://example.com/page?utm_source=newsletter')).toBe(
      'https://example.com/page',
    );
  });

  it('strips utm_medium parameter', () => {
    expect(crawler.normalizeUrl('https://example.com/page?utm_medium=email')).toBe(
      'https://example.com/page',
    );
  });

  it('strips utm_campaign parameter', () => {
    expect(crawler.normalizeUrl('https://example.com/page?utm_campaign=spring_sale')).toBe(
      'https://example.com/page',
    );
  });

  it('strips all utm parameters while preserving other query parameters', () => {
    expect(
      crawler.normalizeUrl(
        'https://example.com/page?q=hello&utm_source=google&utm_medium=cpc&utm_campaign=launch',
      ),
    ).toBe('https://example.com/page?q=hello');
  });
});

// ─────────────────────────────────────────────────────────
// isInternalUrl
// ─────────────────────────────────────────────────────────
describe('isInternalUrl', () => {
  const base = 'https://example.com';

  it('returns true for a URL on the same domain', () => {
    expect(crawler.isInternalUrl('https://example.com/about', base)).toBe(true);
  });

  it('returns true for the root URL itself', () => {
    expect(crawler.isInternalUrl('https://example.com/', base)).toBe(true);
  });

  it('returns false for a different domain', () => {
    expect(crawler.isInternalUrl('https://other.com/page', base)).toBe(false);
  });

  it('returns false for a subdomain (treated as external)', () => {
    // ADR-003: we do not follow subdomains — the audit scope is the exact hostname.
    expect(crawler.isInternalUrl('https://docs.example.com/page', base)).toBe(false);
  });

  it('returns false for a mailto: link', () => {
    expect(crawler.isInternalUrl('mailto:user@example.com', base)).toBe(false);
  });

  it('returns false for a tel: link', () => {
    expect(crawler.isInternalUrl('tel:+15551234567', base)).toBe(false);
  });

  it('returns false for a javascript: link', () => {
    expect(crawler.isInternalUrl('javascript:void(0)', base)).toBe(false);
  });

  it('returns false for a malformed URL', () => {
    expect(crawler.isInternalUrl('not a url', base)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(crawler.isInternalUrl('', base)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
// deduplicateUrls
// ─────────────────────────────────────────────────────────
describe('deduplicateUrls', () => {
  it('returns an empty array for empty input', () => {
    expect(crawler.deduplicateUrls([])).toEqual([]);
  });

  it('deduplicates exact duplicates', () => {
    const input = ['https://example.com/a', 'https://example.com/a'];
    expect(crawler.deduplicateUrls(input)).toEqual(['https://example.com/a']);
  });

  it('deduplicates URLs that differ only by trailing slash', () => {
    const input = ['https://example.com/about/', 'https://example.com/about'];
    expect(crawler.deduplicateUrls(input)).toEqual(['https://example.com/about']);
  });

  it('deduplicates URLs that differ only by hash fragment', () => {
    const input = ['https://example.com/page#hero', 'https://example.com/page'];
    expect(crawler.deduplicateUrls(input)).toEqual(['https://example.com/page']);
  });

  it('treats different paths as distinct URLs', () => {
    const input = ['https://example.com/a', 'https://example.com/b'];
    expect(crawler.deduplicateUrls(input)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });

  it('treats different domains as distinct URLs', () => {
    const input = ['https://example.com/page', 'https://other.com/page'];
    expect(crawler.deduplicateUrls(input)).toEqual([
      'https://example.com/page',
      'https://other.com/page',
    ]);
  });

  it('silently drops malformed URLs', () => {
    const input = ['https://example.com/valid', 'not a url', ''];
    expect(crawler.deduplicateUrls(input)).toEqual(['https://example.com/valid']);
  });

  it('preserves first-seen order', () => {
    const input = [
      'https://example.com/c',
      'https://example.com/a',
      'https://example.com/b',
      'https://example.com/a', // duplicate of index 1
    ];
    expect(crawler.deduplicateUrls(input)).toEqual([
      'https://example.com/c',
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });
});
