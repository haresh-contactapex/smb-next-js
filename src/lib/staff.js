import { sql } from "./db";

const ROLE_LABELS = {
  store_admin: "Store Admin",
  manager: "Manager",
  staff: "Staff",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function initialsFor(firstName, lastName) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

// Never include password_hash in anything handed back to a route handler's
// JSON response or a JWT payload.
function toPublicStaffUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || "",
    bio: row.bio || "",
    role: row.role,
    avatarUrl: row.avatar_url || null,
    language: row.language,
    timezone: row.timezone,
    twoFactorEnabled: row.two_factor_enabled,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function findStaffByEmail(email) {
  const [row] = await sql`SELECT * FROM users WHERE email = ${email.trim().toLowerCase()}`;
  return row || null;
}

export async function getStaffById(id) {
  const [row] = await sql`SELECT * FROM users WHERE id = ${id}`;
  return toPublicStaffUser(row);
}

export async function touchStaffLastLogin(id) {
  await sql`UPDATE users SET last_login_at = now() WHERE id = ${id}`;
}

export async function updateStaffPassword(id, passwordHash) {
  await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${id}`;
}

export async function getStaffPasswordHash(id) {
  const [row] = await sql`SELECT password_hash FROM users WHERE id = ${id}`;
  return row?.password_hash || null;
}

export async function updateStaffProfile(id, { firstName, lastName, email, phone, bio, avatarUrl, language, timezone, twoFactorEnabled }) {
  const [row] = await sql`
    UPDATE users SET
      first_name = ${firstName},
      last_name = ${lastName},
      email = ${email.trim().toLowerCase()},
      phone = ${phone || null},
      bio = ${bio || null},
      avatar_url = ${avatarUrl || null},
      language = ${language},
      timezone = ${timezone},
      two_factor_enabled = ${twoFactorEnabled},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return toPublicStaffUser(row);
}

export { toPublicStaffUser };
