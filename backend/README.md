# LearnLight Backend

Quick backend for the LearnLight project (Express + MySQL).

Setup

1. Copy `.env.example` to `.env` and fill values (especially `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
2. Start XAMPP and enable MySQL. Open `http://localhost/phpmyadmin`.
3. Import `schema.sql` into phpMyAdmin or run the SQL using the `mysql` CLI:

```bash
mysql -u root -p < schema.sql
```

4. Install dependencies and run:

```bash
cd backend
npm install
npm run dev
```

Notes about XAMPP

- Default MySQL user is `root` with no password. Set `DB_USER`=`root` and leave `DB_PASSWORD` empty unless you changed it.
- You can import `schema.sql` in phpMyAdmin: choose the `Import` tab and upload the file.

API endpoints (summary)

- `GET /api/health` - basic status
- `POST /api/auth/register` - body `{ name, email, password }`
- `POST /api/auth/login` - body `{ email, password }`
- `GET /api/lessons` - list
- `GET /api/lessons/:id` - get lesson
- `GET /api/lessons/slug/:slug` - get lesson by slug
- `GET /api/quiz/lesson/:lessonId` - get quiz and questions
- `POST /api/quiz/submit` - submit answers
- `GET /api/downloads` - list resources
- `GET /api/downloads/lesson/:lessonId` - lesson resources

Deployment (Render)

1. Push this repo to GitHub.
2. In Render, create a new `Web Service` from the repo.
3. Set `Root Directory` to `backend` (or use the root `render.yaml` blueprint).
4. Environment variables:

```bash
JWT_SECRET=<strong random string>
ADMIN_EMAILS=iamellyokello@gmail.com
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

5. Database options:
- Recommended: managed MySQL and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Fallback: SQLite (`FORCE_SQLITE=1`), but this is not ideal for durable production data.

6. Verify health endpoint:
- `GET /api/health`
