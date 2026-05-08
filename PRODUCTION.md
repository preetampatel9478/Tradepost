# Production readiness notes (TradePost)

This repo can run in dev quickly, but for a public launch you’ll want stricter defaults and repeatable deploys.

## Backend (API)

### Deploy with Docker (recommended baseline)

- Copy the example env file and fill real values:
  - `.env.prod.example` → `.env.prod`
- Run:
  - `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`

Notes:
- `docker-compose.yml` is dev-oriented (ports exposed, dev secrets, source mounts). Use `docker-compose.prod.yml` for production.
- Health check is `GET /health`.

### Minimum security checklist

- Set strong secrets:
  - `JWT_SECRET` must be long + random.
  - Never commit real credentials (Mongo/Firebase/etc.).
- Use least-privilege database credentials:
  - Prefer a dedicated Mongo user (not root) and restrict network access.
- Keep `NODE_ENV=production` in production.
- Set `ALLOWED_ORIGINS` and `SOCKET_CORS_ORIGIN` to only your real domains.
- Verify upload/storage strategy:
  - This compose mounts `backend/uploads` for persistence.
  - If you’re going to scale horizontally, use object storage (S3/GCS/Firebase Storage) instead of local disk.

## Mobile app (Expo)

### Production API URL

- Set `EXPO_PUBLIC_API_URL` to your public API base URL **including** `/api`.
  - Example: `https://api.tradepost.app/api`

### Build/release

- Use EAS builds for store releases.
- Add crash reporting (Sentry or similar) before launch.

## Operational basics

- Add backups (Mongo) and monitor disk usage.
- Add request/error monitoring and alerts.
- Enforce HTTPS (terminate TLS at a reverse proxy like nginx/Caddy or a managed LB).
