# Sprint 1 Plan
## Sprint Goal
Deploy a working crawler and scanner pipeline that accepts a URL, discovers all pages, scans each for WCAG violations, and stores normalized results — accessible at a live Render URL.
## Sprint Backlog
| User Story | Ticket | Title |
|---|---|---|
| US-006 | A11Y-006 | Configure CI/CD pipeline |
| US-007 | A11Y-007 | Define system architecture |
| US-008 | A11Y-008 | Bootstrap monorepo with shared types |
| US-009 | A11Y-009 | Deploy application to Render free tier |
| US-010 | A11Y-010 | Crawl website and discover all pages |
| US-011 | A11Y-011 | Process audit jobs asynchronously |
| US-012 | A11Y-012 | Scan pages for WCAG violations with Axe-core |
| US-019 | A11Y-019 | Build React frontend with 4 core screens |
| US-025 | A11Y-025 | Document Sprint 1 planning meeting |
| US-026 | A11Y-026 | Record and submit Sprint 1 demo |
| US-030 | A11Y-030 | Create portfolio accessibility audit sample report |

## Task Breakdown
**Sprint Goal:**
Deploy a working crawler and scanner pipeline that accepts a URL, discovers all pages, scans each for WCAG violations, and stores normalized results — accessible at a live Render URL with CI/CD running on every commit.

**Sprint Duration:** 2 weeks
**Story Points:** 52
## A11Y-006 · Configure CI/CD Pipeline with GitHub Actions
**Story Points: 5**

- [ ] Create `.github/workflows/ci.yml` file in repo root
- [ ] Add trigger for CI to run on every pull request and push to main
- [ ] Add CI step: checkout code
- [ ] Add CI step: setup Node.js version 20
- [ ] Add CI step: run `npm install` to install all dependencies
- [ ] Add CI step: run TypeScript compilation check `tsc --noEmit`
- [ ] Add CI step: run ESLint across all packages
- [ ] Add CI step: run Jest unit tests across all packages
- [ ] Create `.github/workflows/cd.yml` file for deployment
- [ ] Add CD trigger: runs on merge to main branch only
- [ ] Add CD step: build all services with `turbo build`
- [ ] Add CD step: deploy to Render using Render deploy hook URL
- [ ] Enable branch protection on main — require CI to pass before any merge
- [ ] Add CI status badge to README
- [ ] Create a test pull request to verify CI runs end to end
- [ ] Merge test PR and verify CD deploys to Render automatically
- [ ] Document CI/CD pipeline in DESIGN_AND_TESTING.md — explain GitHub Actions choice over CircleCI and Jenkins

---

## A11Y-007 · Define System Architecture and Write ADRs
**Story Points: 5**

- [ ] Draw system architecture diagram using Excalidraw or draw.io showing all six services and data flow between them
- [ ] Export diagram as `architecture.png` and commit to `/docs/`
- [ ] Write ADR-001: Monorepo with Turborepo — justify over separate repos
- [ ] Write ADR-002: Microservices decomposition — justify why each service is independent
- [ ] Write ADR-003: Node.js and Playwright for crawler — justify over Puppeteer and Cheerio
- [ ] Write ADR-004: BullMQ and Redis for job queue — justify over alternatives like SQS and RabbitMQ
- [ ] Write ADR-005: PostgreSQL for violation storage — justify over MongoDB
- [ ] Write ADR-006: Axe-core over Pa11y — document the difference after reading both codebases
- [ ] Write ADR-007: Repository pattern for data layer — justify over active record
- [ ] Add all ADRs to DESIGN_AND_TESTING.md Section 1 under Architectural Patterns
- [ ] Add full technology stack table to DESIGN_AND_TESTING.md with written rationale for every choice

---

## A11Y-008 · Bootstrap Monorepo with TypeScript, ESLint, and Shared Types
**Story Points: 3**

- [ ] Create root `package.json` with workspaces config pointing to `packages/*`
- [ ] Install Turborepo at root: `npm install turbo --save-dev`
- [ ] Create `turbo.json` at root with build, dev, lint, and test pipeline config
- [ ] Create `tsconfig.base.json` at root with shared TypeScript settings
- [ ] Create `.eslintrc.base.js` at root with shared ESLint rules
- [ ] Create `.prettierrc` at root with shared formatting config
- [ ] Create `packages/shared-types/` folder
- [ ] Create `packages/shared-types/package.json` with name `@a11y/shared-types`
- [ ] Create `packages/shared-types/tsconfig.json` extending base config
- [ ] Create `packages/shared-types/src/index.ts` with all five interfaces: `AuditRequest`, `CrawlResult`, `ScanViolation`, `MLClassification`, `ReportOutput`
- [ ] Scaffold `packages/crawler-service/` with `package.json`, `tsconfig.json`, and basic Express server
- [ ] Scaffold `packages/scanner-service/` with `package.json`, `tsconfig.json`, and basic Express server
- [ ] Scaffold `packages/llm-service/` with `package.json`, `tsconfig.json`, and basic Express server
- [ ] Scaffold `packages/report-service/` with `package.json`, `tsconfig.json`, and basic Express server
- [ ] Scaffold `packages/ml-service/` as Python service with `requirements.txt` and `main.py`
- [ ] Add `/health` endpoint to every TypeScript service returning `{ status: "ok", service: "service-name" }`
- [ ] Install all dependencies from root: `npm install`
- [ ] Verify `@a11y/shared-types` appears as symlink in `node_modules/@a11y`
- [ ] Verify monorepo builds from root: `npm run build`
- [ ] Set up pre-commit hook with Husky to run ESLint and TypeScript check before every commit
- [ ] Commit everything and verify CI passes

---

## A11Y-009 · Deploy to Render Free Tier and Verify Public URL
**Story Points: 3**

- [ ] Create Render account at render.com and connect GitHub repo
- [ ] Create `render.yaml` in repo root configuring all services
- [ ] Add crawler-service as a Render Web Service in `render.yaml`
- [ ] Add scanner-service as a Render Web Service in `render.yaml`
- [ ] Add llm-service as a Render Web Service in `render.yaml`
- [ ] Add report-service as a Render Web Service in `render.yaml`
- [ ] Add frontend as a Render Static Site in `render.yaml`
- [ ] Create Render PostgreSQL database instance — save connection string as environment variable
- [ ] Create Render Redis instance — save connection URL as environment variable
- [ ] Configure all environment variables for each service in Render dashboard
- [ ] Wire Render deploy hook URL into CD pipeline in `.github/workflows/cd.yml`
- [ ] Trigger first manual deploy and verify all services start successfully
- [ ] Verify every `/health` endpoint returns HTTP 200 at its Render URL
- [ ] Verify auto-deploy triggers correctly on next push to main
- [ ] Add deployed frontend URL to GitHub README
- [ ] Add deployed URL to ClickUp board description
- [ ] Document deployment architecture in DESIGN_AND_TESTING.md including cost comparison: Render free tier $0 vs AWS ECS approximately $50-100 per month

---

## A11Y-010 · Build URL Crawler with Depth Control and SPA Support
**Story Points: 8**

**Core crawler class:**
- [ ] Install Playwright in crawler-service: `npm install playwright @playwright/test`
- [ ] Install Playwright browsers: `npx playwright install chromium`
- [ ] Create `packages/crawler-service/src/crawler.ts` with `A11yCrawler` class
- [ ] Implement `isInternalUrl(url, baseUrl)` — filters out external domains, mailto links, and file downloads
- [ ] Implement `normalizeUrl(url)` — strips trailing slashes, hash fragments, and irrelevant query params
- [ ] Implement `deduplicateUrls(urls)` — returns unique normalized URL array
- [ ] Implement `waitForDomStability(page)` — waits for network idle and DOM to stop changing
- [ ] Implement `extractLinks(page, baseUrl)` — extracts all `<a href>` links and JS-rendered routes
- [ ] Write unit tests for `isInternalUrl` covering: external domains, mailto, tel, and hash links
- [ ] Write unit tests for `normalizeUrl` covering: trailing slash, hash fragment, and query param cases
- [ ] Write unit tests for `deduplicateUrls` covering: duplicates, near-duplicates with different trailing slashes

**Depth-limited crawling:**
- [ ] Implement `crawl(rootUrl, maxDepth)` — breadth-first traversal with visited set and depth tracking
- [ ] Add rate limiting to `crawl()` — default 1 request per second, configurable via constructor option
- [ ] Add error handling for 404 responses — log and skip, do not crash
- [ ] Add error handling for redirects — follow and add final URL to visited set
- [ ] Add error handling for network timeouts — retry once then skip

**SPA support:**
- [ ] Test crawler against one static HTML site — verify all links discovered
- [ ] Test crawler against one React SPA — verify JS-rendered routes discovered
- [ ] Test crawler against one Ember SPA — verify routes discovered using your LinkedIn Ember knowledge
- [ ] Document SPA handling approach in DESIGN_AND_TESTING.md

**API endpoint:**
- [ ] Create `POST /crawl` endpoint in crawler-service accepting `{ url, depth }` body
- [ ] Return `{ jobId, status: "queued" }` immediately
- [ ] Write integration test using a local test HTML file with known links

---

## A11Y-011 · Implement Async Crawl Job Queue with Progress Events
**Story Points: 5**

**BullMQ setup:**
- [ ] Install BullMQ and Redis client: `npm install bullmq ioredis`
- [ ] Create `packages/crawler-service/src/queue.ts` with Redis connection config
- [ ] Create crawl Queue instance: `new Queue('crawl', { connection })`
- [ ] Create crawl Worker instance with concurrency set to 5
- [ ] Implement worker processor function — calls `A11yCrawler.crawl()` and returns discovered URLs
- [ ] Add job progress updates inside crawler — emit progress every 10 pages crawled
- [ ] Add failed job retry logic — retry up to 3 times with exponential backoff
- [ ] Install Bull Board for queue visibility: `npm install @bull-board/express`
- [ ] Mount Bull Board dashboard at `/admin/queues` in crawler-service

**Server-Sent Events:**
- [ ] Install SSE helper: `npm install express-sse` or implement manually
- [ ] Create `GET /crawl/:jobId/progress` endpoint in crawler-service
- [ ] Set SSE response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- [ ] Subscribe to job progress events and write to SSE stream
- [ ] Close SSE connection when job completes or fails
- [ ] Test SSE manually in browser — open progress URL and verify events appear in real time

**Integration:**
- [ ] Wire `POST /crawl` endpoint to enqueue a BullMQ job instead of running synchronously
- [ ] Return `jobId` from POST endpoint so client can open SSE progress stream
- [ ] Test full async flow: submit URL, receive jobId, open SSE stream, watch progress events, job completes

---

## A11Y-012 · Integrate Axe-core Scanner and Normalize Violations
**Story Points: 8**

**Scanner setup:**
- [ ] Install Axe-core for Playwright: `npm install @axe-core/playwright` in scanner-service
- [ ] Create `packages/scanner-service/src/scanner.ts` with `A11yScanner` class
- [ ] Implement `scan(url)` — launches Playwright browser, navigates to URL, injects and runs Axe-core, returns raw results

**Normalization:**
- [ ] Implement `normalizeViolation(axeViolation)` — maps every Axe field to your `ScanViolation` schema
- [ ] Implement `mapWcagLevel(tags)` — extracts wcag2a, wcag2aa, wcag2aaa from Axe tags array
- [ ] Implement `mapWcagVersion(tags)` — extracts 2.1 or 2.2 from Axe tags array
- [ ] Implement `mapDisabilityCategory(tags)` — maps Axe category tags to: visual, motor, cognitive, auditory
- [ ] Document disability category mapping rationale in DESIGN_AND_TESTING.md using your rehabilitation counseling background — this is your academic contribution

**Database storage:**
- [ ] Create PostgreSQL violations table with full schema matching `ScanViolation` interface plus `raw_axe_output JSONB` column
- [ ] Install database client in scanner-service: `npm install pg` and `npm install @types/pg`
- [ ] Implement `ViolationRepository` class with `save(violations)` and `findByAuditId(auditId)` methods
- [ ] Wire scanner output to save normalized violations to PostgreSQL
- [ ] Preserve raw Axe JSON in `raw_axe_output` column alongside normalized record

**Pipeline integration:**
- [ ] Create scan Queue and Worker in scanner-service using same BullMQ pattern as crawler
- [ ] After crawler job completes, enqueue one scan job per discovered URL
- [ ] Create `POST /scan` endpoint accepting `{ urls, auditId }` body

**Testing:**
- [ ] Write unit tests for `mapWcagLevel` covering all WCAG level tag combinations
- [ ] Write unit tests for `mapWcagVersion` covering 2.1 and 2.2 tags
- [ ] Write unit tests for `mapDisabilityCategory` covering all Axe category tags
- [ ] Write integration test: scan `https://www.w3.org/WAI/demos/bad/` and assert at least 10 known violations are found
- [ ] Verify normalized violations are stored correctly in PostgreSQL after scan

---

## A11Y-019 · Build React Frontend Scaffold with 4 Core Screens
**Story Points: 5**

**Project setup:**
- [ ] Scaffold Vite React TypeScript app in `packages/frontend/`: `npm create vite@latest . -- --template react-ts`
- [ ] Update `packages/frontend/package.json` with correct name `@a11y/frontend` and add `@a11y/shared-types` as dependency
- [ ] Install shadcn/ui: follow shadcn init instructions for Vite project
- [ ] Install React Router: `npm install react-router-dom`
- [ ] Install Axios for API calls: `npm install axios`
- [ ] Configure Vite proxy to forward API calls to backend services in development

**Four core screens:**
- [ ] Create `src/pages/AuditRequest.tsx` — URL input field, crawl depth selector (1-5), industry vertical dropdown, Submit button
- [ ] Create `src/pages/ScanProgress.tsx` — job ID display, real-time progress bar fed by SSE, pages crawled counter, violations found counter
- [ ] Create `src/pages/ResultsDashboard.tsx` — placeholder violation list, filter panel placeholder, sort controls placeholder
- [ ] Create `src/pages/ReportDownload.tsx` — PDF download button placeholder, JSON download button placeholder

**Navigation and layout:**
- [ ] Create `src/components/Layout.tsx` — consistent header, navigation, and main content area
- [ ] Set up React Router in `src/App.tsx` with routes for all four screens
- [ ] Add navigation links between all screens

**Loading and error states:**
- [ ] Add loading spinner component for all async operations
- [ ] Add error boundary component to catch and display errors gracefully
- [ ] Add empty state component for when no audit has been run yet

**Accessibility — the tool must be accessible:**
- [ ] Run Axe-core against the frontend in development: `npm install @axe-core/react`
- [ ] Fix any violations Axe reports on the frontend before Sprint 1 demo
- [ ] Verify all four screens are keyboard navigable
- [ ] Verify all form inputs have associated labels
- [ ] Verify all interactive elements have visible focus indicators

**Wire up Audit Request to backend:**
- [ ] Connect AuditRequest form Submit button to `POST /crawl` endpoint
- [ ] On successful response store `jobId` in React state and navigate to ScanProgress screen
- [ ] Connect ScanProgress screen to `GET /crawl/:jobId/progress` SSE endpoint
- [ ] Display real-time progress updates as SSE events arrive

---

## A11Y-025 · Document Sprint 1 Planning Meeting
**Story Points: 1**

- [ ] Create `/docs/sprints/` folder in repo
- [ ] Create `/docs/sprints/sprint1_plan.md`
- [ ] Write sprint goal statement
- [ ] List all Sprint 1 user stories with story point estimates
- [ ] Break each user story into individual tasks (this document)
- [ ] Write definition of done for Sprint 1
- [ ] Move all Sprint 1 user stories to Sprint 1 Backlog column in ClickUp
- [ ] Commit sprint plan to repo and push

---

## A11Y-026 · Record and Submit Sprint 1 Demo to Product Owner
**Story Points: 2**

- [ ] Verify all Sprint 1 tickets are complete and in Done on ClickUp
- [ ] Verify all services are running correctly at Render URLs
- [ ] Verify CI pipeline is passing on main branch
- [ ] Open Zoom or Loom and start recording
- [ ] Show live deployed application at public Render URL
- [ ] Show GitHub repo — commit history and passing CI badge
- [ ] Show ClickUp board with Sprint 1 tickets in Done
- [ ] Live demo: submit a real URL through the frontend, watch crawler discover pages, watch violations populate
- [ ] Show Bull Board with completed jobs
- [ ] Show one normalized ScanViolation record in PostgreSQL database
- [ ] Stop recording — verify duration is between 5 and 10 minutes
- [ ] Upload recording to YouTube as unlisted video or Google Drive
- [ ] Save recording link in `/docs/sprints/sprint1_demo.md`
- [ ] Commit demo link to repo and push

---

## A11Y-030 · Create Portfolio Accessibility Audit Sample Report
**Story Points: 3**

- [ ] Choose a real public SaaS website to audit — pick one with 5-15 pages and known accessibility issues
- [ ] Run Axe-core scan against the site and export raw results
- [ ] Run WAVE scan against the site and export results
- [ ] Conduct keyboard navigation testing — tab through every interactive element on each page and document failures
- [ ] Test with JAWS or VoiceOver — document any screen reader specific failures
- [ ] Compile all violations into a master list
- [ ] Prioritize violations by severity and user impact
- [ ] Write executive summary — 1-2 paragraphs summarizing overall accessibility posture and litigation risk
- [ ] Build prioritized violation table with columns: violation, WCAG criterion, severity, affected users, recommended fix
- [ ] Write remediation roadmap — group violations into: fix immediately, fix this sprint, fix this quarter
- [ ] Estimate WCAG 2.1 conformance level — Level A, AA, or non-conformant
- [ ] Design PDF report layout — use your report-service or a tool like Canva for the portfolio version
- [ ] Export polished PDF
- [ ] Write LinkedIn post using the audit findings as content — lead with one surprising or critical violation you found
- [ ] Publish LinkedIn post with PDF attached or key findings summarized
- [ ] Save PDF to `/docs/portfolio/sample-audit-report.pdf` in repo

---

## Sprint 1 Total

| Ticket | Title | Points |
|---|---|---|
| A11Y-006 | CI/CD Pipeline | 5 |
| A11Y-007 | System Architecture | 5 |
| A11Y-008 | Monorepo Bootstrap | 3 |
| A11Y-009 | Render Deployment | 3 |
| A11Y-010 | URL Crawler | 8 |
| A11Y-011 | Job Queue | 5 |
| A11Y-012 | Axe-core Scanner | 8 |
| A11Y-019 | React Frontend Scaffold | 5 |
| A11Y-025 | Sprint 1 Planning Doc | 1 |
| A11Y-026 | Sprint 1 Demo Recording | 2 |
| A11Y-030 | Portfolio Sample Report | 3 |
| **Total** | | **48 points** |

## Definition of Done
- Code committed and passing CI
- Feature accessible at Render URL
- Unit tests written and passing
- DESIGN_AND_TESTING.md updated
