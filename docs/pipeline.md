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
```

## Stages

- `Test backend and frontend`: runs Jest unit/integration tests and the frontend test.
- `Build Docker images`: builds the backend image and validates Docker Compose.
- `Run end-to-end smoke test`: starts the full stack and runs Cypress against the frontend.
- `Deploy to staging`: only runs on the `stage` branch, starts the stack, and verifies the health endpoint.

## Successful Run Evidence

For submission, open the GitHub Actions tab, choose the latest `Intelligent Investor CI/CD` run, and include a screenshot showing these stages green:

- `Test backend and frontend`
- `Build Docker images`
- `Run end-to-end smoke test`
- `Deploy to staging` if the run is from `stage`

## Production Extension

Production can reuse the same Compose services with provider-managed secrets, a persistent database disk or managed PostgreSQL service, and a reverse proxy/load balancer in front of the frontend/backend.
