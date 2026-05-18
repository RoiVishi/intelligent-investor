# Architecture

```text
User browser
  |
  | HTTP on localhost:8080
  v
Nginx static frontend container
  |
  | fetch() to localhost:3001
  v
Express backend container
  |
  | pg connection using env vars
  v
PostgreSQL container
  |
  v
Named Docker volume: intelligent-investor_investor_postgres_data
```

## Components

- Frontend: React + Vite static app. It renders the profile form, four spending buckets, and an SVG investment projection chart.
- Backend: Express REST API. Routes validate inputs, call the isolated calculation module, and persist financial profiles.
- Database: PostgreSQL with `financial_profiles` and `spending_plans`.
- CI/CD: GitHub Actions runs tests, builds Docker images, runs Cypress E2E, and deploys staging on the `stage` branch.

## Data Flow

1. User enters `name`, `grossSalary`, `bankNet`, and `years`.
2. Frontend calls `POST /calculate` for calculations or `POST /calculate/profiles` to save.
3. Backend validates input and calls `src/calculator.js`.
4. Saved profiles are inserted into `financial_profiles`; calculated plans are inserted into `spending_plans`.
5. `GET /health` confirms both the API and database are operational.

## Privacy Note

The frontend does not expose a table of all saved profiles. Profiles can be saved through the UI, and the database can be inspected by an operator through `scripts/show-db.sh` or `psql`.

The frontend keeps a client-side calculation fallback for a smooth UI while the backend remains the authoritative calculation and persistence layer.
