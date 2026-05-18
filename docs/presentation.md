# Presentation Outline

## 1. Problem And Goal

The Intelligent Investor replaces detailed budgeting with four clear buckets based on bank net income:

- Fixed costs
- Savings goals
- Active investments
- Guilt-free spending

## 2. Live Demo

1. Open `http://localhost:8080`.
2. Enter name, gross salary, bank net, and projection years.
3. Click `Calculate`.
4. Show the four bucket values.
5. Show the SVG projection chart.
6. Click `Save`.
7. Show that duplicate names are rejected.
8. Inspect the database with:

```bash
./scripts/show-db.sh
```

## 3. Backend Walkthrough

- `backend/src/calculator.js` contains pure calculation logic.
- `backend/src/routes/calculate.js` handles validation, save, and load-by-id routes.
- `backend/src/routes/health.js` checks the database before returning HTTP 200.
- `frontend/src/App.jsx` is the React/Vite UI used for the form, bucket cards, and projection chart.

## 4. Database

Tables:

- `financial_profiles`
- `spending_plans`

Data persists through the named Docker volume `intelligent-investor_investor_postgres_data`.

## 5. DevOps Flow

- `docker compose up -d --build` starts the full development stack.
- GitHub Actions runs tests, builds Docker images, runs Cypress, and verifies staging on the `stage` branch.
- `scripts/deploy-staging.sh` and `scripts/deploy-production.sh` are repeatable deployment helpers.

## 6. Q&A Notes

- All formulas are based on bank net, not gross salary.
- The fixed annual return is 7%.
- Profile names are unique case-insensitively.
- The frontend intentionally does not expose a list of all database profiles.
