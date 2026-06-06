# Submission Checklist

## Links

- GitHub repository: https://github.com/RoiVishi/intelligent-investor
- Render frontend: https://intelligent-investor-web.onrender.com
- Render backend health: https://intelligent-investor-api.onrender.com/health
- Docker Hub backend image: https://hub.docker.com/r/roivishi/ii-backend
- Latest GitHub Actions runs: https://github.com/RoiVishi/intelligent-investor/actions

## Evidence To Capture

- Application page with the financial dashboard and bucket sliders.
- Backend `/health` response showing `database: connected`.
- GitHub Actions run with all jobs green.
- Docker Hub `roivishi/ii-backend:latest` tag.
- Render services for frontend, backend, and PostgreSQL database.
- Database tables `financial_profiles` and `spending_plans`, if database evidence is required.

## Manual Git Flow Evidence

Open at least one pull request before final submission:

- Source branch: `feature/submission-review-evidence`
- Target branch: `dev`
- Suggested review comment: `Reviewed CI/CD pipeline, Docker Compose validation, React frontend tests, Cypress smoke test, Render health checks, and database privacy behavior.`

Then merge the pull request. This creates visible PR history and review evidence.
