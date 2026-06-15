## Architecture

### Local development (Docker Compose)
![Local development architecture](docs/diagrams/local-architecture.svg)

*Three containers — React/Nginx frontend, Node.js/Express API and PostgreSQL 15 — wired together by `docker compose up -d --build`, with data persisted in the `investor_postgres_data` volume.*

### Render Production Cloud diagram
![Render Production Cloud diagram](docs/diagrams/production-architecture.svg)

*Provisioned from `render.yaml`: a Static Site frontend, a Dockerized Web Service API (health-checked at `/health`) and a managed PostgreSQL database, with the backend image also published to Docker Hub by CI.*

### Render Deployment Pipeline diagram
![Render Deployment Pipeline diagram](docs/diagrams/cicd-pipeline.svg)

*Git Flow (`feature/* → dev → stage → main`) feeds a six-job pipeline — tests, Docker builds, E2E smoke test, staging deploy, Docker Hub publish and production verification — where any failing job blocks the chain.*
