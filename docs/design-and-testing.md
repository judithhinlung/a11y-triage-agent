# Design and Testing Document
## Section 1: Architecture
### 1.1 System Diagram
### 1.2 Technology Stack
### 1.3 Architectural Patterns
### 1.4 Deployment Options and Cost Comparison
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

## Section 2: Testing
### 2.1 Unit Testing
### 2.2 Integration Testing
### 2.3 E2E Testing
### 2.4 ML Model Validation
### 2.5 Accessibility Testing
