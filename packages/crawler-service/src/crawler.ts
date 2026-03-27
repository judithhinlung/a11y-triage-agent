import { chromium, Browser, Page } from 'playwright';

/** Maximum pages visited in a single crawl to prevent runaway traversal. */
const MAX_PAGES = 50;

export interface CrawlOptions {
  /** Milliseconds to wait between page requests. Default: 1000 (1 req/s). */
  requestDelayMs?: number;
}

export class A11yCrawler {
  private browser: Browser | null = null;

  /**
   * Crawl `rootUrl` up to `depth` link-hops deep.
   *
   * depth=0 → only the root URL itself
   * depth=1 → root + every internal link found on the root page
   * depth=N → BFS up to N levels
   *
   * Returns the deduplicated list of internal URLs that were successfully
   * reached (2xx responses only), capped at MAX_PAGES.
   * 404s and other error responses are logged and excluded from results.
   * Redirects are followed automatically; the final URL is recorded.
   */
  async crawl(rootUrl: string, depth: number, options: CrawlOptions = {}): Promise<string[]> {
    const { requestDelayMs = 1_000 } = options;

    this.browser = await chromium.launch({ headless: true });

    const visited = new Set<string>(); // prevents re-queuing the same URL
    const results = new Set<string>(); // successfully loaded pages (2xx)
    const queue: Array<{ url: string; level: number }> = [
      { url: this.normalizeUrl(rootUrl), level: 0 },
    ];
    let requestCount = 0;

    try {
      while (queue.length > 0 && visited.size < MAX_PAGES) {
        const { url, level } = queue.shift()!;

        if (visited.has(url)) continue;
        visited.add(url);

        // Rate-limit: pause before every request except the first.
        if (requestCount > 0 && requestDelayMs > 0) {
          await this.sleep(requestDelayMs);
        }
        requestCount++;

        const page = await this.browser.newPage();
        try {
          const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          });

          const status = response?.status() ?? 0;

          if (status === 404) {
            console.warn(`[crawler] 404 — skipping ${url}`);
          } else if (status >= 400) {
            console.warn(`[crawler] HTTP ${status} — skipping ${url}`);
          } else {
            await this.waitForDomStability(page);

            // Determine effective URL after any server-side redirects.
            const finalUrl = this.normalizeUrl(page.url());
            const effectiveUrl =
              finalUrl && this.isInternalUrl(finalUrl, rootUrl) ? finalUrl : url;

            if (finalUrl && finalUrl !== url) {
              console.info(`[crawler] redirect ${url} → ${finalUrl}`);
            }

            results.add(effectiveUrl);

            if (level < depth) {
              const links = this.deduplicateUrls(await this.extractLinks(page, rootUrl));
              for (const link of links) {
                if (!visited.has(link) && visited.size + queue.length < MAX_PAGES) {
                  queue.push({ url: link, level: level + 1 });
                }
              }
            }
          }
        } catch (err) {
          console.error(`[crawler] failed to crawl ${url}:`, (err as Error).message);
        } finally {
          await page.close();
        }
      }
    } finally {
      await this.browser.close();
      this.browser = null;
    }

    return Array.from(results);
  }

  /**
   * Extract all unique, in-scope hrefs from the current page.
   * Handles both server-rendered `<a href>` tags and JS-injected anchors
   * because Playwright evaluates after the page has been rendered.
   */
  private async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    const anchors = page.locator('a[href]');
    const count = await anchors.count();

    const links: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await anchors.nth(i).getAttribute('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          links.push(absoluteUrl);
        } catch {
          // skip malformed hrefs
        }
      }
    }

    return links.filter((url) => this.isInternalUrl(url, baseUrl));
  }

  /**
   * Normalize and deduplicate a list of URLs.
   *
   * Rules applied per URL:
   *   - Hash fragments stripped  (#section → removed)
   *   - Trailing slash on non-root paths removed  (/about/ → /about)
   *   - Duplicate entries removed (case-sensitive on path, hostname lowercased)
   *   - Malformed URLs silently dropped
   */
  private deduplicateUrls(urls: string[]): string[] {
    const normalizedUrls = urls.map((url) => {
      try {
        const normalized = this.normalizeUrl(url);
        if (normalized) {
          return normalized.toString();
        }
      } catch {
        return null;
      }
    });
    return [...new Set(normalizedUrls.filter(Boolean))] as string[];
  }

  /** Returns true when `url` shares the same hostname as `baseUrl`. */
  private isInternalUrl(url: string, baseUrl: string): boolean {
    try {
      const target = new URL(url);
      const base = new URL(baseUrl);
      // Only follow http(s) — skip mailto:, tel:, javascript:, etc.
      if (!['http:', 'https:'].includes(target.protocol)) return false;

      // skip file downloads
      const fileExtensions = ['.pdf', '.zip', '.docx', '.xlsx', '.png', '.jpg', '.svg'];
      if (fileExtensions.some((ext) => target.pathname.endsWith(ext))) return false;

      return target.hostname === base.hostname;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the page to stop making network requests before extracting links.
   *
   * `networkidle` is the most reliable signal for SPA hydration.
   * The 10 s timeout is intentionally non-fatal: a page that never fully
   * quiets (e.g. long-polling, analytics pings) is still worth crawling.
   */
  private async waitForDomStability(page: Page): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
    } catch {
      // networkidle timed out — page content is likely still usable.
    }
  }

  /** Strip hash, normalise trailing slash, lowercase hostname, remove utm and tracking params. */
  private normalizeUrl(raw: string): string {
    try {
      const url = new URL(raw);
      url.hash = '';
      url.hostname = url.hostname.toLowerCase();
      if (url.pathname !== '/' && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.slice(0, -1);
      }
      url.searchParams.delete('utm_source');
      url.searchParams.delete('utm_medium');
      url.searchParams.delete('utm_campaign');

      return url.toString();
    } catch {
      return '';
    }
  }

  /** Pause execution for `ms` milliseconds. Used for rate limiting. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
