import { neon } from '@neondatabase/serverless';

let client;

function getClient() {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add it to your .env.local file.');
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

// Wrapped so the DATABASE_URL check runs when a query actually executes,
// not at import time — Next.js evaluates route modules while collecting
// page data during `next build`, which would fail the build if the env
// var isn't set yet (e.g. before it's added in the Vercel dashboard).
export function sql(strings, ...values) {
  return getClient()(strings, ...values);
}
