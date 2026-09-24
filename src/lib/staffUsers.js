import { sql } from "./db";
import { hashPassword, generateTemporaryPassword } from "./auth/password";
import { createResetToken, WELCOME_TOKEN_TTL_MS } from "./auth/resetToken";
import { insertStaffResetToken } from "./passwordResetTokens";
import { sendStaffWelcomeEmail } from "./email";
import { getGeneralSettings } from "./generalSettings";
import { isValidUsPhone } from "./phone";
import { isValidPassword, getPasswordErrorMessage } from "@/components/auth/helpers";
import { LANGUAGES, TIMEZONES } from "@/data/accountData";

/**
 * Users (staff / admin panel accounts) CRUD over the `users` table.
 * Customers live in their own table and are never touched here.
 *
 * Privilege rules enforced on top of the route's users.* permission check:
 * - Only a full-access actor (Super Admin) can assign a full-access role, or
 *   edit/delete a user who currently holds one.
 * - Nobody can delete their own account or change their own role here.
 */

const NAME_MAX = 100;
const EMAIL_MAX = 255;
const BIO_MAX = 500;
// bcrypt ignores everything past 72 bytes.
const PASSWORD_MAX = 72;

const LANGUAGE_VALUES = LANGUAGES.map((option) => option.value);
const TIMEZONE_VALUES = TIMEZONES.map((option) => option.value);

export class StaffUserError extends Error {
  constructor(message, status = 400, field) {
    super(message);
    this.name = "StaffUserError";
    this.status = status;
    this.field = field;
  }
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

// Never includes password_hash.
function toStaffUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || "",
    bio: row.bio || "",
    role: row.role,
    roleName: row.role_name || row.role,
    roleStatus: row.role_status || null,
    roleFullAccess: Boolean(row.role_full_access),
    avatarUrl: row.avatar_url || null,
    language: row.language,
    timezone: row.timezone,
    twoFactorEnabled: row.two_factor_enabled,
    lockedUntil: toIso(row.locked_until) || null,
    lastLoginAt: toIso(row.last_login_at) || null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function translateDbError(error) {
  if (error instanceof StaffUserError) return error;
  if (error?.code === "42P01") {
    return new StaffUserError(
      "Users isn't set up yet. Run `npm run db:migrate:staff-users` and `npm run db:migrate:admin-roles`.",
      503
    );
  }
  if (error?.code === "23505") {
    return new StaffUserError("That email address is already in use.", 409, "email");
  }
  return error;
}

async function run(fn) {
  try {
    return await fn();
  } catch (error) {
    throw translateDbError(error);
  }
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fail(field, message) {
  throw new StaffUserError(message, 400, field);
}

// Shared by create and update. Create never takes a password (one is
// generated and emailed); on update a blank password keeps the current one.
export function validateStaffUserInput(payload = {}, { requirePassword }) {
  const firstName = String(payload.firstName ?? "").trim().replace(/\s+/g, " ");
  const lastName = String(payload.lastName ?? "").trim().replace(/\s+/g, " ");
  const email = String(payload.email ?? "").trim().toLowerCase();
  const phone = String(payload.phone ?? "").trim();
  const bio = String(payload.bio ?? "").trim();
  const role = String(payload.role ?? "").trim();
  const language = String(payload.language ?? "en");
  const timezone = String(payload.timezone ?? "UTC+00:00");
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!firstName) fail("firstName", "First name is required.");
  if (firstName.length > NAME_MAX) fail("firstName", `First name must be ${NAME_MAX} characters or fewer.`);
  if (!lastName) fail("lastName", "Last name is required.");
  if (lastName.length > NAME_MAX) fail("lastName", `Last name must be ${NAME_MAX} characters or fewer.`);
  if (!email || !isValidEmail(email)) fail("email", "Enter a valid email address.");
  if (email.length > EMAIL_MAX) fail("email", `Email must be ${EMAIL_MAX} characters or fewer.`);
  if (!isValidUsPhone(phone)) fail("phone", "Enter a valid 10-digit US phone number.");
  if (!role) fail("role", "Choose a role.");
  if (!LANGUAGE_VALUES.includes(language)) fail("language", "Choose a supported language.");
  if (!TIMEZONE_VALUES.includes(timezone)) fail("timezone", "Choose a supported timezone.");
  if (bio.length > BIO_MAX) fail("bio", `Bio must be ${BIO_MAX} characters or fewer.`);

  if (requirePassword || password) {
    // Same rule as My Account -> Profile and the reset-password flows.
    if (!isValidPassword(password)) fail("password", getPasswordErrorMessage(password) || "Enter a valid password.");
    if (new TextEncoder().encode(password).length > PASSWORD_MAX) {
      fail("password", `Password must be ${PASSWORD_MAX} characters or fewer.`);
    }
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    bio,
    role,
    language,
    timezone,
    twoFactorEnabled: Boolean(payload.twoFactorEnabled),
    password,
    unlock: Boolean(payload.unlock),
  };
}

export async function listStaffUsers() {
  return run(async () => {
    const rows = await sql`
      SELECT u.*, r.name AS role_name, r.status AS role_status, r.full_access AS role_full_access
      FROM users u
      LEFT JOIN admin_roles r ON r.slug = u.role
      ORDER BY u.created_at DESC, u.last_name ASC
    `;
    return rows.map(toStaffUser);
  });
}

export async function getStaffUserById(id) {
  if (!isUuid(id)) return null;
  return run(async () => {
    const [row] = await sql`
      SELECT u.*, r.name AS role_name, r.status AS role_status, r.full_access AS role_full_access
      FROM users u
      LEFT JOIN admin_roles r ON r.slug = u.role
      WHERE u.id = ${id}
    `;
    return toStaffUser(row);
  });
}

async function findRole(slug) {
  const [row] = await sql`SELECT slug, name, full_access FROM admin_roles WHERE slug = ${slug}`;
  return row || null;
}

async function assertAssignableRole(slug, actorRole) {
  const role = await run(() => findRole(slug));
  if (!role) fail("role", "Choose a role that exists.");
  if (role.full_access && !actorRole?.fullAccess) {
    throw new StaffUserError(`Only a Super Admin can assign the ${role.name} role.`, 403, "role");
  }
}

function assertCanManageTarget(target, actorRole) {
  if (target.roleFullAccess && !actorRole?.fullAccess) {
    throw new StaffUserError("Only a Super Admin can change or delete another Super Admin.", 403);
  }
}

async function storeName() {
  try {
    return (await getGeneralSettings())?.storeName || "Shop My Band";
  } catch {
    return "Shop My Band";
  }
}

// Emails the new user their temporary password plus a one-time "set your
// password" link (a staff reset token, redeemed on /admin/reset-password).
// Best-effort: the account already exists, so a delivery failure is reported
// back instead of thrown.
async function sendWelcome(user, temporaryPassword, origin) {
  try {
    const { rawToken, tokenHash, expiresAt } = createResetToken(WELCOME_TOKEN_TTL_MS);
    await insertStaffResetToken({ userId: user.id, tokenHash, requestedEmail: user.email, expiresAt });
    return await sendStaffWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
      storeName: await storeName(),
      temporaryPassword,
      setPasswordLink: `${origin}/admin/reset-password?token=${rawToken}`,
      loginLink: `${origin}/admin/login`,
      linkExpiresInHours: WELCOME_TOKEN_TTL_MS / (60 * 60 * 1000),
    });
  } catch (error) {
    console.error("createStaffUser: failed to send the welcome email", error);
    return false;
  }
}

// Returns { user, welcomeEmailSent }. `origin` builds the emailed links.
export async function createStaffUser(payload, actorRole, { origin }) {
  const input = validateStaffUserInput({ ...payload, password: "" }, { requirePassword: false });
  await assertAssignableRole(input.role, actorRole);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await run(async () => {
    const [row] = await sql`
      INSERT INTO users (first_name, last_name, email, phone, bio, role, language, timezone, two_factor_enabled, password_hash)
      VALUES (
        ${input.firstName}, ${input.lastName}, ${input.email}, ${input.phone || null}, ${input.bio || null},
        ${input.role}, ${input.language}, ${input.timezone}, ${input.twoFactorEnabled}, ${passwordHash}
      )
      RETURNING id
    `;
    return getStaffUserById(row.id);
  });

  const welcomeEmailSent = await sendWelcome(user, temporaryPassword, origin);
  return { user, welcomeEmailSent };
}

export async function updateStaffUser(id, payload, actor, actorRole) {
  const target = await getStaffUserById(id);
  if (!target) throw new StaffUserError("User not found.", 404);
  assertCanManageTarget(target, actorRole);

  const input = validateStaffUserInput(payload, { requirePassword: false });
  if (input.role !== target.role) {
    if (actor?.id === target.id) {
      throw new StaffUserError("You can't change your own role.", 400, "role");
    }
    await assertAssignableRole(input.role, actorRole);
  }

  const passwordHash = input.password ? await hashPassword(input.password) : null;

  return run(async () => {
    await sql`
      UPDATE users SET
        first_name = ${input.firstName},
        last_name = ${input.lastName},
        email = ${input.email},
        phone = ${input.phone || null},
        bio = ${input.bio || null},
        role = ${input.role},
        language = ${input.language},
        timezone = ${input.timezone},
        two_factor_enabled = ${input.twoFactorEnabled},
        password_hash = COALESCE(${passwordHash}::text, password_hash),
        password_changed_at = CASE WHEN ${passwordHash}::text IS NULL THEN password_changed_at ELSE now() END,
        failed_login_attempts = CASE WHEN ${input.unlock}::boolean THEN 0 ELSE failed_login_attempts END,
        locked_until = CASE WHEN ${input.unlock}::boolean THEN NULL ELSE locked_until END,
        updated_at = now()
      WHERE id = ${id}
    `;
    return getStaffUserById(id);
  });
}

export async function deleteStaffUser(id, actor, actorRole) {
  const target = await getStaffUserById(id);
  if (!target) throw new StaffUserError("User not found.", 404);
  if (actor?.id === target.id) throw new StaffUserError("You can't delete your own account.", 400);
  assertCanManageTarget(target, actorRole);

  return run(async () => {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return { id };
  });
}
