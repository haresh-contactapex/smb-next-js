# Connecting your computer to the live database (SSH tunnel)

PostgreSQL runs on the cPanel server as a user-level process, listening only on `127.0.0.1:5433` on that
server (see `cpanel-passenger-deployment.md` §11). Nothing outside the server can reach it directly.
To run the app on your own computer against it, open an **SSH tunnel**: a secure connection that makes the
server's port 5433 appear as port 5433 on your PC.

> **There is only one database.** A local `npm run dev` that uses this tunnel reads and writes the **live**
> data (products, orders, customers). Be careful when saving or deleting while testing locally. Placing a
> checkout order also sends real emails.

## What you need (one-time setup, already done on the main PC)

| Item | Value |
| --- | --- |
| cPanel account | `shopweddingband1` |
| Server IP | `<server-ip>`: cPanel home page, "Shared IP Address". Not written here on purpose, the repository is public. |
| SSH key (private, stays on your PC) | `C:\Users\<you>\.ssh\smb_cpanel` |
| SSH key (public) | imported and **authorized** in cPanel: Security → SSH Access → Manage SSH Keys |
| `.env.local` | `DATABASE_URL=postgresql://smb_app:<password>@127.0.0.1:5433/smb` |

Use the **IP address**, not `shopweddingband.com`: the domain does not answer on SSH port 22.
The server accepts **keys only** (no passwords), so the key must be authorized in cPanel.

### Setting it up on a new computer

1. Create a key. Press Enter at the prompts (a passphrase is optional):

   ```powershell
   ssh-keygen -t ed25519 -f $HOME\.ssh\smb_cpanel
   ```

2. Print the public key and copy the whole line (it starts with `ssh-ed25519`):

   ```powershell
   Get-Content $HOME\.ssh\smb_cpanel.pub
   ```

3. In cPanel: **Security → SSH Access → Manage SSH Keys → Import Key.** Name it, paste the line into
   **Public Key**, leave the private key box empty, click **Import**.
4. On the same page click **Manage** next to the key, then **Authorize**. The list must say *authorized*.
5. Put the real database password in `DATABASE_URL` in `.env.local`. The password must be letters and digits
   only (see the deployment guide §3). Never commit `.env.local`.

Never paste the private key (`smb_cpanel`, the file without `.pub`) into cPanel, a chat or a repository.

## Every time you work locally

1. **Open the project in VS Code.**
2. **Open a new terminal** (the `+` button in the terminal panel) and start the tunnel:

   ```powershell
   ssh -i $HOME\.ssh\smb_cpanel -L 5433:127.0.0.1:5433 shopweddingband1@<server-ip>
   ```

   Success is a quiet shell prompt on the server (`[shopweddingband1@server ~]$`) and no error.
   **Leave this terminal open for the whole session.** Closing it closes the tunnel.
3. **Open a second terminal** and check the tunnel:

   ```powershell
   Test-NetConnection 127.0.0.1 -Port 5433
   ```

   `TcpTestSucceeded : True` means it is up. If it says `False`, repeat step 2.
4. **Start the app in that second terminal** (start it *after* the tunnel; if it was already running,
   restart it so it reconnects):

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:3000/admin/login` and sign in.

## When you finish

1. In the app terminal press **Ctrl+C**.
2. In the `ssh` terminal press **Ctrl+C**, type `exit`, press Enter (or use the trash icon on that terminal tab).

Closing the tunnel does not affect the live website. The live site talks to its database from inside the
server and does not use your tunnel.

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| `Permission denied (publickey,gssapi-keyex,gssapi-with-mic)` | The key is not authorized. In cPanel → Manage SSH Keys the key must say **authorized** (importing is not enough: click Manage → Authorize). Also check the file `$HOME\.ssh\smb_cpanel` exists and that you passed `-i`. |
| `ssh: connect to host ... port 22: Connection timed out` | You used the domain. Use the server IP. |
| `bind: Address already in use` / port 5433 busy | An old tunnel is still open. Close the old `ssh` terminal tab and run the command again. |
| App error `connect ECONNREFUSED 127.0.0.1:5433` | The tunnel is not running (or was closed). Start it, then restart `npm run dev`. |
| Tunnel is up (`True`) but the app still cannot connect | PostgreSQL on the server may be stopped. In cPanel → Terminal run `~/opt/pg/bin/pg_isready -h ~/pgsock -p 5433`. If it reports "no response", start it with the command in `cpanel-passenger-deployment.md` §11.2 (the cron job in §11.5 normally keeps it running). |
| Login page says the password is wrong (and the error is not `ECONNREFUSED`) | The database is reachable, so check the **admin account's** password. If the log says `password authentication failed for user "smb_app"`, the password in `.env.local` is wrong. |
| `.env.local` changes have no effect | The dev server reads it only at start. Stop and start `npm run dev`. |

## Related

- `cpanel-passenger-deployment.md`: deploying to the live server and running PostgreSQL there (§11).
- `README`/`CLAUDE.md`: `DATABASE_URL` and `JWT_SECRET` belong in `.env.local`; use `.env.example` as the template.
