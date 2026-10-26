// Who may change whom: against a real PostgreSQL (set TEST_DATABASE_URL to an empty, disposable
// database; CI provides one). Skipped without it.
// The rule under test: a staff member may only assign, edit, delete or grant what they hold themselves.
// Before it, anyone with Users -> Edit could reset the password of a more powerful account, or give
// themselves a role with more permissions, and so become that account.
import test, { describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = process.env.TEST_DATABASE_URL;
const root = fileURLToPath(new URL("../", import.meta.url));

describe("staff user and role management", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db;
  let staff;
  let roles;

  before(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATABASE_POOL_MAX = "1";
    execFileSync(process.execPath, ["scripts/migrate.mjs", "--all"], { cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });
    db = await import("@/lib/db");
    staff = await import("@/lib/staffUsers");
    roles = await import("@/lib/adminRoles");
  });

  const ROLE_DEFS = {
    // can manage users, but nothing outside that and products.view
    t_hr: ["users.view", "users.create", "users.edit", "users.delete", "products.view"],
    // everything t_hr's people may manage
    t_support: ["users.view", "products.view"],
    // holds permissions t_hr does not
    t_manager: ["users.view", "products.view", "products.edit", "orders.view"],
    // can manage roles and permissions, but only holds a few
    t_lead: ["users.view", "users.manage_roles", "users.manage_permissions", "products.view"],
  };

  beforeEach(async () => {
    await db.sql`TRUNCATE users CASCADE`;
    await db.sql`DELETE FROM admin_roles WHERE slug LIKE 't\\_%'`;
    for (const [slug, permissions] of Object.entries(ROLE_DEFS)) {
      await db.sql`
        INSERT INTO admin_roles (slug, name, status, is_system, full_access, permissions)
        VALUES (${slug}, ${slug}, 'active', false, false, ${JSON.stringify(permissions)}::jsonb)
      `;
    }
  });

  let counter = 0;
  async function makeUser(role) {
    counter += 1;
    const [row] = await db.sql`
      INSERT INTO users (first_name, last_name, email, role, password_hash)
      VALUES ('Test', ${`User${counter}`}, ${`user${counter}@shop.test`}, ${role}, 'original-hash')
      RETURNING id, email
    `;
    return { id: row.id, email: row.email, role };
  }
  // The signed-in actor exactly as the route handlers get them: the user and their role from the database.
  async function actor(role) {
    const user = await makeUser(role);
    return { user: { id: user.id }, role: await roles.getAdminRoleBySlug(role), target: user };
  }
  const row = async (id) => (await db.sql`SELECT email, role, password_hash FROM users WHERE id = ${id}`)[0];
  const edit = (target, overrides = {}) => ({
    firstName: "Test", lastName: "Edited", email: target.email, role: target.role, language: "en", timezone: "UTC+00:00", ...overrides,
  });

  async function rejects(promise, { status, message }) {
    let caught;
    try {
      await promise;
    } catch (error) {
      caught = error;
    }
    assert.ok(caught, "expected the call to be refused");
    assert.equal(caught.status, status);
    if (message) assert.match(caught.message, message);
    return caught;
  }

  describe("updateStaffUser", () => {
    test("someone with Users -> Edit cannot change the password or email of a more powerful user", async () => {
      const hr = await actor("t_hr");
      const victim = await makeUser("t_manager");

      await rejects(staff.updateStaffUser(victim.id, edit(victim, { password: "Passw0rd!x" }), hr.user, hr.role), { status: 403, message: /role permissions you hold/ });
      await rejects(staff.updateStaffUser(victim.id, edit(victim, { email: "attacker@evil.test" }), hr.user, hr.role), { status: 403 });

      const after = await row(victim.id);
      assert.deepEqual([after.email, after.role, after.password_hash], [victim.email, "t_manager", "original-hash"]);
    });

    test("they can edit, and reset the password of, a user whose role they fully hold", async () => {
      const hr = await actor("t_hr");
      const colleague = await makeUser("t_support");
      await staff.updateStaffUser(colleague.id, edit(colleague, { lastName: "Renamed", password: "Passw0rd!x" }), hr.user, hr.role);
      const after = await row(colleague.id);
      assert.notEqual(after.password_hash, "original-hash");
      const [{ last_name }] = await db.sql`SELECT last_name FROM users WHERE id = ${colleague.id}`;
      assert.equal(last_name, "Renamed");
    });

    test("they can edit a peer with exactly their own role", async () => {
      const hr = await actor("t_hr");
      const peer = await makeUser("t_hr");
      await staff.updateStaffUser(peer.id, edit(peer, { lastName: "Peer" }), hr.user, hr.role);
      const [{ last_name }] = await db.sql`SELECT last_name FROM users WHERE id = ${peer.id}`;
      assert.equal(last_name, "Peer");
    });

    test("they cannot promote someone, including themselves, to a role with more permissions than they hold", async () => {
      const hr = await actor("t_hr");
      const colleague = await makeUser("t_support");
      const error = await rejects(staff.updateStaffUser(colleague.id, edit(colleague, { role: "t_manager" }), hr.user, hr.role), { status: 403, message: /includes some you don't have/ });
      assert.equal(error.field, "role");
      assert.equal((await row(colleague.id)).role, "t_support");

      // Changing their own role is refused as before; so is making themselves a Super Admin.
      await rejects(staff.updateStaffUser(hr.user.id, edit(hr.target, { role: "t_manager" }), hr.user, hr.role), { status: 400, message: /own role/ });
      await rejects(staff.updateStaffUser(colleague.id, edit(colleague, { role: "store_admin" }), hr.user, hr.role), { status: 403, message: /Only a Super Admin/ });
    });

    test("they can move someone to a role they fully hold", async () => {
      const hr = await actor("t_hr");
      const colleague = await makeUser("t_support");
      await staff.updateStaffUser(colleague.id, edit(colleague, { role: "t_hr" }), hr.user, hr.role);
      assert.equal((await row(colleague.id)).role, "t_hr");
    });

    test("they can still edit their own profile", async () => {
      const hr = await actor("t_hr");
      await staff.updateStaffUser(hr.user.id, edit(hr.target, { lastName: "Mine" }), hr.user, hr.role);
      const [{ last_name }] = await db.sql`SELECT last_name FROM users WHERE id = ${hr.user.id}`;
      assert.equal(last_name, "Mine");
    });

    test("a Super Admin can still manage everyone and assign any role", async () => {
      const admin = await actor("store_admin");
      const manager = await makeUser("t_manager");
      await staff.updateStaffUser(manager.id, edit(manager, { password: "Passw0rd!x", role: "store_admin" }), admin.user, admin.role);
      assert.equal((await row(manager.id)).role, "store_admin");
    });

    test("only a Super Admin can touch another Super Admin", async () => {
      const hr = await actor("t_hr");
      const boss = await makeUser("store_admin");
      await rejects(staff.updateStaffUser(boss.id, edit(boss, { password: "Passw0rd!x" }), hr.user, hr.role), { status: 403, message: /Only a Super Admin/ });
      assert.equal((await row(boss.id)).password_hash, "original-hash");
    });

    test("a user whose role was deleted can still be managed (it grants nothing)", async () => {
      const hr = await actor("t_hr");
      const orphan = await makeUser("t_gone");
      await staff.updateStaffUser(orphan.id, edit(orphan, { role: "t_support" }), hr.user, hr.role);
      assert.equal((await row(orphan.id)).role, "t_support");
    });

    test("a role that has been switched off holds nothing, so its people cannot manage anyone", async () => {
      const hr = await actor("t_hr");
      await db.sql`UPDATE admin_roles SET status = 'inactive' WHERE slug = 't_hr'`;
      const stale = { ...hr, role: await roles.getAdminRoleBySlug("t_hr") };
      const colleague = await makeUser("t_support");
      await rejects(staff.updateStaffUser(colleague.id, edit(colleague, { lastName: "No" }), stale.user, stale.role), { status: 403 });
    });
  });

  describe("createStaffUser", () => {
    const newUser = (role) => ({ firstName: "New", lastName: "Hire", email: `hire${(counter += 1)}@shop.test`, role, language: "en", timezone: "UTC+00:00" });

    test("only roles the actor fully holds can be given to a new user", async () => {
      const hr = await actor("t_hr");
      await rejects(staff.createStaffUser(newUser("t_manager"), hr.role, { origin: null }), { status: 403, message: /includes some you don't have/ });
      await rejects(staff.createStaffUser(newUser("store_admin"), hr.role, { origin: null }), { status: 403, message: /Only a Super Admin/ });
      assert.equal((await db.sql`SELECT count(*)::int AS n FROM users WHERE first_name = 'New'`)[0].n, 0);

      const { user } = await staff.createStaffUser(newUser("t_support"), hr.role, { origin: null });
      assert.equal(user.role, "t_support");
    });

    test("a Super Admin can create a user with any role", async () => {
      const admin = await actor("store_admin");
      const { user } = await staff.createStaffUser(newUser("t_manager"), admin.role, { origin: null });
      assert.equal(user.role, "t_manager");
    });
  });

  describe("deleting users", () => {
    test("someone with Users -> Delete cannot delete a more powerful user, but can delete one they cover", async () => {
      const hr = await actor("t_hr");
      const manager = await makeUser("t_manager");
      const support = await makeUser("t_support");
      await rejects(staff.deleteStaffUser(manager.id, hr.user, hr.role), { status: 403, message: /role permissions you hold/ });
      assert.ok(await row(manager.id));

      await staff.deleteStaffUser(support.id, hr.user, hr.role);
      assert.equal(await row(support.id), undefined);
    });

    test("a bulk delete is all or nothing: one user they cannot manage stops the whole batch", async () => {
      const hr = await actor("t_hr");
      const manager = await makeUser("t_manager");
      const supportA = await makeUser("t_support");
      const supportB = await makeUser("t_support");

      const error = await rejects(staff.deleteStaffUsers([supportA.id, manager.id, supportB.id], hr.user, hr.role), { status: 403 });
      assert.match(error.message, /You can only delete users whose role permissions you hold/);
      assert.equal((await db.sql`SELECT count(*)::int AS n FROM users WHERE id = ANY(${[supportA.id, manager.id, supportB.id]}::uuid[])`)[0].n, 3);

      const result = await staff.deleteStaffUsers([supportA.id, supportB.id], hr.user, hr.role);
      assert.equal(result.deleted, 2);
    });

    test("a Super Admin can delete anyone but themselves", async () => {
      const admin = await actor("store_admin");
      const manager = await makeUser("t_manager");
      await staff.deleteStaffUser(manager.id, admin.user, admin.role);
      await rejects(staff.deleteStaffUser(admin.user.id, admin.user, admin.role), { status: 400, message: /your own account/ });
    });
  });

  describe("roles", () => {
    const roleInput = (permissions, name = "New role") => ({ name, description: "", status: "active", permissions });

    test("someone who manages roles and permissions can only grant permissions they hold", async () => {
      const lead = await actor("t_lead");
      await rejects(roles.createAdminRole(roleInput(["products.view", "products.edit"]), lead.role), { status: 403, message: /only grant permissions you hold/ });
      await rejects(roles.createAdminRole(roleInput(["users.view", "orders.refund"]), lead.role), { status: 403 });
      assert.equal((await db.sql`SELECT count(*)::int AS n FROM admin_roles WHERE name = 'New role'`)[0].n, 0);

      const created = await roles.createAdminRole(roleInput(["users.view", "products.view"]), lead.role);
      assert.deepEqual(created.permissions.sort(), ["products.view", "users.view"]);
    });

    test("they cannot widen a role to include permissions they lack, but can narrow it", async () => {
      const lead = await actor("t_lead");
      const mine = await roles.createAdminRole(roleInput(["users.view", "products.view"], "Mine"), lead.role);
      await rejects(roles.updateAdminRole(mine.id, roleInput(["users.view", "products.view", "orders.refund"], "Mine"), lead.role), { status: 403 });
      const narrowed = await roles.updateAdminRole(mine.id, roleInput(["users.view"], "Mine"), lead.role);
      assert.deepEqual(narrowed.permissions, ["users.view"]);
    });

    test("they cannot edit, copy, switch off or delete a role that grants more than they hold", async () => {
      const lead = await actor("t_lead");
      const manager = await roles.getAdminRoleBySlug("t_manager");
      await rejects(roles.updateAdminRole(manager.id, roleInput(["users.view"], "t_manager"), lead.role), { status: 403, message: /includes some you don't have/ });
      await rejects(roles.duplicateAdminRole(manager.id, lead.role), { status: 403 });
      await rejects(roles.setAdminRoleStatus(manager.id, "inactive", lead.role), { status: 403 });
      await rejects(roles.deleteAdminRole(manager.id, lead.role), { status: 403 });
      assert.equal((await roles.getAdminRoleBySlug("t_manager")).status, "active");
    });

    test("they cannot touch the Super Admin role at all", async () => {
      const lead = await actor("t_lead");
      const superRole = await roles.getAdminRoleBySlug("store_admin");
      await rejects(roles.updateAdminRole(superRole.id, { description: "hacked" }, lead.role), { status: 403, message: /Only a Super Admin/ });
      await rejects(roles.duplicateAdminRole(superRole.id, lead.role), { status: 403 });
    });

    test("a Super Admin can build and copy any role", async () => {
      const admin = await actor("store_admin");
      const full = await roles.createAdminRole(roleInput(["products.edit", "orders.refund", "users.edit"], "Wide"), admin.role);
      assert.equal(full.permissions.length, 3);
      const copy = await roles.duplicateAdminRole(full.id, admin.role);
      assert.equal(copy.status, "inactive");
    });
  });
});
