# Deploying Shop My Band to cPanel (Phusion Passenger)

This is the exact procedure used to run the Next.js 15 admin panel and storefront on a cPanel server
(`shopweddingband.com`), with the project living **inside `public_html`**. It also records every problem hit on the way, so the next deploy is a checklist rather than an
investigation.

No secrets are stored in this file. Where a secret is needed, the step says where to copy it from.

---

## 1. How it works

```
Browser ──> Apache ──> Phusion Passenger ──> app.js ──> Next.js (production build in .next/)
                                                  └──> PostgreSQL on 127.0.0.1:5433 (user-level, see §11)
```

* The whole repository is cloned into `/home/<user>/public_html` (the domain's document root).
* `app.js` is a tiny Passenger entry point. It starts Next.js, or, if there is no `.next/BUILD_ID` yet,
  it runs `next build` once and shows a "being built" page while it does.
* Passenger runs the app with **Node 22** (`PassengerNodejs` in `.htaccess`). The system Node (16.20.2) is too old
  for Next.js 15 and must not be used.
* Environment variables come from cPanel **Application Manager**, not from `.env` files. The one exception is
  `DATABASE_URL`, which `app.js` reads from `/home/<user>/.smb-database-url` and which overrides whatever
  Application Manager holds (see §11.4).
* Source code, `.git`, `node_modules`, `.next` and config files sit in the web root, so they are explicitly blocked
  (see §6). Passenger currently answers 404 for them, and `.htaccess` adds 403 rules as a second layer.

### Server facts this guide depends on

| Item | Value on this server |
| --- | --- |
| OS / panel | AlmaLinux 9, cPanel/WHM 138 |
| Node for the app | `/opt/cpanel/ea-nodejs22/bin/node` (EasyApache 4 package `ea-nodejs22`, v22.23.x) |
| System Node (do not use) | `/usr/bin/node` v16.20.2 |
| Application Manager | Present, but has **no Node version selector** (not CloudLinux) |
| Database | PostgreSQL 18 run as the cPanel user (no root), `127.0.0.1:5433`, database `smb` (§11). |
| Media storage | Local disk, `public_html/public/uploads/YYYY/MM/` (see §4) |

---

## 2. One-time server prerequisites (WHM / root)

These need root access and are done once per server.

1. **Node 22**: WHM → *EasyApache 4* → *Additional Packages* → enable **nodejs22** → Review → Provision.
   Confirm with the WHM Terminal: `/opt/cpanel/ea-nodejs22/bin/node -v`.
2. **Passenger + Application Manager** enabled for the account's feature list (`ea-apache24-mod-passenger`).
3. **Git Version Control** and **File Manager** available to the account.
4. (Recommended) Whitelist your office/deploy IP in **Imunify360** (see §8, "bot protection").

---

## 3. Environment variables (before touching the server)

Gather the values for the variables below. The app reads exactly these:

| Variable | Needed? | Secret? | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Yes | On cPanel: `postgresql://smb_app:<password>@127.0.0.1:5433/smb`, kept in `~/.smb-database-url` (§11.4). The password must be letters and digits only. |
| `JWT_SECRET` | Yes | Yes | Keep the same value across deploys so existing sessions stay valid; a new value logs everyone out. |
| `NODE_ENV` | Yes | No | `production` |
| `SITE_URL` | Yes | No | `https://<your-domain>`. Nothing else provides it, so password-reset emails are **not sent** without `SITE_URL`. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | If reCAPTCHA is on | No | Baked into the browser bundle at **build** time. Must exist before the build runs (see §5.8). |
| `RECAPTCHA_SECRET_KEY` | If reCAPTCHA is on | Yes | Runtime. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | `SMTP_PASS` | Fallback only; SMTP saved in *Settings → Email* (database) takes precedence. |
| `NOTIFICATIONS_WS_*` | No | Yes | Needs a separate long-lived WebSocket process. Passenger cannot host it; the admin bell falls back to polling every 30 s. |

Payment gateway keys, shipping, tax and email templates live in the database (Settings pages), so they travel with
`DATABASE_URL` and need no action.

---

## 4. Things to know about this hosting

* **Media storage**: new uploads are written to this server's disk, WordPress-style, as
  `public_html/public/uploads/YYYY/MM/<uuid>.<ext>` (for example `public/uploads/2026/10/3f2a….jpg`) and are
  served at `/uploads/YYYY/MM/<uuid>.<ext>` by the app (`src/app/uploads/[...path]/route.js`; `next start` does not
  serve files added after startup). The folder is created on first upload and must stay writable by the cPanel user.
  Back it up (it is not in Git) and keep it out of any "clean" deploy step.
  Deleting media in the admin removes the file from
  `public/uploads`.
* **`SITE_URL`**: required, see §3.
* **No edge/serverless limits**: long requests are fine, but the process is one long-lived Node process under
  Passenger. Memory-heavy tasks share that process.
* **Build happens on the server** (see §5.7 for why it is triggered from `app.js`).
* **HTTPS** is not automatic. Run AutoSSL / install a real certificate (§7). The app sends an HSTS header, so do not
  leave the site on a self-signed certificate.
* **Stripe webhook**: update the endpoint URL in the Stripe dashboard to `https://<your-domain>/api/stripe/webhook`
  when you cut over.

---

## 5. First deploy, step by step

All clicks are in cPanel unless stated. Replace `shopweddingband1` with your cPanel username.

### 5.1 Start from a clean slate (only when redoing a deploy)

1. **Application Manager** → *Unregister* any old application.
2. **File Manager** → move any old app folder (e.g. `~/smb-next-js`) to Trash (leave "Skip the trash" **unchecked**).

### 5.2 Empty `public_html` so Git can clone into it

cPanel Git refuses to clone into a folder that already has files ("*You cannot use … because it already contains files*").
A fresh `public_html` holds three cPanel-generated files: `.htaccess`, `.user.ini`, `php.ini`.

1. File Manager → Settings → tick **Show Hidden Files (dotfiles)**.
2. Move those three files to a backup folder (this guide used `/home/shopweddingband1/tmp/`).
3. Confirm `public_html` is empty.

### 5.3 Clone the repository into `public_html`

1. **Git Version Control** → *Create*.
2. *Clone a Repository* = on. **Clone URL**: `https://github.com/haresh-contactapex/smb-next-js.git`
   (public repo; a private one needs a deploy key or token configured first).
3. **Repository Path**: `public_html`. **Repository Name**: `smb-next-js`. *Create*.
4. Wait for the repo to appear in the list, then check `public_html` contains `src`, `public`, `package.json`, …

### 5.4 Restore the three cPanel files

File Manager → open the backup folder → select the three files → *Move* → `/public_html`.

### 5.5 Add the server-only files (not in Git)

Create these with File Manager → *New File*, then *Edit* (use the "Edit" dialog; with dotfiles visible).

**`public_html/app.js`**

```js
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");

// DATABASE_URL comes from a private file outside public_html, not from Application Manager (whose edit form
// fails with `Invalid configuration for the parameter "python"`). It overrides any value Application Manager sets.
try { const u = fs.readFileSync(path.join(__dirname, "..", ".smb-database-url"), "utf8").trim(); if (u) process.env.DATABASE_URL = u; } catch (e) {}

// This server has an IPv6 address on an interface but no IPv6 route to the internet. nodemailer picks
// between IPv4 and IPv6 addresses based on os.networkInterfaces(), so hide IPv6 to keep SMTP on IPv4.
const realNetworkInterfaces = os.networkInterfaces;
os.networkInterfaces = function networkInterfaces() {
  const result = {};
  for (const [name, list] of Object.entries(realNetworkInterfaces.call(os))) {
    result[name] = (list || []).filter((i) => i.family !== "IPv6" && i.family !== 6);
  }
  return result;
};

const port = process.env.PORT || 3000;
const dir = __dirname;

// Mirror console output to app.log so runtime errors (e.g. email failures) can be read in File Manager.
const appLog = fs.createWriteStream(path.join(dir, "app.log"), { flags: "a" });
for (const level of ["log", "warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    try {
      const text = args.map((a) => (a instanceof Error ? a.stack || a.message : typeof a === "string" ? a : require("util").inspect(a, { depth: 4 }))).join(" ");
      appLog.write(new Date().toISOString() + " [" + level + "] " + text + "\n");
    } catch (e) {}
    original(...args);
  };
}

function startNext() {
  const next = require("next");
  const app = next({ dev: false, dir });
  const handle = app.getRequestHandler();
  app.prepare().then(() => {
    http.createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log("Next.js app ready on port " + port);
    });
  });
}

if (fs.existsSync(path.join(dir, ".next", "BUILD_ID"))) {
  startNext();
} else {
  // No production build yet: build once from this (Apache-spawned) process, then restart.
  const log = fs.openSync(path.join(dir, "build.log"), "a");
  const note = (m) => fs.writeSync(log, m + "\n");
  note("=== Build from app.js at " + new Date().toISOString() + " (node " + process.version + ") ===");
  try {
    note(fs.readFileSync("/proc/self/limits", "utf8").split("\n").filter((l) => /address space/i.test(l)).join(" "));
  } catch (e) {}
  let message = "The site is being built. Please try again in a few minutes.";
  const child = spawn(process.execPath, [path.join(dir, "node_modules", "next", "dist", "bin", "next"), "build"], {
    cwd: dir,
    stdio: ["ignore", log, log],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  http.createServer((req, res) => {
    res.statusCode = 503;
    res.setHeader("Retry-After", "60");
    res.end(message);
  }).listen(port);
  child.on("exit", (code) => {
    note("[build] exit status: " + code);
    if (code === 0) process.exit(0);
    message = "The build failed. See build.log.";
  });
}
```

**`public_html/.npmrc`** (stops `npm install` rewriting the tracked `package-lock.json`)

```
save=false
```

**Append to `public_html/.htaccess`** (keep the cPanel PHP blocks that are already there):

```apache
# Run the Next.js app with Node 22
PassengerNodejs /opt/cpanel/ea-nodejs22/bin/node

# Block direct web access to source, build output, git data and config.
# Everything is served only through the Node app (Passenger).
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^\.(?!well-known/) - [F,L]
RewriteRule ^(node_modules|src|docs|scripts|legacy-static)(/|$) - [F,L]
RewriteRule ^(app\.js|build\.log|package\.json|package-lock\.json|next\.config\.js|jsconfig\.json|postcss\.config\.js|tailwind\.config\.js|CLAUDE\.md|README\.md|php\.ini)$ - [F,L]
</IfModule>
```

`.well-known` is deliberately left reachable so AutoSSL/DCV validation works.

### 5.6 Register the app (Application Manager)

1. *Register Application*.
2. **Name** `smb-next-js`, **Deployment Domain** `shopweddingband.com`, **Application Path** `public_html`,
   **Environment** Production.
3. *Add Variable* for each row in §3 that applies: at least `NODE_ENV`, `SITE_URL`, `DATABASE_URL` and `JWT_SECRET`.
   Click *Save* after each row.
4. *Deploy*. The app shows as **Enabled** on `/public_html`.

> Do not leave the registration page before clicking *Deploy*. Navigating away resets the form.

### 5.7 Install dependencies and build

1. In the app's row click **Ensure dependencies**. This runs `npm install` (Node 16's npm is fine for installing).
   `node_modules` appears in `public_html`.
2. Open `http://<your-domain>/` in a browser once. Passenger starts `app.js`, which sees no build and runs
   `next build` itself. You will see "The site is being built…" for roughly 2–4 minutes.
3. Follow progress in `public_html/build.log`. When it ends with `[build] exit status: 0`, the process exits and
   Passenger starts the real app on the next request.

**Why the build is triggered from `app.js` and not from "Ensure dependencies":** cPanel's own background jobs run under
`cpanel.service` with a **4 GiB address-space limit** (visible in `build.log` as `Max address space 4294967296`).
`next build` aborts under that limit with `memory allocation of N bytes failed`, even after raising WHM's cPanel
process memory setting and restarting cPanel. Processes started by Passenger/Apache have `unlimited` address space and
build fine.

### 5.8 If you use reCAPTCHA

`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is compiled into the browser JavaScript. Before the first build create
`public_html/.env.production.local` containing only:

```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<your site key>
```

(`.env*` files are denied by the `.htaccess` rule `^\.` and ignored by Git.) To change it later, rebuild (§9).

### 5.9 Verify

* `/`, `/women-wedding-bands`, `/blog`, `/login`, `/admin/login`, `/cart` load.
* `/api/storefront/products?limit=1` returns JSON with products (proves `DATABASE_URL`).
* Log in to `/admin` with a staff account; upload an image in the media library. It must appear under
  `public_html/public/uploads/YYYY/MM/` and open at `/uploads/YYYY/MM/<file>`; delete it again and check the file
  is gone.
* Request a password reset; the email link must start with your `SITE_URL`.
* These must **not** be readable: `/package.json`, `/app.js`, `/.git/config`, `/.next/BUILD_ID`, `/src/lib/db.js`,
  `/node_modules/next/package.json`, `/.npmrc`, `/build.log`, `/.env.local`.

---

## 6. Security checklist

* Source, `.git`, `node_modules` and `.next` live in the web root. Keep the `.htaccess` deny rules and re-test the
  "must not be readable" URLs after every deploy.
* Keep `public_html` at `0750` and directories `0755` / files `0644`. `0777` (world-writable) anything is a red flag.
  Zips built on Windows can extract folders as `0777`; fix them in File Manager → *Permissions*.
* Secrets only in Application Manager variables, or (for `DATABASE_URL`) in `~/.smb-database-url` with mode `600`;
  never in files under `public_html`.
* Rotate `JWT_SECRET` and the database password if they were ever pasted into a chat, ticket or screenshot (rotating
  `JWT_SECRET` logs all users out). A terminal that echoes a typed password (for example a URL typed as a command
  instead of at a hidden prompt) counts as exposed.
* The database listens on `127.0.0.1` only, and its local socket accepts the account's own processes without a
  password (§11.3). Do not change `listen_addresses`.
* Run AutoSSL; the account's certificate was self-signed ("Your domain is at risk!").
* Leave Imunify360 bot protection enabled; whitelist trusted IPs instead (§8).

---

## 7. Domain, DNS and SSL

1. Deploy and verify on a test hostname first (the cPanel account's own domain).
2. Add the production domain to the cPanel account (*Domains*), deploy the app to it in Application Manager
   (a second registration, or move the existing one).
3. Issue the certificate (AutoSSL / *SSL/TLS Status*) and confirm `https://` works **before** changing DNS if
   possible (temporary hosts-file entry), otherwise right after.
4. Update `SITE_URL` to the production `https://` URL and restart the app (§9).
5. Lower the DNS TTL a day ahead, then point the A record to the cPanel server IP (and remove any old `CNAME`).
6. Update external callbacks: Stripe webhook URL, reCAPTCHA allowed domains, any Google/Meta integrations.
7. Watch `logs/` in cPanel and the admin panel for the first day.

---

## 8. Troubleshooting (all hit during the first deploy)

| Symptom | Cause | Fix |
| --- | --- | --- |
| `You are using Node.js 16.20.2 … 18.18.0 is required` | System Node is old | Install `nodejs22` (§2) and set `PassengerNodejs` (§5.5) |
| `Application Manager` has no Node version field | Not CloudLinux | Use `PassengerNodejs` in `.htaccess` |
| `WebAssembly.instantiate(): Out of memory` | 4 GiB address-space cap + Node's wasm guard regions | Build from the Passenger process (§5.7); `--disable-wasm-trap-handler` also helps under the cap |
| `memory allocation of N bytes failed`, `build worker … SIGABRT` | Same 4 GiB cap, many native threads | Build from `app.js` (§5.7). Raising WHM's limit did not take effect for cPanel jobs here |
| Git: "*directory … already contains files*" | cPanel Git needs an empty target | §5.2 |
| `Passenger error #2 … Permission denied (errno=13)` | App folder mode `0700` (cPanel Git creates it that way) | Set the app folder to `0755`. Not needed when the app is `public_html` itself |
| Imunify360: *"Access denied by Imunify360 bot-protection"* / "One moment, please…" | Scripted or rapid requests from one IP | Browse manually, wait, or whitelist the IP in Imunify360 (WHM). Do not try to bypass it |
| "Ensure dependencies" shows Done instantly but nothing happens | It only runs `npm install` on cPanel's old npm; `onload-script` and custom hooks are not honoured | Don't rely on it for builds |
| `package-lock.json` shows as modified | `npm install` on npm 8 rewrites it | `.npmrc` with `save=false` (§5.5) |
| Site shows the 503 "being built" page forever | Build failed | Read `build.log`; fix; delete `.next`; restart (§9) |
| `build.log`: `An error occurred in next/font` … `Cannot read properties of null (reading '1')` after `Retrying 1/3...` | The build could not download a Google font (the host's route to Google Fonts is flaky). Fixed by self-hosting Inter and Playfair Display with `next/font/local` (`src/fonts/`), so the build no longer needs the network for fonts | If it reappears, check nothing re-introduced `next/font/google`. Google Sans is still a runtime `<link>` in the browser, not a build step |
| Login says "We couldn't send your sign-in code" (customer/staff 2FA by email) | The app could not send email; see §8.1 | Read `app.log`, then follow §8.1 |
| `app.log`: `connect ENETUNREACH 2607:…:587` | Server has an IPv6 address but no IPv6 route; nodemailer picks IPv4/IPv6 at random | `app.js` hides IPv6 from `os.networkInterfaces()` (already in the §5.5 file) |
| `app.log`: `getaddrinfo ENOTFOUND mail.<domain>` | The SMTP host has no DNS record (zone is at Cloudflare) | Use the server hostname, e.g. `server.contactapex.website`, not `mail.<domain>` |
| `app.log`: `connect ECONNREFUSED <ip>:25/465/587/2525` | Outbound SMTP is blocked for non-mail users (WHM *SMTP Restrictions* / CSF `SMTP_BLOCK`) | See §8.1 |

### 8.1 Email (SMTP) on this server

Several features depend on email, including the 2FA sign-in code, password reset and order emails. Settings are read
from **Admin → Settings → Email** (database) first, then from the `SMTP_*` environment variables.

What was found on this server (details in `app.log`, which `app.js` writes next to the app):

* `ENETUNREACH` on an IPv6 address: fixed in `app.js` (IPv6 interfaces hidden, so nodemailer only uses IPv4).
* `ENOTFOUND mail.shopweddingband.com`: there is no such DNS record. Use the server hostname.
* `ECONNREFUSED` on **every** SMTP port (25, 465, 587, 2525) to localhost, to the server's own IP and to external
  hosts (Gmail, SendGrid, Brevo, Mailgun, Mailjet), while HTTPS (443) works. This is the WHM *SMTP Restrictions*
  firewall (or CSF `SMTP_BLOCK` with extra ports). No SMTP setting in the app can get around it.

Fixes, in order of preference:

1. **Allow SMTP for the app user (root).** WHM → *Security Center* → *SMTP Restrictions* → disable, or in CSF set
   `SMTP_BLOCK = 0` (or `SMTP_ALLOWUSER = <cpanel user>`) and restart csf+lfd. Then in Settings → Email use Gmail
   (`smtp.gmail.com`, 587, an App Password) or the server's own mail (host `server.contactapex.website`, port 465,
   a cPanel mailbox such as `noreply@<domain>`, its full address as username). Do **not** use the cPanel account
   password as an SMTP password.
2. **Send over HTTPS instead of SMTP.** Port 443 is open, so an email API (Resend, Brevo, SendGrid, Mailgun) works.
   This needs a code change in `src/lib/email.js` (replace the nodemailer transport), a rebuild and a deploy.
3. Keep the firewall as is and accept that email-based sign-in codes cannot be delivered. Not workable while 2FA
   by email is enabled.

To re-test reachability from the app, temporarily add a small block to `app.js` that opens `net.connect()` to each
host:port and `console.log`s the result (`ECONNREFUSED`, `TIMEOUT` or `OPEN`), restart (§9), and read the output
in `app.log`. The server's `app.js` currently still contains such a block, guarded by a `smtp-diag.txt` flag file;
it is inert while that file does not exist.

---

## 9. Updating the site later

**Code-only change**

1. *Git Version Control* → *Manage* → *Pull or Deploy* → **Update from Remote**.
2. File Manager → move the `.next` folder to Trash.
3. Create (or touch) `public_html/tmp/restart.txt` so Passenger restarts the app.
4. Open the site in a browser. `app.js` rebuilds (2–4 min, "being built" page), then the new version serves.

**`package.json` / lockfile changed**: click **Ensure dependencies** first, then do steps 2–4.

**Environment variable changed**: edit it in Application Manager → *Edit* → *Deploy*, then create/touch
`tmp/restart.txt`. No rebuild is needed, except for `NEXT_PUBLIC_*` variables (rebuild).

**Database changes**: schema SQL is in `docs/`; run migrations with the npm `db:migrate:*` scripts from a machine
that has `DATABASE_URL` (they are not run by the deploy).

**Rollback**: keep a copy of the working `.next` (File Manager → *Compress* → `.next-backup.zip` placed outside the
web root) before each rebuild. To roll back, Trash the bad `.next`, extract the backup, restart.

---

## 10. Files created on the server (not in Git)

| Path | Purpose |
| --- | --- |
| `public_html/app.js` | Passenger entry point and first-run builder |
| `public_html/.npmrc` | `save=false` |
| `public_html/.htaccess` (appended) | `PassengerNodejs` and the deny rules |
| `public_html/build.log` | Build output (grows; safe to delete) |
| `public_html/app.log` | Runtime console output (email errors etc.; grows; safe to delete) |
| `public_html/.env.production.local` | Only if reCAPTCHA is used (§5.8) |
| `public_html/tmp/restart.txt` | Touched to restart the app |
| `~/.smb-database-url` | The `DATABASE_URL`, mode `600`, read by `app.js` (§11.4) |
| `~/opt/mm`, `~/opt/pg` | micromamba and the PostgreSQL install (§11.1) |
| `~/pgdata`, `~/pgsock` | PostgreSQL data directory and socket directory (§11.2) |
| `~/bin/pg-keepalive.sh` + a `* * * * *` crontab entry | Starts PostgreSQL if it is not running (§11.5) |

`git status` on the server will list these as untracked, which does not block "Update from Remote".

---

## 11. PostgreSQL on this server (user-level)

This cPanel account has no PostgreSQL feature (no "PostgreSQL Databases" in cPanel, no root, and the shell is a
jailed shell, so there is no systemd). PostgreSQL therefore runs as the cPanel user, installed under the home
directory. Nothing here needs root.

**Constraints that shaped the setup**

* The terminal is a jailed shell. **Processes started from a terminal session die when the session closes**, even
  with `setsid nohup`. Only a cron job keeps the database up (§11.5).
* The server **cannot reach an external database on port 5432** (outbound firewall), so `pg_dump` against a remote
  database does not work from here. Export from a machine that can (the app's `src/lib/databaseBackup.js` writes a restorable SQL file; see §11.6).
* `pg` cannot run in the Edge runtime, so `src/middleware.js` is `runtime: "nodejs"` (Next 15.5). Without it every
  request fails with `TypeError: f.deprecate is not a function`.
* Application Manager's edit form fails for this app with `Invalid configuration for the parameter "python"`
  (a cPanel bug). Environment edits there are unreliable, hence `~/.smb-database-url` (§11.4).

### 11.1 Install (micromamba, no root)

```bash
mkdir -p ~/opt/mm && cd ~/opt/mm && curl -sL https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xj bin/micromamba
~/opt/mm/bin/micromamba create -y -r ~/opt/mm/root -p ~/opt/pg -c conda-forge postgresql
~/opt/pg/bin/postgres --version
```

### 11.2 Create the cluster and start it

`initdb` takes the password from a file. Type it at a hidden prompt or put it in a `600` file; never on the command
line. Use **letters and digits only**: symbols (`@ # ! % ( ;`) break the connection URL unless URL-encoded.

```bash
~/opt/pg/bin/initdb -D ~/pgdata -U smb_admin --pwfile=<file> --auth=scram-sha-256 -E UTF8
mkdir -p ~/pgsock
~/opt/pg/bin/pg_ctl -D ~/pgdata -l ~/pgdata/server.log -o "-p 5433 -k $HOME/pgsock -c listen_addresses=127.0.0.1" start
```

Then, as `smb_admin` over the socket:

```bash
~/opt/pg/bin/psql -h $HOME/pgsock -p 5433 -U smb_admin -d postgres \
  -c "CREATE ROLE smb_app LOGIN;" -c "CREATE DATABASE smb OWNER smb_app ENCODING 'UTF8';"
```

Set both passwords **inside psql** with `\password smb_app` and `\password smb_admin` (hidden prompt, twice). Typing
the password as a normal line sends it to the server as SQL and shows it on screen.

### 11.3 Local socket trust

`~/pgdata/pg_hba.conf` has `local all all trust`, so the account's own processes can use `psql -h $HOME/pgsock`
without a password (the socket directory is only reachable by this cPanel user). TCP on `127.0.0.1` still requires
the password (`scram-sha-256`). After editing `pg_hba.conf`, reload with `pg_ctl -D ~/pgdata reload` from the same
session that started the server, or restart it.

### 11.4 How the app gets `DATABASE_URL`

`app.js` (§5.5) reads `/home/<user>/.smb-database-url` (one line, mode `600`, outside `public_html`) and sets
`process.env.DATABASE_URL` before Next.js starts. It overrides the Application Manager value, which can stay as is.

```bash
read -rs DBURL            # then paste postgresql://smb_app:<password>@127.0.0.1:5433/smb and press Enter
printf '%s\n' "$DBURL" > ~/.smb-database-url && chmod 600 ~/.smb-database-url && unset DBURL
~/opt/pg/bin/psql "$(cat ~/.smb-database-url)" -c "select current_user, current_database();"   # smb_app | smb
touch ~/public_html/tmp/restart.txt
```

Do not type the URL as a command. `read -rs` waits silently for the paste.

### 11.5 Keep it running (cron)

`~/bin/pg-keepalive.sh` (mode `700`), run every minute from the account's crontab (`* * * * * $HOME/bin/pg-keepalive.sh`):

```bash
#!/bin/bash
PG=$HOME/opt/pg/bin
if ! $PG/pg_isready -q -h $HOME/pgsock -p 5433; then
  setsid nohup $PG/postgres -D $HOME/pgdata -p 5433 -k $HOME/pgsock -c listen_addresses=127.0.0.1 >> $HOME/pgdata/server.log 2>&1 < /dev/null &
fi
```

If the server is killed it is back within about a minute, after crash recovery (visible in `~/pgdata/server.log`).
`pg_isready` without `-U` logs a harmless `role "<cpanel user>" does not exist` line each run.

### 11.6 Moving data in from another database

1. On a machine that can reach the old database, run `generateDatabaseBackup()` from `src/lib/databaseBackup.js`
   to a `.sql` file (it skips the one-time reset/OTP token tables).
2. Upload the file to the **home directory** (never `public_html`), then
   `(echo "SET ROLE smb_app;"; cat ~/file.sql) | psql -h $HOME/pgsock -p 5433 -U smb_admin -d smb -v ON_ERROR_STOP=1 -q`
   into an empty `smb` database (`CREATE EXTENSION pgcrypto` first, as `smb_admin`).
3. Compare table and row counts with the source, then delete the file from the server and from your computer.

Migrated on 2026-10-21: 55 tables, 46,741 rows (172 products, 32 customers, 82 orders), counts identical to the source.

### 11.7 Deploy traps seen during this migration

* **Never run `npm install --omit=dev` before a build.** `next build` needs `tailwindcss`, `postcss` and
  `autoprefixer` (dev dependencies). Use a plain `npm install` or **Ensure dependencies**.
* If "Update from Remote" says it **could not contact the remote repository**, or `git pull` aborts because
  `package-lock.json` changed on the server, run
  `git stash push -m "server package-lock" package-lock.json && git pull --ff-only origin main` in `public_html`.
* The app log shows `{}` for errors from Next's isolated contexts; `app.js` now uses `util.inspect`, so real
  messages appear in `app.log`.

### 11.8 Still to do / operate

* **Backups**: nothing backs up this database yet. Add a nightly `pg_dump` (custom format) to a folder outside
  `public_html`, and copy it off the server.
* PostgreSQL upgrades are manual (`micromamba update -p ~/opt/pg postgresql`, then check release notes).
