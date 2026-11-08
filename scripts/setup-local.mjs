import { spawnSync } from "node:child_process";
import { mkdirSync, openSync, closeSync, chmodSync } from "node:fs";
mkdirSync(".local", { recursive: true, mode: 0o700 });
function run(command, args, logFile) {
  const fd = logFile ? openSync(logFile, "w", 0o600) : null;
  const result = spawnSync(command, args, {
    stdio: fd === null ? "inherit" : ["ignore", fd, fd],
  });
  if (fd !== null) closeSync(fd);
  if (result.status !== 0)
    throw new Error(
      `${command} failed${logFile ? `; inspect ${logFile} locally (it may contain credentials)` : ""}.`,
    );
}
console.log(
  "Starting dedicated local PostgreSQL (requires PostgreSQL 17 tools on PATH).",
);
run("node", ["scripts/local-postgres.mjs", "start"]);
run("node", ["--env-file=.env.local", "scripts/migrate.mjs"]);
run("node", ["--env-file=.env.local", "scripts/seed.mjs"]);
console.log(
  "Starting local Supabase Auth (requires a running Docker-compatible engine; first run downloads images).",
);
const network = "resort-assessment-loopback";
if (
  spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    stdio: "ignore",
  }).status !== 0
) {
  throw new Error(
    "Start your Docker-compatible engine first (for the existing Colima installation: colima start), then rerun npm run setup:local.",
  );
}
const inspect = spawnSync(
  "docker",
  [
    "network",
    "inspect",
    network,
    "--format",
    '{{index .Options "com.docker.network.bridge.host_binding_ipv4"}}',
  ],
  { encoding: "utf8" },
);
if (inspect.status !== 0)
  run("docker", [
    "network",
    "create",
    "-o",
    "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
    network,
  ]);
else if (inspect.stdout.trim() !== "127.0.0.1")
  throw new Error("Assessment Docker network must bind only to 127.0.0.1.");
run(
  "npx",
  ["--no-install", "supabase", "start", "--network-id", network],
  ".local/supabase-start.log",
);
// CLI diagnostics go to stderr; keep stdout JSON separate.
const statusFd = openSync(".local/supabase-status.json", "w", 0o600);
const status = spawnSync(
  "npx",
  ["--no-install", "supabase", "status", "--output", "json"],
  { stdio: ["ignore", statusFd, "ignore"] },
);
closeSync(statusFd);
chmodSync(".local/supabase-status.json", 0o600);
if (status.status !== 0) throw new Error("Local Supabase status unavailable.");
run("node", ["scripts/setup-auth.mjs"]);
run("node", ["scripts/seed-enquiries.mjs"]);
console.log(
  "Local setup complete. Run npm run dev, then open http://127.0.0.1:3000.",
);
