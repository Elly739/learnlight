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
