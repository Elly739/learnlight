# LearnLight

Full-stack learning platform.

## Structure

- `backend/` Express API + PostgreSQL
- `learnlight/` Vite + React frontend

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Required env vars (local `.env`):

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=disable
JWT_SECRET=change_me
ADMIN_EMAILS=you@example.com
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend

```bash
cd learnlight
npm install
npm run dev
```

Frontend env vars (local `.env`):

```
VITE_API_URL=http://localhost:4000
```

## Production

### Render (Backend)

Required env vars:

```
DATABASE_URL=postgresql://...
JWT_SECRET=strong_secret
ADMIN_EMAILS=you@example.com
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
PGSSLMODE=require
```

Health checks:

- `GET /api/health`
- `GET /api/health/db`

### Vercel (Frontend)

Required env vars:

```
VITE_API_URL=https://your-render-backend.onrender.com
```

## Tests

Backend:

```bash
npm --prefix backend test
```

Frontend:

```bash
npm --prefix learnlight run test:all
```

## CI

GitHub Actions runs backend and frontend tests on push/PR to `main`.
