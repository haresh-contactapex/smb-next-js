import { sql } from "./db";
import {
  getAllPermissionKeys,
  sanitizePermissions,
  roleHasPermission,
  MANAGE_ROLES_PERMISSION,
  MANAGE_PERMISSIONS_PERMISSION,
} from "./permissions";

export const ROLE_STATUSES = ["active", "inactive"];
const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

// Carries the HTTP status a route handler should answer with, so expected
// failures (validation, conflicts, protected roles) aren't reported as 500s.
export class AdminRoleError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AdminRoleError";
    this.status = status;
  }
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function toAdminRole(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    status: row.status,
    isSystem: row.is_system,
    fullAccess: row.full_access,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    usersAssigned: Number(row.users_assigned || 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

// Postgres errors that mean "this environment isn't migrated / has a
// duplicate" become actionable messages instead of raw driver text.
function translateDbError(error, name) {
  if (error instanceof AdminRoleError) return error;
  if (error?.code === "42P01") {
    return new AdminRoleError(
      "Roles & Permissions isn't set up yet. Run `npm run db:migrate:admin-roles`.",
      503
    );
  }
  if (error?.code === "23505") {
    return new AdminRoleError(`A role named "${name}" already exists.`, 409);
  }
  return error;
}

async function run(fn, name) {
  try {
    return await fn();
  } catch (error) {
    throw translateDbError(error, name);
  }
}

export function validateRoleInput(payload = {}) {
  const name = String(payload.name ?? "").trim().replace(/\s+/g, " ");
  const description = String(payload.description ?? "").trim();
  const status = String(payload.status ?? "active");
  const errors = {};

  if (!name) errors.name = "Role name is required.";
  else if (name.length > NAME_MAX) errors.name = `Role name must be ${NAME_MAX} characters or fewer.`;
  if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  if (!ROLE_STATUSES.includes(status)) errors.status = "Choose Active or Inactive.";

  const firstError = Object.values(errors)[0];
  if (firstError) throw new AdminRoleError(firstError, 400);

  return { name, description, status, permissions: sanitizePermissions(payload.permissions) };
}

export async function listAdminRoles() {
  return run(async () => {
    const rows = await sql`
      SELECT r.*, COUNT(u.id)::int AS users_assigned
      FROM admin_roles r
      LEFT JOIN users u ON u.role = r.slug
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.created_at ASC, r.name ASC
    `;
    return rows.map(toAdminRole);
  });
}

export async function getAdminRoleById(id) {
  if (!isUuid(id)) return null;
  return run(async () => {
    const [row] = await sql`
      SELECT r.*, (SELECT COUNT(*)::int FROM users u WHERE u.role = r.slug) AS users_assigned
      FROM admin_roles r
      WHERE r.id = ${id}
    `;
    return toAdminRole(row);
  });
}

export async function getAdminRoleBySlug(slug) {
  if (!slug) return null;
  return run(async () => {
    const [row] = await sql`SELECT * FROM admin_roles WHERE slug = ${slug}`;
    return toAdminRole(row);
  });
}

// One round trip from a staff user id to their role, for the (Edge)
// middleware's per-navigation page check. null when the user has no role row.
export async function getAdminRoleForUser(userId) {
  if (!isUuid(userId)) return null;
  return run(async () => {
    const [row] = await sql`
      SELECT r.* FROM users u JOIN admin_roles r ON r.slug = u.role
      WHERE u.id = ${userId}
    `;
    return toAdminRole(row);
  });
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function slugify(name) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "role"
  );
}

async function uniqueSlug(name) {
  const base = slugify(name);
  const rows = await sql`SELECT slug FROM admin_roles WHERE slug LIKE ${`${base}%`}`;
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

// Only the actor's permission to change *permissions* is checked here; the
// route has already required users.manage_roles to reach any mutation.
function assertCanChangePermissions(actorRole, before, after) {
  const changed = before.length !== after.length || before.some((key) => !after.includes(key));
  if (changed && !roleHasPermission(actorRole, MANAGE_PERMISSIONS_PERMISSION)) {
    throw new AdminRoleError("You don't have permission to change role permissions.", 403);
  }
}

// Stops an admin from deactivating or stripping role management from the
// role they are signed in with, which would lock them out of this screen.
function assertNotSelfLockout(actorRole, role, next) {
  if (!actorRole || actorRole.id !== role.id || role.fullAccess) return;
  if (next.status === "inactive") {
    throw new AdminRoleError("You can't deactivate the role you're signed in with.", 400);
  }
  if (next.permissions && !next.permissions.includes(MANAGE_ROLES_PERMISSION)) {
    throw new AdminRoleError(
      "You can't remove Manage Roles from the role you're signed in with.",
      400
    );
  }
}

export async function createAdminRole(payload, actorRole) {
  const input = validateRoleInput(payload);
  assertCanChangePermissions(actorRole, [], input.permissions);

  return run(async () => {
    const slug = await uniqueSlug(input.name);
    const [row] = await sql`
      INSERT INTO admin_roles (slug, name, description, status, permissions)
      VALUES (${slug}, ${input.name}, ${input.description || null}, ${input.status}, ${JSON.stringify(input.permissions)}::jsonb)
      RETURNING *, 0 AS users_assigned
    `;
    return toAdminRole(row);
  }, input.name);
}

export async function updateAdminRole(id, payload, actorRole) {
  const role = await getAdminRoleById(id);
  if (!role) throw new AdminRoleError("Role not found.", 404);

  // System roles keep their name, status and full access; only the
  // description can change.
  if (role.isSystem) {
    const description = String(payload.description ?? "").trim();
    if (description.length > DESCRIPTION_MAX) {
      throw new AdminRoleError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`, 400);
    }
    return run(async () => {
      await sql`
        UPDATE admin_roles SET description = ${description || null}, updated_at = now()
        WHERE id = ${id}
      `;
      return getAdminRoleById(id);
    });
  }

  const input = validateRoleInput(payload);
  assertCanChangePermissions(actorRole, sanitizePermissions(role.permissions), input.permissions);
  assertNotSelfLockout(actorRole, role, input);

  return run(async () => {
    await sql`
      UPDATE admin_roles SET
        name = ${input.name},
        description = ${input.description || null},
        status = ${input.status},
        permissions = ${JSON.stringify(input.permissions)}::jsonb,
        updated_at = now()
      WHERE id = ${id}
    `;
    return getAdminRoleById(id);
  }, input.name);
}

export async function setAdminRoleStatus(id, status, actorRole) {
  if (!ROLE_STATUSES.includes(status)) throw new AdminRoleError("Choose Active or Inactive.", 400);
  const role = await getAdminRoleById(id);
  if (!role) throw new AdminRoleError("Role not found.", 404);
  if (role.isSystem) throw new AdminRoleError(`${role.name} is a system role and can't be deactivated.`, 403);
  assertNotSelfLockout(actorRole, role, { status });

  return run(async () => {
    await sql`UPDATE admin_roles SET status = ${status}, updated_at = now() WHERE id = ${id}`;
    return getAdminRoleById(id);
  });
}

async function uniqueCopyName(name) {
  const base = `${name} (Copy`.slice(0, NAME_MAX - 5);
  const rows = await sql`SELECT lower(name) AS name FROM admin_roles WHERE lower(name) LIKE ${`${base.toLowerCase()}%`}`;
  const taken = new Set(rows.map((row) => row.name));
  if (!taken.has(`${base})`.toLowerCase())) return `${base})`;
  let n = 2;
  while (taken.has(`${base} ${n})`.toLowerCase())) n += 1;
  return `${base} ${n})`;
}

// The copy starts inactive so it can be reviewed before anyone relies on it.
// Duplicating a full-access role yields an ordinary role holding every
// permission that exists today, not another system role.
export async function duplicateAdminRole(id, actorRole) {
  const role = await getAdminRoleById(id);
  if (!role) throw new AdminRoleError("Role not found.", 404);
  const permissions = role.fullAccess ? getAllPermissionKeys() : sanitizePermissions(role.permissions);
  assertCanChangePermissions(actorRole, [], permissions);

  return run(async () => {
    const name = await uniqueCopyName(role.name);
    const slug = await uniqueSlug(name);
    const [row] = await sql`
      INSERT INTO admin_roles (slug, name, description, status, permissions)
      VALUES (${slug}, ${name}, ${role.description || null}, 'inactive', ${JSON.stringify(permissions)}::jsonb)
      RETURNING *, 0 AS users_assigned
    `;
    return toAdminRole(row);
  });
}

export async function deleteAdminRole(id) {
  const role = await getAdminRoleById(id);
  if (!role) throw new AdminRoleError("Role not found.", 404);
  if (role.isSystem) throw new AdminRoleError(`${role.name} is a system role and can't be deleted.`, 403);
  if (role.usersAssigned > 0) {
    throw new AdminRoleError(
      `${role.name} is assigned to ${role.usersAssigned} user${role.usersAssigned === 1 ? "" : "s"}. Reassign them before deleting it.`,
      409
    );
  }

  return run(async () => {
    await sql`DELETE FROM admin_roles WHERE id = ${id} AND is_system = false`;
    return { id };
  });
}
