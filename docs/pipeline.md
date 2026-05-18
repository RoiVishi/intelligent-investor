# CI/CD Pipeline

The workflow is defined in `.github/workflows/ci-cd.yml`.

```text
Push / Pull Request
  |
  v
Test backend and frontend
  |
  v
Build Docker images
  |
  v
Run end-to-end smoke test
  |
  v
Deploy to staging
  |
  v
Verify /health returns HTTP 200

Push to main only:
  |
  v
Publish backend image to Docker Hub
  |
  v
Verify production Render URLs
```

## Stages

- `Test backend and frontend`: runs Jest unit/integration tests and the React/Vite DOM frontend test.
- `Build Docker images`: builds the backend image and validates Docker Compose.
- `Run end-to-end smoke test`: starts the full stack and runs Cypress against the frontend.
- `Deploy to staging`: only runs on the `stage` branch, starts the stack in CI as a repeatable staging verification, and verifies the health endpoint.
- `Publish backend image to Docker Hub`: only runs on push to `main`; pushes `roivishi/ii-backend:latest` and `roivishi/ii-backend:<commit-sha>`.
- `Verify production deployment`: only runs on push to `main`; verifies `https://intelligent-investor-api.onrender.com/health` and `https://intelligent-investor-web.onrender.com`.

## Required Secrets

Add these in GitHub repository settings under **Settings > Secrets and variables > Actions**:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

## Successful Run Evidence

For submission, open the GitHub Actions tab, choose the latest `Intelligent Investor CI/CD` run, and include a screenshot showing these stages green:

- `Test backend and frontend`
- `Build Docker images`
- `Run end-to-end smoke test`
- `Deploy to staging` if the run is from `stage`
- `Publish backend image to Docker Hub` and `Verify production deployment` if the run is from `main`

## Production Extension

Render is used as the cloud provider for the submitted deployment. The Blueprint creates managed PostgreSQL, the Dockerized backend service, and the static React frontend service. Production can reuse the same Compose services with provider-managed secrets, a persistent database disk or managed PostgreSQL service, and a reverse proxy/load balancer in front of the frontend/backend.
