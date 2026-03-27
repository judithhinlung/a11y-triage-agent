# Design and Testing Document
## Section 1: Architecture
### 1.1 System Diagram

The source file is [`docs/architecture.drawio`](architecture.drawio).
Open it at **[app.diagrams.net](https://app.diagrams.net) → File → Open from → Device**.

**Diagram overview**

```
External
  [User (Browser)]
        │ HTTP/S
        ▼
┌─────────────────────────── Render.com ──────────────────────────────────┐
│  [Frontend · React SPA]                                                  │
│         │ REST API (submit / poll)                                       │
│         ▼                                                                │
│  [Report Service]  ◄──────────────── scan + triage results ─────────    │
│         │  ↕ read/write                              ↑                  │
│  [PostgreSQL]    trigger crawl ──►  [Crawler Service]                   │
│                                           │ enqueue page jobs           │
│                                    [Redis · BullMQ]                     │
│                                           │ dequeue                     │
│                                    [Scanner Service]  ↔  [LLM Service]  │
└─────────────────────────────────────────────────────────┼───────────────┘
                                                  Claude API call (dashed)
                                                          ▼
                                                  [Claude API · Anthropic]
```
### 1.2 Technology Stack
### 1.3 Architectural Patterns
### 1.4 Deployment Options and Cost Comparison

This project is deployed on **Render's free tier** for the capstone. The table below compares it against a representative AWS ECS production setup to justify the choice.

#### Cost Comparison

| Component | Render (free tier) | AWS ECS equivalent |
|---|---|---|
| Frontend (static CDN) | $0/mo | ~$5–10/mo (CloudFront + S3) |
| Crawler service (Node + Playwright) | $0/mo | ~$15–25/mo (Fargate 0.5 vCPU / 1 GB) |
| Scanner service (Node) | $0/mo | ~$10–15/mo (Fargate 0.25 vCPU / 512 MB) |
| Report service (Node) | $0/mo | ~$10–15/mo (Fargate 0.25 vCPU / 512 MB) |
| LLM service (Node) | $0/mo | ~$10–15/mo (Fargate 0.25 vCPU / 512 MB) |
| PostgreSQL | $0/mo | ~$15–25/mo (RDS db.t3.micro) |
| Redis | $0/mo | ~$15–20/mo (ElastiCache cache.t3.micro) |
| **Total (estimated)** | **$0/mo** | **~$70–125/mo** |

#### Rationale for Choosing Render

**Render free tier (chosen)**
- Zero cost for a capstone project that does not require production SLAs.
- Git-push deploys via `render.yaml` (Infrastructure-as-Code) keep the deployment model comparable to a real production workflow.
- Supports static sites, Node.js services, Python workers, PostgreSQL, and Redis natively — matching every component in this stack without additional configuration.
- No VPC, IAM, or networking configuration required; reduces operational complexity for a solo/small-team academic project.
- Free tier limitations (spin-down on inactivity, limited RAM) are acceptable for demo and evaluation purposes.

**AWS ECS (not chosen)**
- Estimated $70–125/mo for an equivalent multi-service deployment, which is not justified for a capstone.
- Requires VPC setup, IAM roles, ECS task definitions, ALB, Route 53, and ECR image management — significant operational overhead.
- Would be the appropriate choice for a production system requiring high availability, autoscaling, and custom networking.
## Section 1.5: CI/CD

### Tool Choice: GitHub Actions

GitHub Actions was chosen as the CI/CD platform over the following alternatives:

**CircleCI**
- Requires a separate account, configuration dashboard, and secret management outside of GitHub.
- Free tier has limited compute minutes; costs scale quickly for private repos.
- GitHub Actions provides equivalent parallelism and caching with zero additional account setup.

**Jenkins**
- Self-hosted; requires provisioning, maintaining, and securing a dedicated server or container.
- Significant operational overhead for a small project with no existing Jenkins infrastructure.
- Plugin ecosystem is powerful but introduces maintenance burden and version-compatibility risks.

**GitHub Actions (chosen)**
- Native integration with the repository: secrets, branch protection rules, and status checks live in one place.
- No additional accounts or infrastructure to manage.
- Generous free tier for public repos; sufficient for this project's workload.
- YAML-based workflows are version-controlled alongside the code, making pipeline changes reviewable in PRs.
- Large marketplace of community actions (e.g., `actions/setup-node`, `actions/checkout`) reduces boilerplate.

### Workflow Overview

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | Push + PR to `main` | Type-check, lint, test |
| CD | `.github/workflows/cd.yml` | Push to `main` | Build, deploy to Render |

The CD workflow depends on the `RENDER_DEPLOY_HOOK_URL` repository secret, which is set in **GitHub → Settings → Secrets and variables → Actions** once the Render account is configured.

## Section 1.6: Architecture Decision Records (ADRs)

---

### ADR-001: Monorepo with Turborepo

**Date:** 2026-03-24
**Status:** Accepted

#### Context

The system is composed of five runtime services (crawler, scanner, llm, report, frontend) plus a shared types package. These services need to share TypeScript types and tooling configuration, run a single CI pipeline, and be deployable independently. The team considered three structural options: fully separate repositories, a plain npm workspaces monorepo, and a Turborepo-managed monorepo.

#### Decision

Use a **Turborepo**-managed monorepo with npm workspaces.

#### Alternatives Considered

| Option | Why Not Chosen |
|---|---|
| Separate repositories | Cross-service type sharing requires publishing packages to a registry or using git submodules. Both add release overhead and make atomic refactors across services harder. A single CI badge and unified lint/test/build scripts are also lost. |
| Plain npm workspaces (no Turborepo) | Works for dependency linking but provides no task graph or build caching. Running `npm test` from the root runs all packages serially with no incremental caching — slow for CI and local dev. |
| Nx | More featureful but significantly heavier: requires a Nx-specific config layer, affected-command graphs, and custom executors. For a five-package repo, Nx is over-engineered; Turborepo's minimal `turbo.json` pipeline covers the same use cases with less ceremony. |

#### Consequences

- `@a11y/shared-types` is consumed as a workspace dependency (`"*"`) — no registry publish step needed.
- `turbo build` resolves the `^build` dependency graph: shared-types is always compiled before services that depend on it.
- Turbo's remote cache (or local cache) means unchanged packages are skipped in CI, keeping pipeline times short as the repo grows.
- All services share the root ESLint, Prettier, TypeScript, and Husky configurations, enforcing consistency without duplication.
- Trade-off: a single `node_modules` at the root can create version-resolution surprises for packages with conflicting peer deps. Mitigated by keeping dependencies explicit per package.

---

### ADR-002: Microservices Decomposition

**Date:** 2026-03-24
**Status:** Accepted

#### Context

The application must: (1) crawl URLs to discover pages, (2) run automated accessibility scans on those pages, (3) send scan results to an LLM for triage and prioritization, and (4) persist and serve reports to the frontend. Each of these concerns has different runtime characteristics, scaling needs, and third-party dependencies. The question was whether to colocate them in one process or split them.

#### Decision

Deploy each concern as an **independent Node.js service** behind its own Express HTTP boundary:

| Service | Responsibility |
|---|---|
| `crawler-service` | Accepts a root URL, uses Playwright to discover all in-scope pages, enqueues each page as a scan job in BullMQ |
| `scanner-service` | Dequeues jobs, runs axe-core on each page, stores raw violations |
| `llm-service` | Receives violation payloads, calls the Claude API, returns severity triage and remediation guidance |
| `report-service` | Aggregates scan + triage results, persists to PostgreSQL, serves the report API |
| `frontend` | React SPA; served as a static asset, calls the report API |

#### Alternatives Considered

| Option | Why Not Chosen |
|---|---|
| Single monolith | Playwright requires a full browser installation (~300 MB). Bundling a browser into the same process as the LLM API client and the report DB layer creates a bloated, hard-to-scale deployment unit. Render free tier RAM limits make this problematic. |
| Serverless functions (Render Cron / Vercel Edge) | Playwright browsers cannot run in serverless environments without heavy workarounds (e.g., `@sparticuz/chromium`). Cold-start latency is also unacceptable for interactive crawl requests. |
| Two services (crawler+scanner combined, llm+report combined) | Reduces inter-service HTTP calls but couples scan throughput to LLM API rate limits. If the LLM is slow, it backs up the scanner. Keeping them separate allows independent retries and concurrency control. |

#### Consequences

- Each service can be scaled, redeployed, and rate-limited independently.
- `shared-types` carries the contract (TypeScript interfaces for `CrawlJob`, `ScanResult`, `TriageResult`) so all services stay in sync without runtime schema validation overhead.
- Adds latency from HTTP hops between services; acceptable because crawl and scan jobs are already async via BullMQ.
- Each service has its own `Dockerfile`-compatible build target, making future containerisation straightforward.

---

### ADR-003: Node.js + Playwright for the Crawler Service

**Date:** 2026-03-24
**Status:** Accepted

#### Context

The crawler must navigate to URLs, execute JavaScript, wait for dynamic content to settle, and collect all reachable in-scope links. Some target sites are Single-Page Applications (SPAs) where content is rendered client-side. The crawler must also hand off each discovered page URL to the scanner, which will later re-render each page for axe-core analysis.

#### Decision

Use **Playwright** (`playwright` v1.58+) running in a Node.js process.

#### Alternatives Considered

| Option | Why Not Chosen |
|---|---|
| **Cheerio** | Parses raw HTML; does not execute JavaScript. Fails silently on SPAs where the page shell contains no meaningful links until JS hydrates. Unsuitable for the target use case. |
| **Puppeteer** | Chromium-only. Playwright is a direct successor from the same team and adds Firefox and WebKit support, a more ergonomic async API, and better network interception. Puppeteer has no meaningful advantage here. |
| **Selenium / WebDriver** | Driver-based architecture introduces an extra network hop (client → driver → browser). Setup is heavier (requires browser + driver binaries, version matching). Playwright's `npx playwright install` handles browser management in one command. Selenium's TypeScript types are also less complete. |
| **Python + Scrapy** | Scrapy is powerful for HTML-scraping pipelines but does not natively execute JavaScript. Adding Splash or Playwright as a Scrapy middleware reintroduces the complexity being avoided. Using Python also splits the stack's language and toolchain. |

#### Consequences

- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is set during `npm ci` on Render and in CI to avoid downloading browsers during dependency installation; browsers are installed separately via `npx playwright install --with-deps chromium` only in the crawler service's build step.
- The crawler container is larger than other services (~300 MB browser binary). Acceptable because it runs as an isolated service.
- Playwright's `page.goto` + `page.$$eval('a[href]', ...)` pattern reliably extracts links from both server-rendered and client-rendered pages.
- Upgrading Playwright minor versions may change browser behaviour; pinning to a minor range (`^1.58`) and reviewing the changelog on upgrade is recommended.

---

### ADR-004: BullMQ + Redis for the Job Queue

**Date:** 2026-03-24
**Status:** Accepted

#### Context

The crawler discovers N pages and must hand each one to the scanner for processing. Processing is CPU- and I/O-intensive (full browser render + axe-core analysis). Jobs must not be lost if a worker crashes mid-flight, and the system should support retries with back-off for transient failures (e.g., pages that time out). The queue must also be inspectable so that job status (pending / active / completed / failed) can be surfaced in the report API.

#### Decision

Use **BullMQ** (`bullmq` v5+) backed by **Redis** (via `ioredis`).

#### Alternatives Considered

| Option | Why Not Chosen |
|---|---|
| **In-memory queue (EventEmitter / p-queue)** | No persistence. If the crawler service restarts between enqueue and processing, all pending jobs are lost. No retry logic or back-off. Not suitable for a system where crawl jobs are initiated by user action and must complete reliably. |
| **Amazon SQS** | Durable and managed, but ties the project to AWS, conflicting with the Render deployment decision (ADR: Render). Would also add per-message cost and require IAM configuration, increasing operational complexity. |
| **RabbitMQ** | Feature-rich but requires a separate broker deployment. Render does not offer a managed RabbitMQ service; running it as a free-tier container introduces another stateful service to manage. Redis is already needed for BullMQ, so adding RabbitMQ would be a redundant dependency. |
| **pg-boss (PostgreSQL-based queue)** | Avoids introducing Redis, since PostgreSQL is already in the stack. However, pg-boss uses polling (SKIP LOCKED rows) which is less efficient under high throughput, and its retry / delay / rate-limiting primitives are more limited than BullMQ's. PostgreSQL is also not optimized for the high-frequency queue read/write pattern that scanning workloads produce. |
| **Agenda (MongoDB-based)** | Requires MongoDB, an additional database technology not otherwise used in the stack. No benefit over BullMQ for this use case. |

#### Consequences

- Redis must be provisioned alongside the other services. Render provides a managed Redis instance on the free tier, so no additional infrastructure is needed.
- BullMQ's built-in retry with exponential back-off handles transient page-load timeouts without custom error-handling code.
- Job state (waiting / active / completed / failed) is stored in Redis sorted sets and can be queried by the report service to expose scan progress to the frontend.
- `ioredis` is used as the Redis client (BullMQ's required client library) — no additional Redis client package is needed.
- If Redis is unavailable, job enqueuing fails fast and the HTTP endpoint returns a 503; crawl requests can be retried by the caller.

---

---

### ADR-005: Crawler Behaviour Decisions

**Date:** 2026-03-27
**Status:** Accepted

#### Context

Beyond the choice of Playwright (ADR-003), the crawler's runtime behaviour requires several concrete decisions: how fast to send requests, how to handle HTTP error responses, how to normalize URLs so the same page is not visited twice, and how to signal to the queue that a page is unreachable.

#### Rate Limiting

**Decision:** Default to 1 request per second (`requestDelayMs = 1000`), configurable per crawl via a `CrawlOptions` argument.

**Rationale:** A fixed inter-request delay is the lowest-complexity polite-crawling strategy. Token-bucket or adaptive rate limiting would be more accurate but adds implementation complexity that is not justified for a capstone crawler whose primary use case is single-user, on-demand audits. The delay is applied between requests (not before the first), so single-page crawls incur no overhead.

**Alternatives considered:**
- **No rate limiting** — risks triggering rate-limit responses (429) or bans on shared hosting.
- **`p-limit` concurrency control** — limits simultaneous requests but does not add wall-clock spacing; a server still sees bursts.
- **Adaptive back-off on 429** — correct for production scrapers; over-engineered for this use case.

#### Error Response Handling

**Decision:** After each `page.goto`, inspect the HTTP response status. 404s and other 4xx/5xx responses are logged as warnings and the URL is **excluded from results**. The URL is still recorded in the internal `visited` set so it is never retried within the same crawl.

**Rationale:** A URL that returns 404 is a broken link, not a page to audit. Including it in the scan queue would cause the scanner to waste a job on a non-existent page. Keeping it in `visited` prevents redundant re-navigation if multiple pages link to the same broken URL.

**Redirects:** `page.goto` with `waitUntil: 'domcontentloaded'` follows redirects automatically and returns the final response. After a successful navigation, `page.url()` is read and normalized to capture the effective URL. If the final URL is still internal, it is recorded instead of the originally requested URL. This means `/old-path → /new-path` is recorded as `/new-path`, which is the correct page for the scanner to audit.

#### URL Normalization Rules

Consistent normalisation ensures that `/about`, `/about/`, `/about#hero`, and `/About` are all treated as the same URL. Rules applied in order:

| Rule | Example |
|---|---|
| Lowercase hostname | `EXAMPLE.COM` → `example.com` |
| Strip hash fragment | `/page#section` → `/page` |
| Remove trailing slash on non-root paths | `/about/` → `/about` |
| Delete UTM tracking params | `?utm_source=...` removed |

Normalization is applied when URLs are enqueued (via `deduplicateUrls`) and when recording the effective URL after navigation.

#### BFS Traversal and MAX_PAGES Cap

**Decision:** Breadth-first search (BFS) up to a caller-specified `depth`, with a hard cap of 50 pages per crawl.

**Rationale:** BFS visits the most "important" pages first (root, then direct children) so that if the MAX_PAGES cap is hit, the result set is more representative than a DFS result would be. The 50-page cap prevents runaway traversal on sites with hundreds of internal links and keeps crawl time within a reasonable bound for a free-tier service.

---

## Section 2: Testing

### 2.1 Unit Testing

Unit tests are in `packages/crawler-service/src/__tests__/crawler.test.ts`. They test private helper methods directly via an `any` cast (TypeScript erases access modifiers at runtime), which avoids the need to mock Playwright for pure logic tests.

| Method | What is tested |
|---|---|
| `normalizeUrl` | Hostname lowercasing, hash stripping, trailing-slash removal, UTM param deletion, root-slash preservation, malformed input |
| `isInternalUrl` | Same-domain pass, different-domain reject, subdomain reject (ADR-003), non-HTTP protocol reject, file-extension reject, malformed input |
| `deduplicateUrls` | Exact duplicate removal, trailing-slash dedup, hash-fragment dedup, distinct URLs preserved, order preservation, malformed URL dropping |

Run: `npm test` from `packages/crawler-service/` (or `turbo test --filter=@a11y/crawler-service` from the root).

### 2.2 Integration Testing

Integration tests are in `packages/crawler-service/src/__tests__/crawler.integration.test.ts`. They launch a real Chromium browser and a real `http.Server` (Node built-in, no extra dependencies) that serves fixture HTML files from `src/__tests__/fixtures/`.

**Fixture site map:**

```
GET /          → index.html   links to /page-a, /page-b, /missing, external, mailto, tel, #section
GET /page-a    → page-a.html  links to /, /page-b
GET /page-b    → page-b.html  links to /
GET /redirect  → 301 /page-a
GET /missing   → 404
```

**Scenarios covered:**

| Test | Assertion |
|---|---|
| `depth=0` | Only the root URL is returned |
| `depth=1` | Root + `/page-a` + `/page-b` returned; `/missing` excluded; no external URLs |
| 404 handling | `/missing` is linked from the root but excluded from results |
| Redirect following | Crawling `/redirect` records `/page-a` (final URL), not `/redirect` |
| `requestDelayMs` option | Crawl accepts the option and completes successfully |

Expected runtime: ~20–30 s (Playwright browser launch + `networkidle` waits).

Run: `npx jest crawler.integration --testTimeout=60000` from `packages/crawler-service/`.

### 2.3 Smoke Tests (Real Sites)

Smoke tests are in `packages/crawler-service/src/__tests__/crawler.smoke.test.ts`. They are wrapped in `describe.skip` and **never run in CI**. Run them manually to verify behaviour against live sites after a Playwright upgrade or a significant crawler change.

| Site | Type | URL |
|---|---|---|
| `info.cern.ch` | Static HTML (no JavaScript) | `http://info.cern.ch` |
| `react.dev` | React SPA (client-side routing) | `https://react.dev` |
| `emberjs.com` | Ember SPA (Glimmer rendering) | `https://emberjs.com` |

Run: `npx jest crawler.smoke --testTimeout=120000` from `packages/crawler-service/`.

Assertions are intentionally loose (≥1 result, all URLs on the expected hostname) because live site structure changes over time.

### 2.4 E2E Testing

Not yet implemented. Planned: Playwright-based E2E tests that submit a crawl job via the frontend, poll the report service, and assert that the final report contains at least one accessibility violation.

### 2.5 ML Model Validation

Not yet implemented. Planned: golden-set tests that compare LLM triage output against a curated set of known violations to catch regressions when the prompt or model is changed.

### 2.6 Accessibility Testing

Not yet implemented. Planned: axe-core scan of the frontend SPA itself as part of CI, ensuring the audit tool's own UI meets WCAG 2.1 AA.
