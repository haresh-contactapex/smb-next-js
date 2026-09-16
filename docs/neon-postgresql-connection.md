# Connecting Next.js to Neon PostgreSQL

This guide documents how this project is wired up to Neon (serverless PostgreSQL), and the steps to set it up yourself.

## 1. Create a Neon account and project

1. Go to [https://neon.tech](https://neon.tech) and sign up (GitHub/Google/email).
2. Click **Create a project**.
3. Choose a project name, PostgreSQL version, and region closest to your users.
4. Neon creates a default database (usually `neondb`) and a default role/user.

## 2. Get your connection string

1. In the Neon Console, open your project.
2. Go to **Dashboard** (or **Connection Details**).
3. Copy the **connection string** — it looks like this:

   ```
   postgresql://<user>:<password>@<endpoint-hostname>.neon.tech/<database>?sslmode=require
   ```

4. Neon requires SSL, so `sslmode=require` must always be present.

> For local development, Neon also offers a **pooled connection string** (hostname contains `-pooler`). Use the pooled string for serverless/edge environments (like Vercel), and the direct string for long-running migrations.

## 3. Install the Neon serverless driver

This project uses `@neondatabase/serverless`, the official HTTP/WebSocket driver optimized for serverless and edge runtimes (like Next.js API routes and the Edge Runtime).

```bash
npm install @neondatabase/serverless
```

## 4. Add the connection string to environment variables

Create a `.env.local` file in the project root (this file is already git-ignored via `.gitignore`):

```env
DATABASE_URL=postgresql://username:password@ep-dummy-project-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

> The value above is a **dummy placeholder**. Replace it with your real Neon connection string before running against an actual database. Never commit real credentials — `.env*.local` is already excluded in `.gitignore`.

A non-secret template is also provided in [`.env.example`](../.env.example) so other developers know which variables are required.

## 5. Create the database client helper

File: [`src/lib/db.js`](../src/lib/db.js)

```js
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to your .env.local file.');
}

export const sql = neon(process.env.DATABASE_URL);
```

`sql` is a tagged-template function — call it like `sql\`SELECT * FROM users WHERE id = ${id}\`` and it safely parameterizes your query (no manual escaping needed).

## 6. Use it in a Next.js API route (App Router)

File: [`src/app/api/db-test/route.js`](../src/app/api/db-test/route.js)

```js
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

Any Server Component, Route Handler, or Server Action can import `sql` from `@/lib/db` the same way.

## 7. Test the connection

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Visit [http://localhost:3000/api/db-test](http://localhost:3000/api/db-test) in your browser.
3. With the dummy connection string, you'll get a `500` response with a connection error — this is expected.
4. Replace `DATABASE_URL` in `.env.local` with your real Neon connection string and restart the dev server.
5. Reload the endpoint — you should see a JSON response similar to:

   ```json
   {
     "success": true,
     "data": {
       "current_time": "2026-09-16T10:00:00.000Z",
       "pg_version": "PostgreSQL 16.4 on x86_64-pc-linux-gnu, ..."
     }
   }
   ```

## 8. (Optional) Run schema/migrations

You can run the SQL files already in [`docs/`](.) against your Neon database using the Neon SQL Editor (Console → **SQL Editor**) or a CLI tool like `psql`:

```bash
psql "postgresql://username:password@ep-dummy-project-123456.us-east-2.aws.neon.tech/neondb?sslmode=require" -f docs/auth/auth-database-schema.sql
```

## 9. Deploying (e.g., to Vercel)

1. In your hosting provider's dashboard, add an environment variable named `DATABASE_URL`.
2. Use the **pooled** Neon connection string (hostname with `-pooler`) for serverless deployments to avoid exhausting connections.
3. Redeploy — the app will pick up the environment variable automatically via `process.env.DATABASE_URL`.

## Summary of files added

| File | Purpose |
| --- | --- |
| `.env.local` | Holds the (dummy) `DATABASE_URL` used locally. Git-ignored. |
| `.env.example` | Non-secret template showing required env vars. |
| `src/lib/db.js` | Creates and exports the Neon `sql` client. |
| `src/app/api/db-test/route.js` | Sample API route that queries the database to verify connectivity. |
| `docs/neon-postgresql-connection.md` | This guide. |
