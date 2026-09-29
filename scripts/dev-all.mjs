// Starts the Next.js dev server and the notifications WebSocket server
// together, so one terminal (and one Ctrl+C) runs everything.
//
//   npm run dev:all

import { spawn } from "child_process";

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

const children = [
  { name: "next", args: ["run", "dev"] },
  { name: "ws  ", args: ["run", "ws:notifications"] },
].map(({ name, args }) => {
  const child = spawn(npm, args, { stdio: ["inherit", "pipe", "pipe"], shell: isWindows });
  const prefix = (stream, target) =>
    stream.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) target.write(`[${name}] ${line}\n`);
    });
  prefix(child.stdout, process.stdout);
  prefix(child.stderr, process.stderr);
  child.on("exit", (code) => {
    console.log(`[${name}] exited (${code}). Stopping the other process.`);
    shutdown();
  });
  return child;
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (isWindows) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGINT");
  }
  setTimeout(() => process.exit(0), 1500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
