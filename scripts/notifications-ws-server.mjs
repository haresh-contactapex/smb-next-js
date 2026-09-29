// Standalone WebSocket server for real-time admin notifications.
//
//   npm run ws:notifications
//
// Vercel serverless functions can't hold WebSocket connections, so this runs
// as its own long-lived Node process (Railway, Fly.io, a VPS, ... or locally
// next to `npm run dev`). Flow:
//
//   logAdminActivity() -> INSERT -> POST /publish {id}  (x-internal-secret)
//     -> for every connected admin: reload their role from the database
//        (cached <= 20s), apply canViewNotification(), send only if allowed.
//
// Browsers authenticate with a 60s ticket from GET /api/notifications/ws-token,
// sent as the first message (not in the URL, so it never lands in access logs).
// The ticket only names the user: the role/permissions always come from the DB.
// A socket that was denied at publish time never receives the payload.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import http from "http";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { canViewNotification } from "../src/lib/notificationAudience.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  let contents;
  try {
    contents = readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadEnvLocal();

const PORT = Number(process.env.PORT || process.env.NOTIFICATIONS_WS_PORT || 3001);
const SECRET = process.env.NOTIFICATIONS_WS_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const TICKET_SCOPE = "notifications-ws"; // keep in sync with src/lib/auth/constants.js
const ALLOWED_ORIGINS = (process.env.NOTIFICATIONS_WS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const VIEWER_TTL_MS = 20_000;
const AUTH_TIMEOUT_MS = 5_000;
const MAX_LIFETIME_MS = 30 * 60_000;
const MAX_SOCKETS_PER_USER = 5;

for (const [name, value] of [["DATABASE_URL", process.env.DATABASE_URL], ["JWT_SECRET", JWT_SECRET], ["NOTIFICATIONS_WS_SECRET", SECRET]]) {
  if (!value) {
    console.error(`[ws] ${name} is not set (add it to .env.local).`);
    process.exit(1);
  }
}

const sql = neon(process.env.DATABASE_URL);
const jwtKey = new TextEncoder().encode(JWT_SECRET);

/** @type {Set<{ ws: import("ws").WebSocket, userId: string|null, viewer: object|null, loadedAt: number, alive: boolean }>} */
const clients = new Set();

async function loadViewer(userId) {
  const [row] = await sql`
    SELECT u.id, r.status, r.full_access, r.permissions
    FROM users u LEFT JOIN admin_roles r ON r.slug = u.role
    WHERE u.id = ${userId}
  `;
  if (!row) return null;
  const active = row.status === "active";
  return {
    userId: row.id,
    active,
    fullAccess: active && Boolean(row.full_access),
    permissions: active && Array.isArray(row.permissions) ? row.permissions : [],
  };
}

async function freshViewer(client) {
  if (client.viewer && Date.now() - client.loadedAt < VIEWER_TTL_MS) return client.viewer;
  client.viewer = await loadViewer(client.userId);
  client.loadedAt = Date.now();
  return client.viewer;
}

function safeSend(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

async function publish(id) {
  const [row] = await sql`SELECT * FROM admin_notifications WHERE id = ${id}`;
  if (!row) return 0;

  const notification = {
    id: String(row.id),
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    description: row.description || "",
    severity: row.severity,
    actorName: row.actor_name || "System",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    read: false,
  };
  const audience = { audiencePermission: row.audience_permission, targetUserId: row.target_user_id };

  let delivered = 0;
  await Promise.all(
    [...clients].map(async (client) => {
      if (!client.userId) return; // not authenticated yet
      try {
        const viewer = await freshViewer(client);
        if (!viewer) return client.ws.close(4001, "unauthorized");
        if (!canViewNotification(viewer, audience)) return;
        safeSend(client.ws, { type: "notification", notification });
        delivered += 1;
      } catch (error) {
        console.error("[ws] deliver failed", error.message);
      }
    })
  );
  return delivered;
}

function secretMatches(header) {
  const a = Buffer.from(String(header || ""));
  const b = Buffer.from(SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true, clients: clients.size }));
  }

  if (req.method === "POST" && req.url === "/publish") {
    if (!secretMatches(req.headers["x-internal-secret"])) {
      res.writeHead(401);
      return res.end();
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1024) {
        res.writeHead(413);
        return res.end();
      }
    }
    try {
      const { id } = JSON.parse(body);
      if (!/^\d{1,18}$/.test(String(id))) throw new Error("bad id");
      const delivered = await publish(String(id));
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ delivered }));
    } catch (error) {
      console.error("[ws] publish failed", error.message);
      res.writeHead(400);
      return res.end();
    }
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server,
  path: "/ws",
  maxPayload: 4096,
  verifyClient: ({ origin }) => {
    if (ALLOWED_ORIGINS.length) return ALLOWED_ORIGINS.includes(origin);
    return !IS_PRODUCTION; // production must configure NOTIFICATIONS_WS_ALLOWED_ORIGINS
  },
});

wss.on("connection", (ws) => {
  const client = { ws, userId: null, viewer: null, loadedAt: 0, alive: true };
  clients.add(client);

  const authTimer = setTimeout(() => {
    if (!client.userId) ws.close(4001, "auth timeout");
  }, AUTH_TIMEOUT_MS);
  const lifetimeTimer = setTimeout(() => ws.close(4000, "refresh"), MAX_LIFETIME_MS);

  ws.on("pong", () => {
    client.alive = true;
  });

  ws.on("message", async (data) => {
    if (client.userId) return; // only the auth message is accepted
    try {
      const message = JSON.parse(data.toString());
      if (message?.type !== "auth" || typeof message.ticket !== "string") throw new Error("bad auth message");
      const { payload } = await jwtVerify(message.ticket, jwtKey);
      if (payload.scope !== TICKET_SCOPE || !payload.sub) throw new Error("bad ticket");

      const viewer = await loadViewer(payload.sub);
      if (!viewer) throw new Error("unknown user");
      const existing = [...clients].filter((c) => c.userId === viewer.userId).length;
      if (existing >= MAX_SOCKETS_PER_USER) return ws.close(4008, "too many connections");

      client.userId = viewer.userId;
      client.viewer = viewer;
      client.loadedAt = Date.now();
      clearTimeout(authTimer);
      safeSend(ws, { type: "ready" });
    } catch {
      ws.close(4001, "unauthorized");
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimer);
    clearTimeout(lifetimeTimer);
    clients.delete(client);
  });
  ws.on("error", () => {});
});

const heartbeat = setInterval(() => {
  for (const client of clients) {
    if (!client.alive) {
      client.ws.terminate();
      continue;
    }
    client.alive = false;
    client.ws.ping();
  }
}, 30_000);
wss.on("close", () => clearInterval(heartbeat));

server.listen(PORT, () => console.log(`[ws] notifications server listening on :${PORT}`));
