// Bootstraps a staff (admin panel) login. Staff accounts aren't publicly
// self-registerable — the admin-roles settings page is where invites belong
// once it's wired to the database — so this CLI script is how the first
// (or any) admin/staff user gets created.
//
// Usage: node scripts/create-admin-user.mjs <email> <password> [firstName] [lastName] [role]

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let contents;
  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const [email, password, firstName = "Admin", lastName = "User", role = "store_admin"] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: node scripts/create-admin-user.mjs <email> <password> [firstName] [lastName] [role]");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
  }

  const sql = neon(process.env.DATABASE_URL);
  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.trim().toLowerCase();

  const rows = await sql`
    INSERT INTO users (first_name, last_name, email, password_hash, role)
    VALUES (${firstName}, ${lastName}, ${normalizedEmail}, ${passwordHash}, ${role})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()
    RETURNING id, email
  `;

  console.log(`Staff user ready: ${rows[0].email} (${rows[0].id})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
