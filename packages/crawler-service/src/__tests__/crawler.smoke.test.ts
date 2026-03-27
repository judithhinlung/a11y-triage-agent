/**
 * Smoke tests against real external sites.
 *
 * These tests are SKIPPED in CI and in the normal test run.  Run them
 * manually when you want to verify crawler behaviour against live sites:
 *
 *   npx jest crawler.smoke --testTimeout=120000
 *
 * Sites chosen:
 *   - Static HTML   : https://info.cern.ch  (the original CERN website — pure HTML, no JS)
 *   - React SPA     : https://react.dev     (official React docs, client-side routing)
 *   - Ember SPA     : https://emberjs.com   (official Ember site, Ember + Glimmer rendering)
 *
 * Assertions are intentionally loose — we only verify that the crawler
 * returns at least one URL and that every returned URL belongs to the
 * expected hostname.  We do not assert exact page counts because live
 * sites change structure over time.
 */

import { A11yCrawler } from '../crawler';

// depth=1 is enough to prove that link extraction works on each site type.
const DEPTH = 1;
// Use a polite rate limit so we do not hammer the sites.
const OPTS = { requestDelayMs: 1_000 };

describe.skip('smoke tests — real external sites', () => {
  let crawler: A11yCrawler;

  beforeAll(() => {
    crawler = new A11yCrawler();
  });

  test(
    'static HTML site: info.cern.ch',
    async () => {
      const urls = await crawler.crawl('http://info.cern.ch', DEPTH, OPTS);

      expect(urls.length).toBeGreaterThanOrEqual(1);
      expect(urls.every((u) => new URL(u).hostname === 'info.cern.ch')).toBe(true);
    },
    120_000,
  );

  test(
    'React SPA: react.dev',
    async () => {
      const urls = await crawler.crawl('https://react.dev', DEPTH, OPTS);

      expect(urls.length).toBeGreaterThan(1);
      expect(urls.every((u) => new URL(u).hostname === 'react.dev')).toBe(true);
    },
    120_000,
  );

  test(
    'Ember SPA: emberjs.com',
    async () => {
      const urls = await crawler.crawl('https://emberjs.com', DEPTH, OPTS);

      expect(urls.length).toBeGreaterThan(1);
      expect(urls.every((u) => new URL(u).hostname === 'emberjs.com')).toBe(true);
    },
    120_000,
  );
});
