/**
 * Integration tests for A11yCrawler.
 *
 * These tests launch a real Chromium browser and a real local HTTP server so
 * they exercise the full crawl pipeline — navigation, link extraction, rate
 * limiting, 404 handling, and redirect following — without any mocking.
 *
 * Expected runtime: ~20-30 s (Playwright browser startup + networkidle waits).
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { A11yCrawler } from '../crawler';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

/**
 * Minimal static-file server for integration tests.
 *
 * Routes:
 *   /              → fixtures/index.html  (200)
 *   /page-a        → fixtures/page-a.html (200)
 *   /page-b        → fixtures/page-b.html (200)
 *   /redirect      → 301 → /page-a       (redirect)
 *   /missing       → 404
 *   anything else  → 404
 */
function createFixtureServer(): http.Server {
  const routes: Record<string, { file?: string; redirect?: string }> = {
    '/': { file: 'index.html' },
    '/page-a': { file: 'page-a.html' },
    '/page-b': { file: 'page-b.html' },
    '/redirect': { redirect: '/page-a' },
  };

  return http.createServer((req, res) => {
    const urlPath = req.url?.split('?')[0] ?? '/';
    const route = routes[urlPath];

    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    if (route.redirect) {
      res.writeHead(301, { Location: route.redirect });
      res.end();
      return;
    }

    if (route.file) {
      const filePath = path.join(FIXTURES_DIR, route.file);
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    }
  });
}

describe('A11yCrawler integration', () => {
  let server: http.Server;
  let baseUrl: string;
  let crawler: A11yCrawler;

  beforeAll(async () => {
    server = createFixtureServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    crawler = new A11yCrawler();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it('depth=0 returns only the root URL', async () => {
    const urls = await crawler.crawl(baseUrl, 0, { requestDelayMs: 0 });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe(`${baseUrl}/`);
  }, 30_000);

  it('depth=1 returns root plus all reachable internal pages', async () => {
    const urls = await crawler.crawl(baseUrl, 1, { requestDelayMs: 0 });
    const sorted = [...urls].sort();

    // Root, page-a, and page-b should all be present
    expect(sorted).toContain(`${baseUrl}/`);
    expect(sorted).toContain(`${baseUrl}/page-a`);
    expect(sorted).toContain(`${baseUrl}/page-b`);

    // /missing returns 404 — must be excluded
    expect(sorted).not.toContain(`${baseUrl}/missing`);

    // External URL must not be followed
    expect(sorted.every((u) => u.startsWith(baseUrl))).toBe(true);
  }, 30_000);

  it('excludes 404 pages from results', async () => {
    // depth=1 from root — /missing is linked from index but returns 404
    const urls = await crawler.crawl(baseUrl, 1, { requestDelayMs: 0 });
    expect(urls).not.toContain(`${baseUrl}/missing`);
  }, 30_000);

  it('follows redirects and records the final URL', async () => {
    // Crawl /redirect directly (depth=0) — server sends 301 → /page-a
    const urls = await crawler.crawl(`${baseUrl}/redirect`, 0, { requestDelayMs: 0 });
    // The result should be the final URL after the redirect, not the original
    expect(urls).toContain(`${baseUrl}/page-a`);
    expect(urls).not.toContain(`${baseUrl}/redirect`);
  }, 30_000);

  it('accepts a custom requestDelayMs option', async () => {
    // Smoke-test that the option is accepted and crawl still completes.
    const urls = await crawler.crawl(baseUrl, 0, { requestDelayMs: 50 });
    expect(urls).toHaveLength(1);
  }, 30_000);
});
