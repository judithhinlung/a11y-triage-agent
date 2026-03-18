# Design and Testing Document
## Section 1: Architecture
### 1.1 System Diagram
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

## Section 2: Testing
### 2.1 Unit Testing
### 2.2 Integration Testing
### 2.3 E2E Testing
### 2.4 ML Model Validation
### 2.5 Accessibility Testing
