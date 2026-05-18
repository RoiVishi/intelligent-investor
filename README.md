# Intelligent Investor Platform

Final assignment for Introduction to DevOps. The app calculates Common Sense Spending buckets from bank net income, saves financial profiles, and displays a 15-year investment projection at a fixed 7% annual return.

## Architecture

```text
Browser / Vanilla JavaScript + SVG chart
        |
        | HTTP
        v
Node.js Express API
        |
        | pg
        v
PostgreSQL
```

Project structure:

- `frontend/` - browser UI served by Nginx in Docker Compose.
- `backend/src/calculator.js` - isolated calculation module.
- `backend/src/routes/` - REST endpoints.
- `backend/db/init.sql` - relational schema for `financial_profiles` and `spending_plans`.
- `docs/architecture.md` - architecture and data-flow documentation.
- `docs/pipeline.md` - CI/CD pipeline explanation and screenshot checklist.
- `docs/presentation.md` - 15-minute demo outline.
- `.github/workflows/ci-cd.yml` - CI/CD pipeline.
- `scripts/setup-dev.sh` - idempotent local setup script.

## Local Run

Requirements: Docker and Docker Compose.

```bash
docker compose up -d --build
```

or:

```bash
./scripts/setup-dev.sh
```

Open:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:3001/health`

The named Docker volume is `intelligent-investor_investor_postgres_data`. It persists PostgreSQL data across container restarts.

To stop the app while keeping data:

```bash
docker compose down
```

To remove persisted database data:

```bash
docker compose down -v
```

To inspect all database tables:

```bash
./scripts/show-db.sh
```

## Environment Variables

Docker Compose provides defaults, but all configuration can be overridden through environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` | `db` | PostgreSQL host for the backend |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `investor_db` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `PORT` | `5000` | Backend container port |
| `BACKEND_PORT` | `3001` | Host port mapped to backend |
| `FRONTEND_PORT` | `8080` | Host port mapped to frontend |

## API

- `GET /health` - returns HTTP 200 only when the API and database are operational.
- `POST /calculate` - calculates buckets and projection.
- `POST /calculate/profiles` - saves a profile and spending plan.
- `GET /calculate/profiles/:id` - reloads a saved profile and latest spending plan.

Profile names are unique case-insensitively. Saving `Roi` and then `roi` returns HTTP 409.

Example calculation request:

```bash
curl -X POST http://localhost:3001/calculate \
  -H 'Content-Type: application/json' \
  -d '{"grossSalary":10000,"bankNet":6800,"years":15}'
```

## Testing

Backend unit and integration tests:

```bash
cd backend
npm test
```

Frontend component calculation test:

```bash
cd frontend
npm test
```

End-to-end test spec is included in `frontend/cypress/e2e/intelligent-investor.cy.js`. Run it after the Docker Compose stack is up and Cypress is installed:

```bash
cd frontend
npm install
npm run test:e2e
```

## CI/CD

The GitHub Actions workflow runs on pushes and pull requests to `dev`, `stage`, and `main`.

Pipeline stages:

1. `Test backend and frontend` - installs dependencies, runs unit and integration tests, and runs the frontend test.
2. `Build Docker images` - builds the backend Docker image and validates Docker Compose.
3. `Run end-to-end smoke test` - starts the full stack and runs Cypress.
4. `Deploy to staging` - runs on merges to `stage`, starts the Compose stack, and verifies `GET /health` returns HTTP 200.
5. `Publish backend image to Docker Hub` - runs on pushes to `main`, builds the backend image, and pushes `latest` plus the commit SHA tag.
6. `Verify production deployment` - runs on pushes to `main` after Docker publish and verifies the Render frontend and backend health endpoint.

Required GitHub repository secrets for Docker Hub publishing:

| Secret | Purpose |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token with push permission |

Manual staging deployment:

```bash
./scripts/deploy-staging.sh
```

Manual production deployment helper:

```bash
NODE_ENV=production ./scripts/deploy-production.sh
```

Production verification on `main` checks the Render frontend and backend health URLs. Render itself auto-deploys from the GitHub repository/Blueprint.

## Render Deployment

The repository includes `render.yaml` for Render Blueprint deployment:

- `intelligent-investor-db` - PostgreSQL database.
- `intelligent-investor-api` - Dockerized backend service.
- `intelligent-investor-web` - static frontend service.

To deploy:

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint**.
3. Connect the GitHub repository.
4. Select `render.yaml`.
5. Deploy the blueprint.

The static frontend writes `config.js` during Render build so browser requests go to the Render backend URL instead of localhost.

## Git Flow

Required branches:

- `main` - production-ready code.
- `stage` - staging deployment branch.
- `dev` - active integration branch.
- `feature/*` - individual feature branches merged through pull requests.

All merges into `dev`, `stage`, and `main` should use pull requests with at least one review comment.

## Scaling Notes

The backend is stateless, so it can scale horizontally behind a load balancer. PostgreSQL data is isolated in a named volume locally; in cloud deployment, use a managed PostgreSQL instance or a persistent disk with backups. Secrets should be stored in GitHub Actions secrets or the deployment provider, never in source code.
